// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVeritas, VerdictMode} from "../interfaces/IVeritas.sol";
import {Verdict} from "../types/VeritasTypes.sol";

/// @title InsuranceVault
/// @notice Parametric insurance that auto-pays based on AI verdicts from Veritas.
contract InsuranceVault {
    IVeritas public immutable veritas;

    struct Policy {
        string question;
        string[] evidenceUrls;
        uint256 premium;
        uint256 payoutAmount;
        uint256 maxParticipants;
        uint256 participantCount;
        uint256 verdictId;
        bool resolved;
        bool outcome;
        uint256 createdAt;
        address creator;
        uint256 resolveAfter;
    }

    uint256 public nextPolicyId;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => address[]) internal participantList;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event PolicyCreated(uint256 indexed policyId, string question, uint256 premium, uint256 payoutAmount, uint256 resolveAfter);
    event PolicyJoined(uint256 indexed policyId, address indexed participant);
    event ResolutionTriggered(uint256 indexed policyId, uint256 verdictId);
    event PolicyResolved(uint256 indexed policyId, bool outcome);
    event PayoutClaimed(uint256 indexed policyId, address indexed participant, uint256 amount);

    error PolicyFull();
    error AlreadyJoined();
    error PolicyAlreadyResolved();
    error NotResolved();
    error NoPayout();
    error AlreadyClaimed();
    error NotParticipant();
    error InsufficientPremium();
    error JoinWindowClosed();
    error JoinWindowOpen();
    error AlreadyTriggered();

    constructor(address _veritas) {
        veritas = IVeritas(_veritas);
    }

    /// @notice Open a policy with a join window. Free: the Veritas verdict is not
    ///         requested here, it is fired by triggerResolution after the deadline.
    function createPolicy(
        string calldata question,
        string[] calldata evidenceUrls,
        uint256 premium,
        uint256 payoutAmount,
        uint256 maxParticipants,
        uint256 joinDuration
    ) external returns (uint256 policyId) {
        policyId = nextPolicyId++;

        Policy storage p = policies[policyId];
        p.question = question;
        for (uint256 i = 0; i < evidenceUrls.length; i++) {
            p.evidenceUrls.push(evidenceUrls[i]);
        }
        p.premium = premium;
        p.payoutAmount = payoutAmount;
        p.maxParticipants = maxParticipants;
        p.createdAt = block.timestamp;
        p.creator = msg.sender;
        p.resolveAfter = block.timestamp + joinDuration;

        emit PolicyCreated(policyId, question, premium, payoutAmount, p.resolveAfter);
    }

    /// @notice After the join window closes, anyone can fire the AI verdict by
    ///         paying the Veritas fee. Veritas calls resolvePolicy on resolution.
    function triggerResolution(uint256 policyId) external payable {
        Policy storage p = policies[policyId];
        if (block.timestamp < p.resolveAfter) revert JoinWindowOpen();
        if (p.verdictId != 0) revert AlreadyTriggered();
        if (p.resolved) revert PolicyAlreadyResolved();

        bytes memory payoutCalldata = abi.encodeWithSelector(
            InsuranceVault.resolvePolicy.selector,
            policyId
        );

        uint256 verdictId = veritas.requestVerdict{value: msg.value}(
            p.question,
            p.evidenceUrls,
            VerdictMode.Simple,
            address(this),
            payoutCalldata
        );

        p.verdictId = verdictId;
        emit ResolutionTriggered(policyId, verdictId);
    }

    /// @notice Buy into a policy by paying the premium. Only while join is open.
    function joinPolicy(uint256 policyId) external payable {
        Policy storage p = policies[policyId];
        if (block.timestamp >= p.resolveAfter) revert JoinWindowClosed();
        if (p.resolved) revert PolicyAlreadyResolved();
        if (p.participantCount >= p.maxParticipants) revert PolicyFull();
        if (isParticipant[policyId][msg.sender]) revert AlreadyJoined();
        if (msg.value < p.premium) revert InsufficientPremium();

        isParticipant[policyId][msg.sender] = true;
        participantList[policyId].push(msg.sender);
        p.participantCount++;

        if (msg.value > p.premium) {
            (bool ok,) = msg.sender.call{value: msg.value - p.premium}("");
            require(ok, "refund failed");
        }

        emit PolicyJoined(policyId, msg.sender);
    }

    /// @notice Called by Veritas as the payout callback. Sets the outcome.
    function resolvePolicy(uint256 policyId) external {
        Policy storage p = policies[policyId];
        if (p.resolved) revert AlreadyClaimed();

        Verdict memory v = veritas.getVerdict(p.verdictId);
        p.resolved = true;
        p.outcome = v.result;

        emit PolicyResolved(policyId, v.result);
    }

    /// @notice Claim payout after resolution (only if outcome is YES).
    function claimPayout(uint256 policyId) external {
        Policy storage p = policies[policyId];
        if (!p.resolved) revert NotResolved();
        if (!p.outcome) revert NoPayout();
        if (!isParticipant[policyId][msg.sender]) revert NotParticipant();
        if (hasClaimed[policyId][msg.sender]) revert AlreadyClaimed();

        hasClaimed[policyId][msg.sender] = true;
        (bool ok,) = msg.sender.call{value: p.payoutAmount}("");
        require(ok, "transfer failed");

        emit PayoutClaimed(policyId, msg.sender, p.payoutAmount);
    }

    /// @notice Get policy details.
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /// @notice Get participants of a policy.
    function getParticipants(uint256 policyId) external view returns (address[] memory) {
        return participantList[policyId];
    }

    receive() external payable {}
}
