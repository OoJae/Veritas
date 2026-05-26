// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, ResponseStatus, Response, Request} from "./interfaces/IAgentRequester.sol";
import {ILLMParseWebsite, AgentIds, AgentPricing} from "./interfaces/IAgents.sol";
import {IVeritas} from "./interfaces/IVeritas.sol";
import {VerdictMode, Stage, Verdict} from "./types/VeritasTypes.sol";

/// @title Veritas
/// @notice A trustless AI verdict primitive for the Somnia Agentic L1.
///         Takes a natural-language question plus evidence URLs, returns a
///         binding consensus-verified verdict with an auditable receipt.
contract Veritas is IVeritas {
    IAgentRequester public immutable platform;

    uint256 public nextVerdictId;
    uint256 public constant MAX_EVIDENCE_URLS = 3;
    uint256 public constant DEFAULT_DEADLINE_BUFFER = 15 minutes;

    mapping(uint256 => Verdict) public verdicts;
    mapping(uint256 => uint256) public requestToVerdict;

    error OnlyPlatform();
    error UnknownRequest(uint256 requestId);
    error VerdictNotPending(uint256 verdictId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error TooManyEvidenceUrls(uint256 count);
    error DeadlineNotPassed();
    error CallbackFailed();

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
        }
    }

    receive() external payable {}

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

        uint256 reserve = platform.getRequestDeposit();
        uint256 reward = AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
        uint256 deposit = reserve + reward;

        uint256 requestId = platform.createRequest{value: deposit}(
            AgentIds.LLM_PARSE_WEBSITE_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );

        v.lastRequestId = requestId;
        requestToVerdict[requestId] = verdictId;
    }

    function _handleSimpleResponse(
        uint256 verdictId,
        Response[] memory responses
    ) internal {
        string memory answer = abi.decode(responses[0].result, (string));
        bool result = _parseYesNo(answer);
        uint256 receiptPtr = responses[0].receipt;

        _resolve(verdictId, result, 80, receiptPtr);
    }

    // ----- Internal: Deliberated mode stub -----

    function _fireFirstEvidence(uint256 verdictId) internal {
        // Deliberated mode: fire first evidence extraction.
        // Full implementation in Sprint 2.
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

        uint256 reserve = platform.getRequestDeposit();
        uint256 reward = AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
        uint256 deposit = reserve + reward;

        uint256 requestId = platform.createRequest{value: deposit}(
            AgentIds.LLM_PARSE_WEBSITE_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );

        v.lastRequestId = requestId;
        requestToVerdict[requestId] = verdictId;
    }

    function _handleDeliberatedResponse(
        uint256 verdictId,
        Response[] memory responses
    ) internal {
        Verdict storage v = verdicts[verdictId];

        if (v.stage == Stage.FetchingEvidence) {
            string memory evidence = abi.decode(responses[0].result, (string));
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
            string memory answer = abi.decode(responses[0].result, (string));
            bool result = _parseYesNo(answer);
            _resolve(verdictId, result, 85, responses[0].receipt);
        }
    }

    function _fireInference(uint256 verdictId) internal {
        // Will be fully implemented with ILLMInference in Sprint 2.
        // For now, this is a placeholder that the Deliberated path can use.
        revert("deliberated mode not yet implemented");
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

        if (v.payoutTarget != address(0) && v.payoutCalldata.length > 0) {
            (bool success,) = v.payoutTarget.call(v.payoutCalldata);
            if (!success) {
                revert CallbackFailed();
            }
        }
    }

    // ----- Internal: helpers -----

    function _quoteVerdict(
        VerdictMode mode,
        uint256 numEvidenceUrls
    ) internal pure returns (uint256) {
        uint256 reserve = 0.01 ether * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;

        if (mode == VerdictMode.Simple) {
            uint256 reward = AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
            return reserve + reward;
        } else {
            uint256 evidenceReward = numEvidenceUrls * AgentPricing.LLM_PARSE_WEBSITE_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
            uint256 inferenceReward = AgentPricing.LLM_INFERENCE_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
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
