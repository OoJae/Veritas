// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {PredictionMarket} from "../src/consumers/PredictionMarket.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ResponseStatus} from "../src/interfaces/IAgentRequester.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";

contract PredictionMarketTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    PredictionMarket public market;

    uint256 constant BETTING = 1 hours;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        // Mock the reactivity precompile
        address precompile = SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS;
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.subscribe.selector), abi.encode(uint256(1)));
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.unsubscribe.selector), abi.encode());

        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        market = new PredictionMarket(address(veritas));

        vm.deal(address(veritas), 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _urls() internal pure returns (string[] memory urls) {
        urls = new string[](1);
        urls[0] = "https://example.com";
    }

    function _createAndStake(uint256 yesAmt, uint256 noAmt) internal returns (uint256 marketId) {
        marketId = market.createMarket("Will it rain tomorrow?", _urls(), BETTING);
        vm.prank(alice);
        market.stakeYes{value: yesAmt}(marketId);
        vm.prank(bob);
        market.stakeNo{value: noAmt}(marketId);
    }

    function _trigger(uint256 marketId) internal {
        vm.warp(block.timestamp + BETTING + 1);
        market.triggerResolution{value: 0.55 ether}(marketId);
    }

    function test_createMarket_and_stake() public {
        uint256 marketId = _createAndStake(1 ether, 2 ether);
        assertEq(marketId, 0);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(m.yesPool, 1 ether);
        assertEq(m.noPool, 2 ether);
        assertEq(m.verdictId, 0); // verdict not yet requested
    }

    function test_fullFlow_yesWins() public {
        uint256 marketId = _createAndStake(1 ether, 1 ether);
        _trigger(marketId);

        platform.simulateResponse(1, abi.encode("YES"), 42);

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
        uint256 marketId = _createAndStake(3 ether, 1 ether);
        _trigger(marketId);

        platform.simulateResponse(1, abi.encode("NO"), 99);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertTrue(m.resolved);
        assertFalse(m.outcome);

        uint256 bobBalBefore = bob.balance;
        vm.prank(bob);
        market.claim(marketId);
        assertEq(bob.balance - bobBalBefore, 4 ether);
    }

    function test_cannotStakeAfterDeadline() public {
        uint256 marketId = market.createMarket("q", _urls(), BETTING);
        vm.warp(block.timestamp + BETTING + 1);

        vm.prank(alice);
        vm.expectRevert("betting closed");
        market.stakeYes{value: 1 ether}(marketId);
    }

    function test_cannotTriggerBeforeDeadline() public {
        uint256 marketId = market.createMarket("q", _urls(), BETTING);
        vm.expectRevert("betting still open");
        market.triggerResolution{value: 0.55 ether}(marketId);
    }

    function test_cannotTriggerTwice() public {
        uint256 marketId = _createAndStake(1 ether, 1 ether);
        _trigger(marketId);

        vm.expectRevert("resolution in progress");
        market.triggerResolution{value: 0.55 ether}(marketId);
    }

    function test_retryAfterFailedVerdict() public {
        uint256 marketId = _createAndStake(1 ether, 1 ether);
        vm.warp(block.timestamp + BETTING + 1);
        market.triggerResolution{value: 0.55 ether}(marketId); // requestId 1
        platform.simulateFailure(1, ResponseStatus.Failed);

        // Verdict failed; a retry is allowed and succeeds.
        market.triggerResolution{value: 0.55 ether}(marketId); // requestId 2
        platform.simulateResponse(2, abi.encode("YES"), 1);

        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertTrue(m.resolved);
        assertTrue(m.outcome);
    }

    function test_cannotClaimTwice() public {
        uint256 marketId = market.createMarket("q", _urls(), BETTING);
        vm.prank(alice);
        market.stakeYes{value: 1 ether}(marketId);
        _trigger(marketId);

        platform.simulateResponse(1, abi.encode("YES"), 1);

        vm.prank(alice);
        market.claim(marketId);

        vm.prank(alice);
        vm.expectRevert("already claimed");
        market.claim(marketId);
    }
}
