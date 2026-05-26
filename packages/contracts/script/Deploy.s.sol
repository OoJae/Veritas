// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Veritas} from "../src/Veritas.sol";
import {PredictionMarket} from "../src/consumers/PredictionMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address platformAddress = vm.envAddress("PLATFORM_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        Veritas veritas = new Veritas(platformAddress);
        PredictionMarket predictionMarket = new PredictionMarket(address(veritas));

        vm.stopBroadcast();

        console.log("Veritas deployed at:", address(veritas));
        console.log("PredictionMarket deployed at:", address(predictionMarket));
    }
}
