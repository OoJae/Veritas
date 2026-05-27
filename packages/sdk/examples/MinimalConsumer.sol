// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVeritas, VerdictMode} from "../src/interfaces/IVeritas.sol";
import {Verdict} from "../src/types/VeritasTypes.sol";

/// @title MinimalConsumer
/// @notice Simplest possible Veritas consumer. Locks funds, requests a verdict,
///         and pays out the winner when the callback fires.
contract MinimalConsumer {
    IVeritas public immutable veritas;

    struct Bet {
        string question;
        address payable player;
        uint256 amount;
        uint256 verdictId;
        bool resolved;
        bool outcome;
    }

    uint256 public nextBetId;
    mapping(uint256 => Bet) public bets;

    event BetCreated(uint256 indexed betId, string question, uint256 amount);
    event BetResolved(uint256 indexed betId, bool outcome);

    constructor(address _veritas) {
        veritas = IVeritas(_veritas);
    }

    /// @notice Create a bet. msg.value is the stake. Verdict fee is paid by the contract.
    function createBet(
        string calldata question,
        string[] calldata evidenceUrls
    ) external payable returns (uint256 betId) {
        betId = nextBetId++;

        // Build the callback calldata. Veritas will call resolveBet(betId) on this contract.
        bytes memory payoutCalldata = abi.encodeWithSelector(
            MinimalConsumer.resolveBet.selector,
            betId
        );

        // Request a Simple mode verdict. msg.value covers both the verdict fee and the stake.
        // Use veritas.quoteVerdict(VerdictMode.Simple, evidenceUrls.length) to get the exact fee.
        uint256 verdictFee = veritas.quoteVerdict(VerdictMode.Simple, evidenceUrls.length);
        uint256 stake = msg.value - verdictFee;

        uint256 verdictId = veritas.requestVerdict{value: verdictFee}(
            question,
            evidenceUrls,
            VerdictMode.Simple,
            address(this),
            payoutCalldata
        );

        bets[betId] = Bet({
            question: question,
            player: payable(msg.sender),
            amount: stake,
            verdictId: verdictId,
            resolved: false,
            outcome: false
        });

        emit BetCreated(betId, question, stake);
    }

    /// @notice Called by Veritas as the payout callback.
    function resolveBet(uint256 betId) external {
        Bet storage b = bets[betId];
        require(!b.resolved, "already resolved");

        Verdict memory v = veritas.getVerdict(b.verdictId);
        b.resolved = true;
        b.outcome = v.result;

        emit BetResolved(betId, v.result);

        // If the verdict is YES, pay the player double their stake.
        if (v.result) {
            (bool ok,) = b.player.call{value: b.amount * 2}("");
            require(ok, "transfer failed");
        }
    }

    /// @notice Get bet details.
    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    receive() external payable {}
}
