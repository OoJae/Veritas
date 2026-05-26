// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VerdictMode, Stage, Verdict} from "../types/VeritasTypes.sol";

/// @notice Consumer-facing interface for the Veritas verdict primitive.
interface IVeritas {
    event VerdictRequested(
        uint256 indexed verdictId,
        address indexed requester,
        VerdictMode mode,
        string question
    );
    event VerdictResolved(
        uint256 indexed verdictId,
        bool result,
        uint8 confidence,
        bytes32 reasoningRef
    );
    event VerdictFailed(uint256 indexed verdictId, string reason);
    event EvidenceGathered(
        uint256 indexed verdictId,
        uint256 index,
        string summary
    );

    /// @notice Request a verdict on a natural-language question.
    /// @param question The yes/no or numeric question to resolve.
    /// @param evidenceUrls URLs for the agent to scrape (capped at 3 in demo).
    /// @param mode Simple (one agent call) or Deliberated (multi-step).
    /// @param payoutTarget Contract to call on resolution.
    /// @param payoutCalldata Calldata to execute on payoutTarget.
    /// @return verdictId The internal verdict ID.
    function requestVerdict(
        string calldata question,
        string[] calldata evidenceUrls,
        VerdictMode mode,
        address payoutTarget,
        bytes calldata payoutCalldata
    ) external payable returns (uint256 verdictId);

    /// @notice Get the required msg.value for a verdict request.
    function quoteVerdict(
        VerdictMode mode,
        uint256 numEvidenceUrls
    ) external view returns (uint256);

    /// @notice Permissionless trigger to resolve a verdict after its deadline.
    function poke(uint256 verdictId) external;

    /// @notice Get the full state of a verdict.
    function getVerdict(uint256 verdictId) external view returns (Verdict memory);
}
