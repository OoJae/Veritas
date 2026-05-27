// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ISomniaReactivityPrecompile} from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";

/// @notice Mock Somnia Reactivity Precompile for testing.
///         Deploy at address(0x0100) via vm.etch in tests.
contract MockReactivityPrecompile is ISomniaReactivityPrecompile {
    uint256 public nextSubscriptionId = 1;
    mapping(uint256 => SubscriptionData) public subscriptions;
    mapping(uint256 => address) public owners;

    function subscribe(
        SubscriptionData calldata subscriptionData
    ) external override returns (uint256 subscriptionId) {
        subscriptionId = nextSubscriptionId++;
        subscriptions[subscriptionId] = subscriptionData;
        owners[subscriptionId] = msg.sender;
        emit SubscriptionCreated(subscriptionId, msg.sender, subscriptionData);
    }

    function unsubscribe(uint256 subscriptionId) external override {
        delete subscriptions[subscriptionId];
        delete owners[subscriptionId];
        emit SubscriptionRemoved(subscriptionId, msg.sender);
    }

    function getSubscriptionInfo(
        uint256 subscriptionId
    )
        external
        view
        override
        returns (SubscriptionData memory subscriptionData, address owner)
    {
        return (subscriptions[subscriptionId], owners[subscriptionId]);
    }
}
