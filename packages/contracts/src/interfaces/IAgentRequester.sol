// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Somnia agent platform consensus type.
enum ConsensusType {
    Majority,
    Threshold
}

/// @notice Status of an agent request on the Somnia platform.
enum ResponseStatus {
    None,
    Pending,
    Success,
    Failed,
    TimedOut
}

/// @notice A single validator's response to an agent request.
struct Response {
    address validator;
    bytes result;
    ResponseStatus status;
    uint256 receipt;
    uint256 timestamp;
    uint256 executionCost;
}

/// @notice Full state of a request on the Somnia platform.
struct Request {
    uint256 id;
    address requester;
    address callbackAddress;
    bytes4 callbackSelector;
    address[] subcommittee;
    Response[] responses;
    uint256 responseCount;
    uint256 failureCount;
    uint256 threshold;
    uint256 createdAt;
    uint256 deadline;
    ResponseStatus status;
    ConsensusType consensusType;
    uint256 remainingBudget;
    uint256 perAgentBudget;
}

/// @notice Interface for the Somnia AgentRequester platform contract.
interface IAgentRequester {
    event RequestCreated(
        uint256 indexed requestId,
        uint256 indexed agentId,
        uint256 perAgentBudget,
        bytes payload,
        address[] subcommittee
    );
    event RequestFinalized(uint256 indexed requestId, ResponseStatus status);
    event SubcommitteePaid(uint256 indexed requestId, uint256 totalPaid, uint256 perMember);
    event CommitteeDepositFailed(uint256 indexed requestId, uint256 attemptedAmount);

    /// @notice Create a standard agent request with default subcommittee settings.
    /// @param agentId The numeric ID of the agent to invoke.
    /// @param callbackAddress The contract to receive the response callback.
    /// @param callbackSelector The function selector for the callback.
    /// @param payload The ABI-encoded agent method call.
    /// @return requestId The platform-assigned request ID.
    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId);

    /// @notice Create an advanced agent request with custom subcommittee settings.
    function createAdvancedRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload,
        uint256 subcommitteeSize,
        uint256 threshold,
        ConsensusType consensusType,
        uint256 timeout
    ) external payable returns (uint256 requestId);

    /// @notice Get the full state of a request.
    function getRequest(uint256 requestId) external view returns (Request memory);

    /// @notice Check whether a request exists.
    function hasRequest(uint256 requestId) external view returns (bool);

    /// @notice Get the minimum deposit (operations reserve) for a standard request.
    function getRequestDeposit() external view returns (uint256);

    /// @notice Get the minimum deposit for an advanced request with a given subcommittee size.
    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external view returns (uint256);
}
