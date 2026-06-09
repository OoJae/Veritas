// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {DisputeArbiter} from "../src/consumers/DisputeArbiter.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";

contract DisputeArbiterTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    DisputeArbiter public arbiter;

    address public claimant = address(0xC1A);
    address public respondent = address(0x2E5);

    function setUp() public {
        // Mock the reactivity precompile
        address precompile = SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS;
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.subscribe.selector), abi.encode(uint256(1)));
        vm.mockCall(precompile, abi.encodeWithSelector(ISomniaReactivityPrecompile.unsubscribe.selector), abi.encode());

        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        arbiter = new DisputeArbiter(address(veritas));

        vm.deal(address(veritas), 100 ether);
        vm.deal(address(arbiter), 100 ether);
        vm.deal(claimant, 100 ether);
        vm.deal(respondent, 100 ether);
    }

    function _raiseDispute() internal returns (uint256 disputeId) {
        string[] memory urls = new string[](1);
        urls[0] = "https://claimant.example.com/evidence";

        vm.prank(claimant);
        disputeId = arbiter.raiseDispute{value: 1 ether}(
            respondent,
            "Did the DAO treasury lose funds due to the March proposal?",
            urls,
            1 hours
        );
    }

    function test_raiseDispute() public {
        uint256 disputeId = _raiseDispute();

        DisputeArbiter.Dispute memory d = arbiter.getDispute(disputeId);
        assertEq(d.claimant, claimant);
        assertEq(d.respondent, respondent);
        assertEq(d.bounty, 1 ether);
        assertFalse(d.resolved);
        assertEq(d.winner, address(0));
    }

    function test_submitEvidence() public {
        uint256 disputeId = _raiseDispute();

        string[] memory urls = new string[](1);
        urls[0] = "https://respondent.example.com/counter";

        vm.prank(respondent);
        arbiter.submitEvidence(disputeId, urls);

        DisputeArbiter.Dispute memory d = arbiter.getDispute(disputeId);
        assertEq(d.respondentEvidenceUrls.length, 1);
    }

    function test_submitEvidence_notRespondent() public {
        uint256 disputeId = _raiseDispute();

        string[] memory urls = new string[](1);
        urls[0] = "https://fake.example.com";

        vm.prank(claimant);
        vm.expectRevert(DisputeArbiter.NotRespondent.selector);
        arbiter.submitEvidence(disputeId, urls);
    }

    function test_submitEvidence_windowClosed() public {
        uint256 disputeId = _raiseDispute();

        // Warp past evidence window
        vm.warp(block.timestamp + 2 hours);

        string[] memory urls = new string[](1);
        urls[0] = "https://late.example.com";

        vm.prank(respondent);
        vm.expectRevert(DisputeArbiter.EvidenceWindowClosed.selector);
        arbiter.submitEvidence(disputeId, urls);
    }

    function test_fullFlow_claimantWins() public {
        uint256 disputeId = _raiseDispute();

        // Respondent submits counter-evidence
        string[] memory urls = new string[](1);
        urls[0] = "https://respondent.example.com/counter";
        vm.prank(respondent);
        arbiter.submitEvidence(disputeId, urls);

        // Anyone triggers resolution with verdict fee
        arbiter.resolveDispute{value: 0.55 ether}(disputeId);

        // Simulate YES verdict (claimant wins) - requestId 1
        platform.simulateResponse(1, abi.encode("YES"), 42);

        DisputeArbiter.Dispute memory d = arbiter.getDispute(disputeId);
        assertTrue(d.resolved);
        assertEq(d.winner, claimant);

        // Claimant claims bounty
        uint256 before = claimant.balance;
        vm.prank(claimant);
        arbiter.claimBounty(disputeId);
        assertEq(claimant.balance - before, 1 ether);
    }

    function test_fullFlow_respondentWins() public {
        uint256 disputeId = _raiseDispute();

        string[] memory urls = new string[](1);
        urls[0] = "https://respondent.example.com/counter";
        vm.prank(respondent);
        arbiter.submitEvidence(disputeId, urls);

        arbiter.resolveDispute{value: 0.55 ether}(disputeId);

        // Simulate NO verdict (respondent wins)
        platform.simulateResponse(1, abi.encode("NO"), 42);

        DisputeArbiter.Dispute memory d = arbiter.getDispute(disputeId);
        assertTrue(d.resolved);
        assertEq(d.winner, respondent);

        uint256 before = respondent.balance;
        vm.prank(respondent);
        arbiter.claimBounty(disputeId);
        assertEq(respondent.balance - before, 1 ether);
    }

    function test_cannotClaimTwice() public {
        uint256 disputeId = _raiseDispute();

        string[] memory urls = new string[](1);
        urls[0] = "https://respondent.example.com/counter";
        vm.prank(respondent);
        arbiter.submitEvidence(disputeId, urls);

        arbiter.resolveDispute{value: 0.55 ether}(disputeId);
        platform.simulateResponse(1, abi.encode("YES"), 42);

        vm.prank(claimant);
        arbiter.claimBounty(disputeId);

        vm.prank(claimant);
        vm.expectRevert(DisputeArbiter.NoBounty.selector);
        arbiter.claimBounty(disputeId);
    }

    function test_cannotResolve_twice() public {
        uint256 disputeId = _raiseDispute();

        string[] memory urls = new string[](1);
        urls[0] = "https://respondent.example.com/counter";
        vm.prank(respondent);
        arbiter.submitEvidence(disputeId, urls);

        arbiter.resolveDispute{value: 0.55 ether}(disputeId);
        platform.simulateResponse(1, abi.encode("YES"), 42);

        vm.expectRevert(DisputeArbiter.AlreadyResolved.selector);
        arbiter.resolveDispute(disputeId);
    }
}
