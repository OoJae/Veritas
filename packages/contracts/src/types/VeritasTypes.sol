// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The mode determining how many agent calls a verdict requires.
enum VerdictMode {
    Simple,
    Deliberated
}

/// @notice Internal stage of a verdict request.
enum Stage {
    None,
    FetchingEvidence,
    Reasoning,
    Resolved,
    Failed
}

/// @notice Full state of a single verdict.
struct Verdict {
    address requester;
    string question;
    string[] evidenceUrls;
    VerdictMode mode;
    address payoutTarget;
    bytes payoutCalldata;
    Stage stage;
    uint256 deadline;
    uint256 evidenceCursor;
    string[] gatheredEvidence;
    bool result;
    uint8 confidence;
    bytes32 reasoningRef;
    uint256 lastRequestId;
}
