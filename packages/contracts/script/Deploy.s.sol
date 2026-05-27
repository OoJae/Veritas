// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Veritas} from "../src/Veritas.sol";
import {PredictionMarket} from "../src/consumers/PredictionMarket.sol";
import {InsuranceVault} from "../src/consumers/InsuranceVault.sol";
import {DisputeArbiter} from "../src/consumers/DisputeArbiter.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address platformAddress = vm.envAddress("PLATFORM_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        Veritas veritas = new Veritas(platformAddress);
        PredictionMarket predictionMarket = new PredictionMarket(address(veritas));
        InsuranceVault insuranceVault = new InsuranceVault(address(veritas));
        DisputeArbiter disputeArbiter = new DisputeArbiter(address(veritas));

        // Fund Veritas with 32 STT for Somnia Reactivity subscriptions
        (bool fundSuccess,) = payable(address(veritas)).call{value: 32 ether}("");
        require(fundSuccess, "Failed to fund Veritas with 32 STT");

        vm.stopBroadcast();

        console.log("Veritas deployed at:", address(veritas));
        console.log("PredictionMarket deployed at:", address(predictionMarket));
        console.log("InsuranceVault deployed at:", address(insuranceVault));
        console.log("DisputeArbiter deployed at:", address(disputeArbiter));
        console.log("Veritas funded with 32 STT for Reactivity subscriptions");
    }
}
