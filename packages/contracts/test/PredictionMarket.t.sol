// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {PredictionMarket} from "../src/consumers/PredictionMarket.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";

contract PredictionMarketTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    PredictionMarket public market;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        market = new PredictionMarket(address(veritas));

        vm.deal(address(veritas), 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function test_createMarket_and_stake() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        uint256 marketId = market.createMarket{value: 1 ether}(
            "Will it rain tomorrow?",
            urls
        );

        assertEq(marketId, 0);

        vm.prank(alice);
        market.stakeYes{value: 1 ether}(marketId);

        vm.prank(bob);
        market.stakeNo{value: 2 ether}(marketId);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.yesPool, 1 ether);
        assertEq(m.noPool, 2 ether);
    }

    function test_fullFlow_yesWins() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        uint256 marketId = market.createMarket{value: 1 ether}(
            "Will it rain tomorrow?",
            urls
        );

        vm.prank(alice);
        market.stakeYes{value: 1 ether}(marketId);
        vm.prank(bob);
        market.stakeNo{value: 1 ether}(marketId);

        bytes memory yesResult = abi.encode("YES");
        platform.simulateResponse(1, yesResult, 42);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertTrue(m.resolved);
        assertTrue(m.outcome);

        uint256 aliceBalBefore = alice.balance;
        vm.prank(alice);
        market.claim(marketId);
        assertEq(alice.balance - aliceBalBefore, 2 ether);

        vm.prank(bob);
        vm.expectRevert("no stake on winning side");
        market.claim(marketId);
    }

    function test_fullFlow_noWins() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        uint256 marketId = market.createMarket{value: 1 ether}(
            "Is the earth flat?",
            urls
        );

        vm.prank(alice);
        market.stakeYes{value: 3 ether}(marketId);
        vm.prank(bob);
        market.stakeNo{value: 1 ether}(marketId);

        bytes memory noResult = abi.encode("NO");
        platform.simulateResponse(1, noResult, 99);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertTrue(m.resolved);
        assertFalse(m.outcome);

        uint256 bobBalBefore = bob.balance;
        vm.prank(bob);
        market.claim(marketId);
        assertEq(bob.balance - bobBalBefore, 4 ether);
    }

    function test_cannotStakeAfterResolved() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        uint256 marketId = market.createMarket{value: 1 ether}("q", urls);

        bytes memory yesResult = abi.encode("YES");
        platform.simulateResponse(1, yesResult, 1);

        vm.prank(alice);
        vm.expectRevert("already resolved");
        market.stakeYes{value: 1 ether}(marketId);
    }

    function test_cannotClaimTwice() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        uint256 marketId = market.createMarket{value: 1 ether}("q", urls);

        vm.prank(alice);
        market.stakeYes{value: 1 ether}(marketId);

        bytes memory yesResult = abi.encode("YES");
        platform.simulateResponse(1, yesResult, 1);

        vm.prank(alice);
        market.claim(marketId);

        vm.prank(alice);
        vm.expectRevert("already claimed");
        market.claim(marketId);
    }
}
