// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVeritas, VerdictMode} from "../interfaces/IVeritas.sol";
import {Verdict} from "../types/VeritasTypes.sol";

/// @title DisputeArbiter
/// @notice AI-judged DAO dispute resolution. Claimant raises a dispute with a
///         bounty. Respondent submits counter-evidence. Veritas resolves who wins.
contract DisputeArbiter {
    IVeritas public immutable veritas;

    uint256 public constant MAX_EVIDENCE_WINDOW = 7 days;

    struct Dispute {
        string question;
        address claimant;
        address respondent;
        string[] claimantEvidenceUrls;
        string[] respondentEvidenceUrls;
        uint256 bounty;
        uint256 verdictId;
        bool resolved;
        address winner;
        uint256 createdAt;
        uint256 evidenceDeadline;
    }

    uint256 public nextDisputeId;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event DisputeRaised(uint256 indexed disputeId, address indexed claimant, address indexed respondent, string question);
    event EvidenceSubmitted(uint256 indexed disputeId, address indexed respondent);
    event DisputeResolved(uint256 indexed disputeId, address winner);
    event BountyClaimed(uint256 indexed disputeId, address indexed winner, uint256 amount);

    error NotRespondent();
    error EvidenceWindowClosed();
    error AlreadyResolved();
    error NotWinner();
    error NoBounty();
    error AlreadyClaimed();
    error DisputeNotResolved();
    error InvalidEvidenceWindow();

    constructor(address _veritas) {
        veritas = IVeritas(_veritas);
    }

    /// @notice Raise a dispute. msg.value is the bounty for the winner.
    function raiseDispute(
        address respondent,
        string calldata question,
        string[] calldata claimantEvidenceUrls,
        uint256 evidenceWindow
    ) external payable returns (uint256 disputeId) {
        if (evidenceWindow == 0 || evidenceWindow > MAX_EVIDENCE_WINDOW) {
            revert InvalidEvidenceWindow();
        }

        disputeId = nextDisputeId++;
        Dispute storage d = disputes[disputeId];
        d.question = question;
        d.claimant = msg.sender;
        d.respondent = respondent;
        d.bounty = msg.value;
        d.verdictId = 0;
        d.resolved = false;
        d.winner = address(0);
        d.createdAt = block.timestamp;
        d.evidenceDeadline = block.timestamp + evidenceWindow;

        for (uint256 i = 0; i < claimantEvidenceUrls.length; i++) {
            d.claimantEvidenceUrls.push(claimantEvidenceUrls[i]);
        }

        emit DisputeRaised(disputeId, msg.sender, respondent, question);
    }

    /// @notice Respondent submits counter-evidence within the evidence window.
    function submitEvidence(uint256 disputeId, string[] calldata evidenceUrls) external {
        Dispute storage d = disputes[disputeId];
        if (msg.sender != d.respondent) revert NotRespondent();
        if (block.timestamp > d.evidenceDeadline) revert EvidenceWindowClosed();
        if (d.resolved) revert AlreadyResolved();

        // Clear existing and push new evidence
        delete d.respondentEvidenceUrls;
        for (uint256 i = 0; i < evidenceUrls.length; i++) {
            d.respondentEvidenceUrls.push(evidenceUrls[i]);
        }
        emit EvidenceSubmitted(disputeId, msg.sender);
    }

    /// @notice Trigger resolution. msg.value pays the Veritas verdict fee.
    function resolveDispute(uint256 disputeId) external payable {
        Dispute storage d = disputes[disputeId];
        if (d.resolved) revert AlreadyResolved();

        string memory combinedQuestion = string.concat(
            "Dispute: ", d.question,
            "\nClaimant evidence: ",
            d.claimantEvidenceUrls.length > 0 ? d.claimantEvidenceUrls[0] : "none",
            "\nRespondent evidence: ",
            d.respondentEvidenceUrls.length > 0 ? d.respondentEvidenceUrls[0] : "none",
            "\nIs the claimant correct? YES if claimant is right, NO if respondent is right."
        );

        string[] memory evidenceUrls = new string[](1);
        evidenceUrls[0] = d.claimantEvidenceUrls.length > 0
            ? d.claimantEvidenceUrls[0]
            : "";

        bytes memory payoutCalldata = abi.encodeWithSelector(
            DisputeArbiter.resolveCallback.selector,
            disputeId
        );

        uint256 verdictId = veritas.requestVerdict{value: msg.value}(
            combinedQuestion,
            evidenceUrls,
            VerdictMode.Simple,
            address(this),
            payoutCalldata
        );

        d.verdictId = verdictId;
    }

    /// @notice Called by Veritas as the payout callback.
    function resolveCallback(uint256 disputeId) external {
        Dispute storage d = disputes[disputeId];
        if (d.resolved) revert AlreadyResolved();

        Verdict memory v = veritas.getVerdict(d.verdictId);
        d.resolved = true;

        // YES = claimant wins, NO = respondent wins
        if (v.result) {
            d.winner = d.claimant;
        } else {
            d.winner = d.respondent;
        }

        emit DisputeResolved(disputeId, d.winner);
    }

    /// @notice Winner claims the bounty.
    function claimBounty(uint256 disputeId) external {
        Dispute storage d = disputes[disputeId];
        if (!d.resolved) revert DisputeNotResolved();
        if (msg.sender != d.winner) revert NotWinner();
        if (d.bounty == 0) revert NoBounty();
        if (hasClaimed[disputeId][msg.sender]) revert AlreadyClaimed();

        hasClaimed[disputeId][msg.sender] = true;
        uint256 amount = d.bounty;
        d.bounty = 0;

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");

        emit BountyClaimed(disputeId, msg.sender, amount);
    }

    /// @notice Get dispute details.
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    receive() external payable {}
}
