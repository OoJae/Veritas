// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PredictionMarket} from "../src/consumers/PredictionMarket.sol";
import {InsuranceVault} from "../src/consumers/InsuranceVault.sol";
import {DisputeArbiter} from "../src/consumers/DisputeArbiter.sol";

/// @notice Redeploy only the three consumers against an existing Veritas.
///         Veritas is unchanged by the deadline-resolution work, so we reuse the
///         already-funded deployment instead of redeploying and re-funding it.
contract DeployConsumers is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address veritas = vm.envAddress("VERITAS_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        PredictionMarket predictionMarket = new PredictionMarket(veritas);
        InsuranceVault insuranceVault = new InsuranceVault(veritas);
        DisputeArbiter disputeArbiter = new DisputeArbiter(veritas);

        vm.stopBroadcast();

        console.log("Veritas (reused):", veritas);
        console.log("PredictionMarket deployed at:", address(predictionMarket));
        console.log("InsuranceVault deployed at:", address(insuranceVault));
        console.log("DisputeArbiter deployed at:", address(disputeArbiter));
    }
}
