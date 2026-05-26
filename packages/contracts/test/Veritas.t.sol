// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Veritas} from "../src/Veritas.sol";
import {MockAgentRequester} from "../src/mocks/MockAgentRequester.sol";
import {VerdictMode, Stage, Verdict} from "../src/types/VeritasTypes.sol";
import {ResponseStatus, Response, Request} from "../src/interfaces/IAgentRequester.sol";

contract VeritasTest is Test {
    MockAgentRequester public platform;
    Veritas public veritas;
    address public user = address(0xBEEF);
    address public payoutTarget = address(0xCAFE);

    function setUp() public {
        platform = new MockAgentRequester();
        veritas = new Veritas(address(platform));
        vm.deal(address(veritas), 100 ether);
        vm.deal(user, 100 ether);
    }

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

        assertEq(verdictId, 0);
        Verdict memory v = veritas.getVerdict(0);
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

        Verdict memory v = veritas.getVerdict(0);
        assertTrue(v.result);
        assertEq(v.confidence, 80);
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

        Verdict memory v = veritas.getVerdict(0);
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

        Verdict memory v = veritas.getVerdict(0);
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

        Verdict memory v = veritas.getVerdict(0);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_requestVerdict_insufficientPayment() public {
        string[] memory urls = new string[](1);
        urls[0] = "https://example.com";

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("InsufficientPayment(uint256,uint256)", 0.33 ether, 0.01 ether));
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
        veritas.poke(0);
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
        veritas.poke(0);

        Verdict memory v = veritas.getVerdict(0);
        assertEq(uint256(v.stage), uint256(Stage.Failed));
    }

    function test_quoteVerdict_simple() public view {
        uint256 cost = veritas.quoteVerdict(VerdictMode.Simple, 0);
        assertEq(cost, 0.33 ether);
    }

    function test_quoteVerdict_deliberated_2urls() public view {
        uint256 cost = veritas.quoteVerdict(VerdictMode.Deliberated, 2);
        assertEq(cost, 0.03 ether + 2 * 0.30 ether + 0.21 ether);
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
        assertEq(verdictId, 0);
    }

    function test_receive_acceptsEther() public {
        (bool success,) = address(veritas).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(veritas).balance, 101 ether);
    }
}
