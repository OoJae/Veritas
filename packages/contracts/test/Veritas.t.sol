// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ResponseStatus, Response, Request} from "../src/interfaces/IAgentRequester.sol";
import {IVeritas} from "../src/interfaces/IVeritas.sol";
import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";
import {SomniaExtensions} from "@somnia-chain/reactivity-contracts/contracts/interfaces/SomniaExtensions.sol";

contract VeritasTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    address public user = address(0xBEEF);
    address public payoutTarget = address(0xCAFE);

    // Mock the reactivity precompile at 0x0100 so subscribe/unsubscribe don't revert
    function _mockReactivityPrecompile() internal {
        address precompile = SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS;
        // subscribe returns subscriptionId 1
        vm.mockCall(
            precompile,
            abi.encodeWithSelector(ISomniaReactivityPrecompile.subscribe.selector),
            abi.encode(uint256(1))
        );
        // unsubscribe is a no-op
        vm.mockCall(
            precompile,
            abi.encodeWithSelector(ISomniaReactivityPrecompile.unsubscribe.selector),
            abi.encode()
        );
    }

    function setUp() public {
        _mockReactivityPrecompile();

        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        // Fund Veritas with enough for subscription minimum (32 STT) + test deposits
        vm.deal(address(veritas), 100 ether);
        vm.deal(user, 100 ether);
    }

    // ----- Basic tests -----

    function test_requestVerdict_simpleMode_emitsEvent() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        uint256 verdictId = veritas.requestVerdict{value: 1 ether}(
            "Is the sky blue?",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        assertEq(verdictId, 1);
        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));
    }

    function test_requestVerdict_simpleMode_success_resolvesYES() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "Is the sky blue?",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        bytes memory yesResult = abi.encode("YES");
        platform.simulateResponse(1, yesResult, 42);

        Verdict memory v = veritas.getVerdict(1);
        assertTrue(v.result);
        assertEq(v.confidence, 100); // single successful response = 100% agreement
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertNotEq(v.reasoningRef, bytes32(0));
    }

    function test_requestVerdict_simpleMode_success_resolvesNO() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "Is the earth flat?",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        bytes memory noResult = abi.encode("NO");
        platform.simulateResponse(1, noResult, 99);

        Verdict memory v = veritas.getVerdict(1);
        assertFalse(v.result);
    }

    function test_handleResponse_onlyPlatform() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(this),
            result: abi.encode("YES"),
            status: ResponseStatus.Success,
            receipt: 1,
            timestamp: block.timestamp,
            executionCost: 0
        });

        Request memory req;
        req.id = 1;

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OnlyPlatform()"));
        veritas.handleResponse(1, responses, ResponseStatus.Success, req);
    }

    function test_handleResponse_failedStatus() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        platform.simulateFailure(1, ResponseStatus.Failed);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_handleResponse_timedOutStatus() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        platform.simulateFailure(1, ResponseStatus.TimedOut);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_requestVerdict_insufficientPayment() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("InsufficientPayment(uint256,uint256)", 0.55 ether, 0.01 ether));
        veritas.requestVerdict{value: 0.01 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );
    }

    function test_requestVerdict_tooManyEvidenceUrls() public {
        string[] memory urls = new string[](4);
        urls[0] = "a";
        urls[1] = "b";
        urls[2] = "c";
        urls[3] = "d";

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("TooManyEvidenceUrls(uint256)", 4));
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );
    }

    function test_poke_beforeDeadline_reverts() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        vm.expectRevert(abi.encodeWithSignature("DeadlineNotPassed()"));
        veritas.poke(1);
    }

    function test_poke_afterDeadline_setsFailed() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        vm.warp(block.timestamp + 16 minutes);
        veritas.poke(1);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_quoteVerdict_simple() public view {
        uint256 cost = veritas.quoteVerdict(VerdictMode.Simple, 0);
        assertEq(cost, 0.55 ether); // 0.01*5 reserve + 0.10*5 parse
    }

    function test_quoteVerdict_deliberated_2urls() public view {
        uint256 cost = veritas.quoteVerdict(VerdictMode.Deliberated, 2);
        assertEq(cost, 0.05 ether + 2 * 0.50 ether + 0.35 ether);
    }

    function _createSimpleVerdict() internal {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";
        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question", urls, VerdictMode.Simple, payoutTarget, abi.encodeWithSignature("noop()")
        );
    }

    function test_aggregate_majorityYesWins() public {
        _createSimpleVerdict();
        bytes[] memory results = new bytes[](5);
        bool[] memory success = new bool[](5);
        results[0] = abi.encode("YES"); success[0] = true;
        results[1] = abi.encode("YES"); success[1] = true;
        results[2] = abi.encode("YES"); success[2] = true;
        results[3] = abi.encode("NO");  success[3] = true;
        results[4] = abi.encode("NO");  success[4] = true;
        platform.simulateAdvancedResponse(1, results, success, 42);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertTrue(v.result);
        assertEq(v.confidence, 60); // 3 of 5 agreed
    }

    function test_aggregate_toleratesFailedScrapes() public {
        _createSimpleVerdict();
        bytes[] memory results = new bytes[](3);
        bool[] memory success = new bool[](3);
        results[0] = abi.encode("YES"); success[0] = true;
        results[1] = bytes("");         success[1] = false;
        results[2] = bytes("");         success[2] = false;
        platform.simulateAdvancedResponse(1, results, success, 7);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertTrue(v.result);
        assertEq(v.confidence, 100); // 1 of 1 success
    }

    function test_aggregate_allFailed_marksFailed() public {
        _createSimpleVerdict();
        bytes[] memory results = new bytes[](3);
        bool[] memory success = new bool[](3); // all false
        platform.simulateAdvancedResponse(1, results, success, 0);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_requestToVerdict_mapping() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        uint256 verdictId = veritas.requestToVerdict(1);
        assertEq(verdictId, 1);
    }

    function test_receive_acceptsEther() public {
        (bool success,) = address(veritas).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(veritas).balance, 101 ether);
    }

    // ----- Deliberated mode tests -----

    function test_deliberated_singleUrl_evidenceThenInference() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com/evidence";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "Is X true?",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));

        // Simulate evidence response (requestId 1)
        bytes memory evidenceResult = abi.encode("X is confirmed by source");
        platform.simulateResponse(1, evidenceResult, 10);

        // Stage should now be Reasoning, gatheredEvidence has 1 entry
        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Reasoning));
        assertEq(v.gatheredEvidence.length, 1);

        // Simulate inference response (requestId 2)
        bytes memory inferenceResult = abi.encode("YES");
        platform.simulateResponse(2, inferenceResult, 20);

        // Resolved with YES
        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertTrue(v.result);
        assertEq(v.confidence, 100); // single successful response = 100% agreement
    }

    function test_deliberated_multiUrl_gathersAllEvidence() public {
        string[] memory urls = new string[](3);
        urls[0] = "https://example.com/source1";
        urls[1] = "https://example.com/source2";
        urls[2] = "https://example.com/source3";

        vm.prank(user);
        veritas.requestVerdict{value: 2 ether}(
            "Is Y true?",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Simulate 3 evidence responses (requestIds 1, 2, 3)
        platform.simulateResponse(1, abi.encode("Source 1 says YES"), 10);
        Verdict memory v = veritas.getVerdict(1);
        assertEq(v.gatheredEvidence.length, 1);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));

        platform.simulateResponse(2, abi.encode("Source 2 confirms"), 11);
        v = veritas.getVerdict(1);
        assertEq(v.gatheredEvidence.length, 2);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));

        platform.simulateResponse(3, abi.encode("Source 3 agrees"), 12);
        v = veritas.getVerdict(1);
        assertEq(v.gatheredEvidence.length, 3);
        // After last evidence, stage transitions to Reasoning
        assertEq(uint256(v.stage), uint256(Stage.Reasoning));

        // Simulate inference (requestId 4)
        platform.simulateResponse(4, abi.encode("YES"), 20);
        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertTrue(v.result);
    }

    function test_deliberated_inferenceFailure_setsFailed() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com/evidence";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Evidence succeeds
        platform.simulateResponse(1, abi.encode("some evidence"), 10);

        // Inference fails
        platform.simulateFailure(2, ResponseStatus.Failed);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_deliberated_inferenceTimeout_setsFailed() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com/evidence";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Evidence succeeds
        platform.simulateResponse(1, abi.encode("some evidence"), 10);

        // Inference times out
        platform.simulateFailure(2, ResponseStatus.TimedOut);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_deliberated_evidencePartial_thenDeadlinePoke() public {
        string[] memory urls = new string[](2);
        urls[0] = "https://example.com/source1";
        urls[1] = "https://example.com/source2";

        vm.prank(user);
        veritas.requestVerdict{value: 2 ether}(
            "question",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Only first evidence succeeds
        platform.simulateResponse(1, abi.encode("source 1 evidence"), 10);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));

        // Warp past deadline and poke
        vm.warp(block.timestamp + 16 minutes);
        veritas.poke(1);

        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_deliberated_quoteVerdict_exactCost() public {
        uint256 cost = veritas.quoteVerdict(VerdictMode.Deliberated, 1);
        // reserve 0.03 + 1 evidence (0.10*3) + inference (0.07*3) = 0.03 + 0.30 + 0.21 = 0.54
        assertEq(cost, 0.90 ether); // 0.05 reserve + 0.50 evidence + 0.35 inference

        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: cost}(
            "question",
            urls,
            VerdictMode.Deliberated,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.FetchingEvidence));
    }

    // ----- Sprint 3 edge case tests -----

    function test_resolve_callbackFails_stillResolves() public {
        address badTarget = address(0xDEAD);
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            badTarget,
            abi.encodeWithSignature("nonexistent()")
        );

        // Mock the payoutTarget call to revert
        vm.mockCallRevert(
            badTarget,
            abi.encodeWithSignature("nonexistent()"),
            abi.encode("callback reverted")
        );

        vm.recordLogs();

        bytes memory result = abi.encode("YES");
        platform.simulateResponse(1, result, 42);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
        assertTrue(v.result);

        // Check that CallbackFailed was emitted
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool foundCallbackFailed = false;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("CallbackFailed(uint256,address)")) {
                foundCallbackFailed = true;
                break;
            }
        }
        assertTrue(foundCallbackFailed, "CallbackFailed event not emitted");
    }

    function test_poke_emitsVerdictPoked() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        vm.warp(block.timestamp + 16 minutes);

        vm.expectEmit(true, false, false, false);
        emit IVeritas.VerdictPoked(1);

        veritas.poke(1);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    // ----- Reactivity integration tests -----

    function test_requestVerdict_schedulesDeadlineSubscription() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Verify the subscription was created (mocked to return 1)
        uint256 subId = veritas.verdictToSubscription(1);
        assertEq(subId, 1, "subscription should be created");

        // Verify timestamp mapping exists
        Verdict memory v = veritas.getVerdict(1);
        uint256 deadlineMillis = v.deadline * 1000 + 1; // + verdictId
        uint256 mappedVerdictId = veritas.timestampToVerdictId(deadlineMillis);
        assertEq(mappedVerdictId, 1, "timestamp should map to verdictId 1");
    }

    function test_resolve_cancelsSubscription() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        uint256 subIdBefore = veritas.verdictToSubscription(1);
        assertEq(subIdBefore, 1, "subscription should exist before resolve");

        // Resolve the verdict
        platform.simulateResponse(1, abi.encode("YES"), 42);

        // Subscription should be canceled
        uint256 subIdAfter = veritas.verdictToSubscription(1);
        assertEq(subIdAfter, 0, "subscription should be cleared after resolve");
    }

    function test_failure_cancelsSubscription() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        uint256 subIdBefore = veritas.verdictToSubscription(1);
        assertEq(subIdBefore, 1, "subscription should exist before failure");

        // Simulate agent failure
        platform.simulateFailure(1, ResponseStatus.Failed);

        // Subscription should be canceled
        uint256 subIdAfter = veritas.verdictToSubscription(1);
        assertEq(subIdAfter, 0, "subscription should be cleared after failure");
    }

    function test_onEvent_pokesPendingVerdict() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        Verdict memory v = veritas.getVerdict(1);
        uint256 deadlineMillis = v.deadline * 1000 + 1; // + verdictId

        // Clear mocks so onEvent can read storage normally
        vm.clearMockedCalls();

        // Build the event topics that the precompile would send
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = ISomniaReactivityPrecompile.Schedule.selector;
        topics[1] = bytes32(deadlineMillis);

        // Call onEvent as the precompile
        vm.prank(SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS);
        veritas.onEvent(address(SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS), topics, "");

        // Verdict should be poked to Failed
        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_onEvent_skipsResolvedVerdict() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        veritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // Resolve first
        platform.simulateResponse(1, abi.encode("YES"), 42);

        Verdict memory v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));

        // Call onEvent with a random timestamp - should be a no-op
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = ISomniaReactivityPrecompile.Schedule.selector;
        topics[1] = bytes32(uint256(999999));

        vm.prank(SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS);
        veritas.onEvent(address(SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS), topics, "");

        // Should still be Resolved (no state change)
        v = veritas.getVerdict(1);
        assertEq(uint256(v.stage), uint256(Stage.Resolved));
    }

    function test_reactivity_skipsIfInsufficientBalance() public {
        // Deploy a fresh Veritas with no balance
        Veritas poorVeritas = new Veritas(address(platform));

        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        poorVeritas.requestVerdict{value: 1 ether}(
            "question",
            urls,
            VerdictMode.Simple,
            payoutTarget,
            abi.encodeWithSignature("noop()")
        );

        // No subscription should be created (balance < 32 ether)
        uint256 subId = poorVeritas.verdictToSubscription(1);
        assertEq(subId, 0, "no subscription when balance insufficient");
    }
}
