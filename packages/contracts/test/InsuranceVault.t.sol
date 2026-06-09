// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {InsuranceVault} from "../src/consumers/InsuranceVault.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ResponseStatus} from "../src/interfaces/IAgentRequester.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";

contract InsuranceVaultTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    InsuranceVault public vault;

    uint256 constant JOIN = 1 hours;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public carol = address(0xCA);

    function setUp() public {
        // Mock the reactivity precompile
        address precompile = SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS;
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.subscribe.selector), abi.encode(uint256(1)));
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.unsubscribe.selector), abi.encode());

        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        vault = new InsuranceVault(address(veritas));

        vm.deal(address(this), 100 ether);
        vm.deal(address(veritas), 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _createPolicy() internal returns (uint256 policyId) {
        string[] memory urls = new string[](1);
        urls[0] = "https://weather.example.com/nyc-rain";

        // Creator funds pool with 1.5 STT (0.5 per participant × 3 max)
        policyId = vault.createPolicy{value: 1.5 ether}(
            "Did it rain more than 2 inches in NYC on May 25?",
            urls,
            0.1 ether,   // premium
            3,           // max participants
            JOIN         // join window
        );
    }

    function _resolve(string memory answer) internal {
        vm.warp(block.timestamp + JOIN + 1);
        vault.triggerResolution{value: 0.55 ether}(0);
        platform.simulateResponse(1, abi.encode(answer), 42);
    }

    function test_createPolicy() public {
        uint256 policyId = _createPolicy();

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertEq(p.premium, 0.1 ether);
        assertEq(p.maxParticipants, 3);
        assertEq(p.participantCount, 0);
        assertEq(p.verdictId, 0);
        assertFalse(p.resolved);
        assertEq(p.creator, address(this));
    }

    function test_joinPolicy() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertEq(p.participantCount, 2);
        assertTrue(vault.isParticipant(policyId, alice));
        assertTrue(vault.isParticipant(policyId, bob));
    }

    function test_joinPolicy_overpaymentRefund() public {
        uint256 policyId = _createPolicy();

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        vault.joinPolicy{value: 0.2 ether}(policyId);

        assertEq(balanceBefore - alice.balance, 0.1 ether);
    }

    function test_joinPolicy_full() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(carol);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        address dave = address(0xD4DE);
        vm.deal(dave, 100 ether);
        vm.prank(dave);
        vm.expectRevert(InsuranceVault.PolicyFull.selector);
        vault.joinPolicy{value: 0.1 ether}(policyId);
    }

    function test_fullFlow_yesOutcome() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(carol);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        _resolve("YES");

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertTrue(p.resolved);
        assertTrue(p.outcome);

        // Pool = 1.5 (creator) + 0.3 (premiums) = 1.8 STT
        // Each participant gets 1.8 / 3 = 0.6 STT
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        vault.claimPayout(policyId);
        assertEq(alice.balance - aliceBefore, 0.6 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        vault.claimPayout(policyId);
        assertEq(bob.balance - bobBefore, 0.6 ether);

        uint256 carolBefore = carol.balance;
        vm.prank(carol);
        vault.claimPayout(policyId);
        assertEq(carol.balance - carolBefore, 0.6 ether);
    }

    function test_fullFlow_noOutcome() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        _resolve("NO");

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertTrue(p.resolved);
        assertFalse(p.outcome);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.NoPayout.selector);
        vault.claimPayout(policyId);
    }

    function test_cannotClaimTwice() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        _resolve("YES");

        vm.prank(alice);
        vault.claimPayout(policyId);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.AlreadyClaimed.selector);
        vault.claimPayout(policyId);
    }

    function test_cannotJoinAfterDeadline() public {
        uint256 policyId = _createPolicy();
        vm.warp(block.timestamp + JOIN + 1);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.JoinWindowClosed.selector);
        vault.joinPolicy{value: 0.1 ether}(policyId);
    }

    function test_cannotJoinTwice() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.AlreadyJoined.selector);
        vault.joinPolicy{value: 0.1 ether}(policyId);
    }

    function test_cannotTriggerBeforeDeadline() public {
        _createPolicy();
        vm.expectRevert(InsuranceVault.JoinWindowOpen.selector);
        vault.triggerResolution{value: 0.55 ether}(0);
    }

    function test_cannotTriggerTwice() public {
        _createPolicy();
        vm.warp(block.timestamp + JOIN + 1);
        vault.triggerResolution{value: 0.55 ether}(0);

        vm.expectRevert(InsuranceVault.AlreadyTriggered.selector);
        vault.triggerResolution{value: 0.55 ether}(0);
    }

    function test_retryAfterFailedVerdict() public {
        uint256 policyId = _createPolicy();
        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        vm.warp(block.timestamp + JOIN + 1);
        vault.triggerResolution{value: 0.55 ether}(0); // requestId 1
        platform.simulateFailure(1, ResponseStatus.Failed);

        // Verdict failed; retry succeeds.
        vault.triggerResolution{value: 0.55 ether}(0); // requestId 2
        platform.simulateResponse(2, abi.encode("YES"), 1);

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertTrue(p.resolved);
        assertTrue(p.outcome);
    }
}
