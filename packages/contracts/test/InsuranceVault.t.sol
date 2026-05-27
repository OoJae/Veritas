// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {InsuranceVault} from "../src/consumers/InsuranceVault.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";

contract InsuranceVaultTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    InsuranceVault public vault;

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

        vm.deal(address(veritas), 100 ether);
        vm.deal(address(vault), 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _createPolicy() internal returns (uint256 policyId) {
        string[] memory urls = new string[](1);
        urls[0] = "https://weather.example.com/nyc-rain";

        policyId = vault.createPolicy{value: 0.33 ether}(
            "Did it rain more than 2 inches in NYC on May 25?",
            urls,
            0.1 ether,   // premium
            0.5 ether,   // payout
            3            // max participants
        );
    }

    function test_createPolicy() public {
        uint256 policyId = _createPolicy();

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertEq(p.premium, 0.1 ether);
        assertEq(p.payoutAmount, 0.5 ether);
        assertEq(p.maxParticipants, 3);
        assertEq(p.participantCount, 0);
        assertFalse(p.resolved);
        assertFalse(p.outcome);
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

        // Alice should get 0.1 ether refund (paid 0.2, premium 0.1)
        uint256 balanceAfter = alice.balance;
        assertEq(balanceBefore - balanceAfter, 0.1 ether);
    }

    function test_joinPolicy_full() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(carol);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        // 4th participant should fail
        address dave = address(0xD4DE);
        vm.deal(dave, 100 ether);
        vm.prank(dave);
        vm.expectRevert(InsuranceVault.PolicyFull.selector);
        vault.joinPolicy{value: 0.1 ether}(policyId);
    }

    function test_fullFlow_yesOutcome() public {
        uint256 policyId = _createPolicy();

        // 3 users join
        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(carol);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        // Resolve with YES verdict (requestId 1)
        platform.simulateResponse(1, abi.encode("YES"), 42);

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertTrue(p.resolved);
        assertTrue(p.outcome);

        // Each user claims payout
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        vault.claimPayout(policyId);
        assertEq(alice.balance - aliceBefore, 0.5 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        vault.claimPayout(policyId);
        assertEq(bob.balance - bobBefore, 0.5 ether);

        uint256 carolBefore = carol.balance;
        vm.prank(carol);
        vault.claimPayout(policyId);
        assertEq(carol.balance - carolBefore, 0.5 ether);
    }

    function test_fullFlow_noOutcome() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);
        vm.prank(bob);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        // Resolve with NO verdict
        platform.simulateResponse(1, abi.encode("NO"), 42);

        InsuranceVault.Policy memory p = vault.getPolicy(policyId);
        assertTrue(p.resolved);
        assertFalse(p.outcome);

        // Claim should fail -- no payout on NO
        vm.prank(alice);
        vm.expectRevert(InsuranceVault.NoPayout.selector);
        vault.claimPayout(policyId);
    }

    function test_cannotClaimTwice() public {
        uint256 policyId = _createPolicy();

        vm.prank(alice);
        vault.joinPolicy{value: 0.1 ether}(policyId);

        // Resolve YES
        platform.simulateResponse(1, abi.encode("YES"), 42);

        vm.prank(alice);
        vault.claimPayout(policyId);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.AlreadyClaimed.selector);
        vault.claimPayout(policyId);
    }

    function test_cannotJoinAfterResolved() public {
        uint256 policyId = _createPolicy();

        // Resolve immediately (no participants)
        platform.simulateResponse(1, abi.encode("YES"), 42);

        vm.prank(alice);
        vm.expectRevert(InsuranceVault.PolicyAlreadyResolved.selector);
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
}
