// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRequester, ConsensusType, ResponseStatus, Response, Request} from "../interfaces/IAgentRequester.sol";

/// @title MockAgentRequester
/// @notice Test double that simulates the Somnia platform. Lets tests trigger
///         the callback synchronously with a chosen result, status, and receipt.
contract MockAgentRequester is IAgentRequester {
    uint256 public nextRequestId = 1;
    uint256 public minPerAgentDeposit = 0.01 ether;
    uint256 public defaultSubcommitteeSize = 3;

    struct StoredRequest {
        uint256 agentId;
        address callbackAddress;
        bytes4 callbackSelector;
        bytes payload;
        uint256 deposit;
    }

    mapping(uint256 => StoredRequest) public storedRequests;
    mapping(uint256 => Request) public requestState;

    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId) {
        requestId = nextRequestId++;
        storedRequests[requestId] = StoredRequest({
            agentId: agentId,
            callbackAddress: callbackAddress,
            callbackSelector: callbackSelector,
            payload: payload,
            deposit: msg.value
        });

        emit RequestCreated(requestId, agentId, 0, payload, new address[](0));
    }

    function createAdvancedRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload,
        uint256, /* subcommitteeSize */
        uint256, /* threshold */
        ConsensusType, /* consensusType */
        uint256 /* timeout */
    ) external payable returns (uint256 requestId) {
        requestId = nextRequestId++;
        storedRequests[requestId] = StoredRequest({
            agentId: agentId,
            callbackAddress: callbackAddress,
            callbackSelector: callbackSelector,
            payload: payload,
            deposit: msg.value
        });

        emit RequestCreated(requestId, agentId, 0, payload, new address[](0));
    }

    function getRequest(uint256 requestId) external view returns (Request memory) {
        return requestState[requestId];
    }

    function hasRequest(uint256 requestId) external view returns (bool) {
        return storedRequests[requestId].deposit > 0;
    }

    function getRequestDeposit() external view returns (uint256) {
        return minPerAgentDeposit * defaultSubcommitteeSize;
    }

    function getAdvancedRequestDeposit(uint256 subcommitteeSize) external view returns (uint256) {
        return minPerAgentDeposit * subcommitteeSize;
    }

    /// @notice Simulate a successful response by calling the stored callback.
    /// @param requestId The request to respond to.
    /// @param result The ABI-encoded result bytes.
    /// @param receipt A receipt pointer (uint256).
    function simulateResponse(
        uint256 requestId,
        bytes calldata result,
        uint256 receipt
    ) external {
        StoredRequest memory sr = storedRequests[requestId];
        require(sr.callbackAddress != address(0), "request not found");

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(this),
            result: result,
            status: ResponseStatus.Success,
            receipt: receipt,
            timestamp: block.timestamp,
            executionCost: 0
        });

        Request memory req;
        req.id = requestId;
        req.requester = msg.sender;
        req.status = ResponseStatus.Success;

        (bool success,) = sr.callbackAddress.call(
            abi.encodeWithSelector(
                sr.callbackSelector,
                requestId,
                responses,
                ResponseStatus.Success,
                req
            )
        );
        require(success, "callback failed");
    }

    /// @notice Simulate an advanced multi-validator response. Each entry is either
    ///         Success (with its result bytes) or Failed (an errored scrape), so a
    ///         consumer's aggregation logic can be exercised.
    function simulateAdvancedResponse(
        uint256 requestId,
        bytes[] calldata results,
        bool[] calldata success,
        uint256 receipt
    ) external {
        StoredRequest memory sr = storedRequests[requestId];
        require(sr.callbackAddress != address(0), "request not found");
        require(results.length == success.length, "length mismatch");

        Response[] memory responses = new Response[](results.length);
        for (uint256 i = 0; i < results.length; i++) {
            responses[i] = Response({
                validator: address(uint160(i + 1)),
                result: results[i],
                status: success[i] ? ResponseStatus.Success : ResponseStatus.Failed,
                receipt: receipt,
                timestamp: block.timestamp,
                executionCost: 0
            });
        }

        Request memory req;
        req.id = requestId;
        req.requester = msg.sender;
        req.status = ResponseStatus.Success;

        (bool ok,) = sr.callbackAddress.call(
            abi.encodeWithSelector(sr.callbackSelector, requestId, responses, ResponseStatus.Success, req)
        );
        require(ok, "callback failed");
    }

    /// @notice Simulate a failed response.
    function simulateFailure(uint256 requestId, ResponseStatus failureStatus) external {
        StoredRequest memory sr = storedRequests[requestId];
        require(sr.callbackAddress != address(0), "request not found");
        require(
            failureStatus == ResponseStatus.Failed || failureStatus == ResponseStatus.TimedOut,
            "must be Failed or TimedOut"
        );

        Response[] memory responses = new Response[](0);
        Request memory req;
        req.id = requestId;
        req.status = failureStatus;

        (bool success,) = sr.callbackAddress.call(
            abi.encodeWithSelector(
                sr.callbackSelector,
                requestId,
                responses,
                failureStatus,
                req
            )
        );
        require(success, "callback failed");
    }

    receive() external payable {}
}
