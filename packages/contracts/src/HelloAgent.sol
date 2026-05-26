// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, ResponseStatus, Response, Request} from "./interfaces/IAgentRequester.sol";
import {IJsonApiAgent, AgentIds, AgentPricing} from "./interfaces/IAgents.sol";

/// @title HelloAgent
/// @notice Minimal smoke-test contract that calls JSON API fetchUint and stores
///         the result. Used to validate the full Somnia pipeline cheaply before
///         touching the more expensive LLM agents.
contract HelloAgent {
    IAgentRequester public immutable platform;
    uint256 public latestValue;
    mapping(uint256 => bool) public pendingRequests;

    event ValueRequested(uint256 indexed requestId);
    event ValueReceived(uint256 indexed requestId, uint256 value);

    constructor(address _platform) {
        platform = IAgentRequester(_platform);
    }

    /// @notice Fetch a uint256 from a public JSON API.
    function fetchValue(
        string calldata url,
        string calldata selector,
        uint8 decimals
    ) external payable returns (uint256 requestId) {
        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchUint.selector,
            url,
            selector,
            decimals
        );

        uint256 reserve = platform.getRequestDeposit();
        uint256 reward = AgentPricing.JSON_FETCH_COST_PER_AGENT * AgentPricing.DEFAULT_SUBCOMMITTEE_SIZE;
        uint256 deposit = reserve + reward;

        requestId = platform.createRequest{value: deposit}(
            AgentIds.JSON_API_REQUEST_ID,
            address(this),
            this.handleResponse.selector,
            payload
        );
        pendingRequests[requestId] = true;
        emit ValueRequested(requestId);
    }

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* details */
    ) external {
        require(msg.sender == address(platform), "only platform");
        require(pendingRequests[requestId], "unknown request");
        delete pendingRequests[requestId];

        if (status == ResponseStatus.Success && responses.length > 0) {
            latestValue = abi.decode(responses[0].result, (uint256));
            emit ValueReceived(requestId, latestValue);
        }
    }

    receive() external payable {}
}
