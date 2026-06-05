// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVeritas, VerdictMode} from "../interfaces/IVeritas.sol";
import {Verdict} from "../types/VeritasTypes.sol";

/// @title PredictionMarket
/// @notice Users stake YES or NO on a question. Veritas resolves it.
///         Winners claim a proportional share of the losers' pool.
contract PredictionMarket {
    IVeritas public immutable veritas;

    struct Market {
        string question;
        string[] evidenceUrls;
        uint256 verdictId;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
        uint256 createdAt;
        uint256 resolveAfter;
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesStakes;
    mapping(uint256 => mapping(address => uint256)) public noStakes;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event MarketCreated(uint256 indexed marketId, string question, uint256 resolveAfter);
    event StakePlaced(uint256 indexed marketId, address indexed user, bool side, uint256 amount);
    event ResolutionTriggered(uint256 indexed marketId, uint256 verdictId);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor(address _veritas) {
        veritas = IVeritas(_veritas);
    }

    /// @notice Open a market with a betting window. Free: the Veritas verdict is
    ///         not requested here, it is fired by triggerResolution after the
    ///         deadline. Staking is open until block.timestamp >= resolveAfter.
    function createMarket(
        string calldata question,
        string[] calldata evidenceUrls,
        uint256 bettingDuration
    ) external returns (uint256 marketId) {
        marketId = nextMarketId++;

        Market storage m = markets[marketId];
        m.question = question;
        for (uint256 i = 0; i < evidenceUrls.length; i++) {
            m.evidenceUrls.push(evidenceUrls[i]);
        }
        m.createdAt = block.timestamp;
        m.resolveAfter = block.timestamp + bettingDuration;

        emit MarketCreated(marketId, question, m.resolveAfter);
    }

    /// @notice Stake YES on a market. Only while the betting window is open.
    function stakeYes(uint256 marketId) external payable {
        Market storage m = markets[marketId];
        require(block.timestamp < m.resolveAfter, "betting closed");
        require(!m.resolved, "already resolved");
        require(msg.value > 0, "zero stake");

        m.yesPool += msg.value;
        yesStakes[marketId][msg.sender] += msg.value;
        emit StakePlaced(marketId, msg.sender, true, msg.value);
    }

    /// @notice Stake NO on a market. Only while the betting window is open.
    function stakeNo(uint256 marketId) external payable {
        Market storage m = markets[marketId];
        require(block.timestamp < m.resolveAfter, "betting closed");
        require(!m.resolved, "already resolved");
        require(msg.value > 0, "zero stake");

        m.noPool += msg.value;
        noStakes[marketId][msg.sender] += msg.value;
        emit StakePlaced(marketId, msg.sender, false, msg.value);
    }

    /// @notice After the betting window closes, anyone can fire the AI verdict by
    ///         paying the Veritas fee. Veritas calls resolveMarket on resolution.
    function triggerResolution(uint256 marketId) external payable {
        Market storage m = markets[marketId];
        require(block.timestamp >= m.resolveAfter, "betting still open");
        require(m.verdictId == 0, "already triggered");
        require(!m.resolved, "already resolved");

        bytes memory payoutCalldata = abi.encodeWithSelector(
            PredictionMarket.resolveMarket.selector,
            marketId
        );

        uint256 verdictId = veritas.requestVerdict{value: msg.value}(
            m.question,
            m.evidenceUrls,
            VerdictMode.Simple,
            address(this),
            payoutCalldata
        );

        m.verdictId = verdictId;
        emit ResolutionTriggered(marketId, verdictId);
    }

    /// @notice Called by Veritas when the verdict resolves. Sets the outcome.
    function resolveMarket(uint256 marketId) external {
        // Only callable as a payout callback from Veritas.
        // We trust Veritas to only call this on resolution.
        Market storage m = markets[marketId];
        require(!m.resolved, "already resolved");

        Verdict memory v = veritas.getVerdict(m.verdictId);
        m.resolved = true;
        m.outcome = v.result;

        emit MarketResolved(marketId, v.result);
    }

    /// @notice Claim winnings. Winners split the losers' pool proportionally.
    function claim(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.resolved, "not resolved");
        require(!claimed[marketId][msg.sender], "already claimed");

        uint256 userStake;
        uint256 winnerPool;
        uint256 loserPool;

        if (m.outcome) {
            userStake = yesStakes[marketId][msg.sender];
            winnerPool = m.yesPool;
            loserPool = m.noPool;
        } else {
            userStake = noStakes[marketId][msg.sender];
            winnerPool = m.noPool;
            loserPool = m.yesPool;
        }

        require(userStake > 0, "no stake on winning side");
        claimed[marketId][msg.sender] = true;

        uint256 payout = userStake + (userStake * loserPool) / winnerPool;
        (bool success,) = msg.sender.call{value: payout}("");
        require(success, "transfer failed");

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /// @notice Get market details.
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    receive() external payable {}
}
