// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, ConsensusType, ResponseStatus, Response, Request} from "./interfaces/IAgentRequester.sol";
import {ILLMParseWebsite, ILLMInference, AgentIds, AgentPricing} from "./interfaces/IAgents.sol";
import {IVeritas} from "./interfaces/IVeritas.sol";
import {VerdictMode, Stage, Verdict} from "./types/VeritasTypes.sol";
import {SomniaEventHandler} from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";

/// @title Veritas
/// @notice A trustless AI verdict primitive for the Somnia Agentic L1.
///         Takes a natural-language question plus evidence URLs, returns a
///         binding consensus-verified verdict with an auditable receipt.
///         Uses Somnia Reactivity to auto-poke verdicts when deadlines expire.
contract Veritas is IVeritas, SomniaEventHandler {
    IAgentRequester public immutable platform;

    uint256 public nextVerdictId = 1;
    uint256 public constant MAX_EVIDENCE_URLS = 3;
    uint256 public constant DEFAULT_DEADLINE_BUFFER = 15 minutes;

    // Consensus: a 5-validator subcommittee with a 3-of-5 threshold tolerates up
    // to two bad scrapes (flaky/bot-protected sources) before a verdict fails.
    // Responses are aggregated in the callback (majority vote of the successes).
    uint256 public constant ADVANCED_SUBCOMMITTEE_SIZE = 5;
    uint256 public constant ADVANCED_THRESHOLD = 3;
    uint256 public constant ADVANCED_TIMEOUT = 300;

    mapping(uint256 => Verdict) public verdicts;
    mapping(uint256 => uint256) public requestToVerdict;
    mapping(uint256 => uint256) public verdictToSubscription; // verdictId => reactivity subscriptionId
    mapping(uint256 => uint256) public timestampToVerdictId;  // deadlineMillis => verdictId

    error OnlyPlatform();
    error UnknownRequest(uint256 requestId);
    error VerdictNotPending(uint256 verdictId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error TooManyEvidenceUrls(uint256 count);
    error DeadlineNotPassed();

    constructor(address _platform) {
        platform = IAgentRequester(_platform);
    }

    /// @inheritdoc IVeritas
    function requestVerdict(
        string calldata question,
        string[] calldata evidenceUrls,
        VerdictMode mode,
        address payoutTarget,
        bytes calldata payoutCalldata
    ) external payable returns (uint256 verdictId) {
        if (evidenceUrls.length > MAX_EVIDENCE_URLS) {
            revert TooManyEvidenceUrls(evidenceUrls.length);
        }

        uint256 required = _quoteVerdict(mode, evidenceUrls.length);
        if (msg.value < required) {
            revert InsufficientPayment(required, msg.value);
        }

        verdictId = nextVerdictId++;
        verdicts[verdictId] = Verdict({
            requester: msg.sender,
            question: question,
            evidenceUrls: evidenceUrls,
            mode: mode,
            payoutTarget: payoutTarget,
            payoutCalldata: payoutCalldata,
            stage: Stage.FetchingEvidence,
            deadline: block.timestamp + DEFAULT_DEADLINE_BUFFER,
            evidenceCursor: 0,
            gatheredEvidence: new string[](0),
            result: false,
            confidence: 0,
            reasoningRef: bytes32(0),
            lastRequestId: 0
        });

        if (mode == VerdictMode.Simple) {
            _fireSimpleVerdict(verdictId);
        } else {
            _fireFirstEvidence(verdictId);
        }

        // Schedule a Reactivity deadline trigger (best-effort, falls back to manual poke)
        _scheduleDeadline(verdictId);

        emit VerdictRequested(verdictId, msg.sender, mode, question);
    }

    /// @inheritdoc IVeritas
    function quoteVerdict(
        VerdictMode mode,
        uint256 numEvidenceUrls
    ) external pure returns (uint256) {
        return _quoteVerdict(mode, numEvidenceUrls);
    }

    /// @inheritdoc IVeritas
    function poke(uint256 verdictId) external {
        Verdict storage v = verdicts[verdictId];
        if (v.stage != Stage.FetchingEvidence && v.stage != Stage.Reasoning) {
            revert VerdictNotPending(verdictId);
        }
        if (block.timestamp < v.deadline) {
            revert DeadlineNotPassed();
        }

        v.stage = Stage.Failed;
        emit VerdictFailed(verdictId, "deadline exceeded, poked to failed");
        emit VerdictPoked(verdictId);
    }

    /// @inheritdoc IVeritas
    function getVerdict(uint256 verdictId) external view returns (Verdict memory) {
        return verdicts[verdictId];
    }

    /// @notice Callback from the Somnia platform. Only the platform may call this.
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        if (msg.sender != address(platform)) revert OnlyPlatform();

        uint256 verdictId = requestToVerdict[requestId];
        if (verdictId == 0 && verdicts[0].lastRequestId != requestId) {
            revert UnknownRequest(requestId);
        }

        Verdict storage v = verdicts[verdictId];

        if (status == ResponseStatus.Failed || status == ResponseStatus.TimedOut) {
            v.stage = Stage.Failed;
            emit VerdictFailed(verdictId, status == ResponseStatus.Failed ? "agent failed" : "agent timed out");
            _cancelDeadline(verdictId);
            return;
        }

        if (status == ResponseStatus.Success && responses.length > 0) {
            if (v.mode == VerdictMode.Simple) {
                _handleSimpleResponse(verdictId, responses);
            } else {
                _handleDeliberatedResponse(verdictId, responses);
            }
        } else {
            v.stage = Stage.Failed;
            emit VerdictFailed(verdictId, "empty responses on success status");
            _cancelDeadline(verdictId);
        }
    }

    /// @notice Reactivity handler. Called by the precompile when a deadline fires.
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata eventTopics,
        bytes calldata /* data */
    ) internal override {
        uint256 timestampMillis = uint256(eventTopics[1]);
        uint256 verdictId = timestampToVerdictId[timestampMillis];
        if (verdictId == 0) return;

        Verdict storage v = verdicts[verdictId];
        if (v.stage == Stage.FetchingEvidence || v.stage == Stage.Reasoning) {
            v.stage = Stage.Failed;
            emit VerdictFailed(verdictId, "deadline exceeded, auto-poked via reactivity");
            emit VerdictPoked(verdictId);
        }
        delete timestampToVerdictId[timestampMillis];
    }

    receive() external payable {}

    // ----- Internal: deadline scheduling -----

    function _scheduleDeadline(uint256 verdictId) internal {
        // Skip if Veritas doesn't hold enough balance for the minimum requirement
        if (address(this).balance < SomniaExtensions.SUBSCRIPTION_OWNER_MINIMUM_BALANCE) {
            return;
        }

        Verdict storage v = verdicts[verdictId];
        uint256 deadlineMillis = v.deadline * 1000 + verdictId; // unique per verdict
        timestampToVerdictId[deadlineMillis] = verdictId;

        SomniaExtensions.SubscriptionOptions memory opts = SomniaExtensions.SubscriptionOptions({
            priorityFeePerGas: 1,
            maxFeePerGas: 0,
            gasLimit: 100_000
        });

        uint256 subId = SomniaExtensions.scheduleSubscriptionAtTimestamp(
            address(this), deadlineMillis, opts
        );
        verdictToSubscription[verdictId] = subId;
    }

    function _cancelDeadline(uint256 verdictId) internal {
        uint256 subId = verdictToSubscription[verdictId];
        if (subId == 0) return;

        // Try to cancel. Ignore failure if subscription already fired.
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS.call(
            abi.encodeWithSelector(ISomniaReactivityPrecompile.unsubscribe.selector, subId)
        );
        // solhint-disable-next-line no-unused-vars
        success; // intentionally unused
        delete verdictToSubscription[verdictId];
    }

    // ----- Internal: Simple mode -----

    function _fireSimpleVerdict(uint256 verdictId) internal {
        Verdict storage v = verdicts[verdictId];

        string[] memory options = new string[](3);
        options[0] = "YES";
        options[1] = "NO";
        options[2] = "UNRESOLVED";

        string memory evidenceHint = "";
        if (v.evidenceUrls.length > 0) {
            evidenceHint = string.concat(" Evidence: ", v.evidenceUrls[0]);
        }

        bytes memory payload = abi.encodeWithSelector(
            ILLMParseWebsite.ExtractString.selector,
            "verdict",
            "Yes/No verdict for the question",
            options,
            string.concat(v.question, evidenceHint),
            v.evidenceUrls.length > 0 ? v.evidenceUrls[0] : "",
            v.evidenceUrls.length > 0,
            uint8(1),
            uint8(50)
        );

        _fireAgent(verdictId, AgentIds.LLM_PARSE_WEBSITE_ID, payload, AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT);
    }

    /// @notice Fire an advanced agent request (5-of-5 subcommittee, 3 threshold,
    ///         Threshold consensus) and wire the request -> verdict mapping.
    function _fireAgent(
        uint256 verdictId,
        uint256 agentId,
        bytes memory payload,
        uint256 agentPrice
    ) internal {
        uint256 reserve = platform.getAdvancedRequestDeposit(ADVANCED_SUBCOMMITTEE_SIZE);
        uint256 reward = agentPrice * ADVANCED_SUBCOMMITTEE_SIZE;
        uint256 deposit = reserve + reward;

        uint256 requestId = platform.createAdvancedRequest{value: deposit}(
            agentId,
            address(this),
            this.handleResponse.selector,
            payload,
            ADVANCED_SUBCOMMITTEE_SIZE,
            ADVANCED_THRESHOLD,
            ConsensusType.Threshold,
            ADVANCED_TIMEOUT
        );

        verdicts[verdictId].lastRequestId = requestId;
        requestToVerdict[requestId] = verdictId;
    }

    /// @notice Majority-vote the YES/NO answers across the successful validator
    ///         responses. Returns whether any success existed, the winning side,
    ///         the agreement confidence (winner share, 0-100), and a receipt.
    function _aggregateYesNo(Response[] memory responses)
        internal
        pure
        returns (bool hasResult, bool result, uint8 confidence, uint256 receiptPtr)
    {
        uint256 yes;
        uint256 no;
        for (uint256 i = 0; i < responses.length; i++) {
            if (responses[i].status != ResponseStatus.Success) continue;
            if (responses[i].result.length == 0) continue;
            if (receiptPtr == 0) receiptPtr = responses[i].receipt;
            if (_parseYesNo(abi.decode(responses[i].result, (string)))) {
                yes++;
            } else {
                no++;
            }
        }
        uint256 total = yes + no;
        if (total == 0) return (false, false, 0, 0);
        result = yes > no;
        uint256 winner = yes > no ? yes : no;
        confidence = uint8((winner * 100) / total);
        return (true, result, confidence, receiptPtr);
    }

    function _handleSimpleResponse(
        uint256 verdictId,
        Response[] memory responses
    ) internal {
        (bool hasResult, bool result, uint8 confidence, uint256 receiptPtr) = _aggregateYesNo(responses);
        if (!hasResult) {
            verdicts[verdictId].stage = Stage.Failed;
            emit VerdictFailed(verdictId, "no successful responses");
            _cancelDeadline(verdictId);
            return;
        }
        _resolve(verdictId, result, confidence, receiptPtr);
    }

    // ----- Internal: Deliberated mode -----

    function _fireFirstEvidence(uint256 verdictId) internal {
        Verdict storage v = verdicts[verdictId];
        v.stage = Stage.FetchingEvidence;
        v.evidenceCursor = 0;
        _fireEvidenceExtraction(verdictId, 0);
    }

    function _fireEvidenceExtraction(uint256 verdictId, uint256 index) internal {
        Verdict storage v = verdicts[verdictId];

        bytes memory payload = abi.encodeWithSelector(
            ILLMParseWebsite.ExtractString.selector,
            "evidence",
            "Key fact from this source",
            new string[](0),
            string.concat("Extract the key fact relevant to: ", v.question),
            v.evidenceUrls[index],
            false,
            uint8(1),
            uint8(50)
        );

        _fireAgent(verdictId, AgentIds.LLM_PARSE_WEBSITE_ID, payload, AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT);
    }

    function _handleDeliberatedResponse(
        uint256 verdictId,
        Response[] memory responses
    ) internal {
        Verdict storage v = verdicts[verdictId];

        if (v.stage == Stage.FetchingEvidence) {
            // Take the first successful extraction for this evidence URL.
            string memory evidence = "";
            for (uint256 i = 0; i < responses.length; i++) {
                if (responses[i].status == ResponseStatus.Success && responses[i].result.length > 0) {
                    evidence = abi.decode(responses[i].result, (string));
                    break;
                }
            }
            v.gatheredEvidence.push(evidence);
            emit EvidenceGathered(verdictId, v.evidenceCursor, evidence);

            v.evidenceCursor++;
            if (v.evidenceCursor < v.evidenceUrls.length) {
                _fireEvidenceExtraction(verdictId, v.evidenceCursor);
            } else {
                v.stage = Stage.Reasoning;
                _fireInference(verdictId);
            }
        } else if (v.stage == Stage.Reasoning) {
            (bool hasResult, bool result, uint8 confidence, uint256 receiptPtr) = _aggregateYesNo(responses);
            if (!hasResult) {
                v.stage = Stage.Failed;
                emit VerdictFailed(verdictId, "no successful responses");
                _cancelDeadline(verdictId);
                return;
            }
            _resolve(verdictId, result, confidence, receiptPtr);
        }
    }

    function _fireInference(uint256 verdictId) internal {
        Verdict storage v = verdicts[verdictId];

        string memory evidenceBlock = "";
        for (uint256 i = 0; i < v.gatheredEvidence.length; i++) {
            evidenceBlock = string.concat(evidenceBlock, "\n---\n", v.gatheredEvidence[i]);
        }

        string memory prompt = string.concat(
            "Based on the following evidence, answer YES or NO.\n\n",
            "Question: ", v.question,
            evidenceBlock
        );

        string[] memory allowedValues = new string[](3);
        allowedValues[0] = "YES";
        allowedValues[1] = "NO";
        allowedValues[2] = "UNRESOLVED";

        bytes memory payload = abi.encodeWithSelector(
            ILLMInference.inferString.selector,
            prompt,
            "You are a precise fact-checker. Respond with only YES, NO, or UNRESOLVED.",
            false,
            allowedValues
        );

        _fireAgent(verdictId, AgentIds.LLM_INFERENCE_ID, payload, AgentPricing.LLM_INFERENCE_COST_PER_AGENT);
    }

    // ----- Internal: resolve and payout -----

    function _resolve(
        uint256 verdictId,
        bool result,
        uint8 confidence,
        uint256 receiptPtr
    ) internal {
        Verdict storage v = verdicts[verdictId];
        v.stage = Stage.Resolved;
        v.result = result;
        v.confidence = confidence;
        v.reasoningRef = bytes32(receiptPtr);

        emit VerdictResolved(verdictId, result, confidence, bytes32(receiptPtr));

        // Cancel the reactivity subscription since the verdict resolved
        _cancelDeadline(verdictId);

        if (v.payoutTarget != address(0) && v.payoutCalldata.length > 0) {
            (bool success,) = v.payoutTarget.call(v.payoutCalldata);
            if (!success) {
                emit CallbackFailed(verdictId, v.payoutTarget);
            }
        }
    }

    // ----- Internal: helpers -----

    function _quoteVerdict(
        VerdictMode mode,
        uint256 numEvidenceUrls
    ) internal pure returns (uint256) {
        uint256 reserve = 0.01 ether * ADVANCED_SUBCOMMITTEE_SIZE;

        if (mode == VerdictMode.Simple) {
            uint256 reward = AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * ADVANCED_SUBCOMMITTEE_SIZE;
            return reserve + reward;
        } else {
            uint256 evidenceReward = numEvidenceUrls * AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * ADVANCED_SUBCOMMITTEE_SIZE;
            uint256 inferenceReward = AgentPricing.LLM_INFERENCE_COST_PER_AGENT * ADVANCED_SUBCOMMITTEE_SIZE;
            return reserve + evidenceReward + inferenceReward;
        }
    }

    function _parseYesNo(string memory answer) internal pure returns (bool) {
        bytes memory b = bytes(answer);
        if (b.length == 0) return false;
        // Check first character for Y (YES) vs N (NO/UNRESOLVED)
        if (b[0] == 0x59) return true;  // 'Y'
        return false;
    }
}
