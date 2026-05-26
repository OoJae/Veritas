// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {HelloAgent} from "../src/HelloAgent.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {ResponseStatus, Response, Request} from "../src/interfaces/IAgentRequester.sol";

contract HelloAgentTest is Test {
    MockAgentRequester public platform;
    HelloAgent public agent;

    function setUp() public {
        platform = new MockAgentRequester();
        agent = new HelloAgent(address(platform));
        vm.deal(address(agent), 10 ether);
    }

    function test_fetchValue_storesResult() public {
        uint256 requestId = agent.fetchValue{value: 1 ether}(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
            "bitcoin.usd",
            8
        );

        assertEq(requestId, 1);
        assertTrue(agent.pendingRequests(1));

        uint256 price = 6750000000000;
        platform.simulateResponse(1, abi.encode(price), 1);

        assertEq(agent.latestValue(), price);
        assertFalse(agent.pendingRequests(1));
    }

    function test_handleResponse_onlyPlatform() public {
        agent.fetchValue{value: 1 ether}("https://example.com", "data", 0);

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(this),
            result: abi.encode(uint256(42)),
            status: ResponseStatus.Success,
            receipt: 1,
            timestamp: block.timestamp,
            executionCost: 0
        });
        Request memory req;
        req.id = 1;

        vm.expectRevert("only platform");
        agent.handleResponse(1, responses, ResponseStatus.Success, req);
    }
}
