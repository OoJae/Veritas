import { veritasAbi } from "./abis/Veritas";
import { predictionMarketAbi } from "./abis/PredictionMarket";
import { insuranceVaultAbi } from "./abis/InsuranceVault";
import { disputeArbiterAbi } from "./abis/DisputeArbiter";

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const,
    veritas: "0x3324FCbe5c35982196D614113516e17a34eD019B" as const,
    predictionMarket: "0x228018ED7d0fD34F356589c901EEE00100864199" as const,
    insuranceVault: "0xfE484491b1588F6b1Cc654D5d51E1d9Debf7Fc3D" as const,
    disputeArbiter: "0x54D85A352D633FF0C66f6f45a5451299D0Aa5263" as const,
  },
} as const;

export const addresses = VERITAS_ADDRESSES.testnet;

export function getVeritasContract() {
  return {
    address: addresses.veritas as `0x${string}`,
    abi: veritasAbi,
  };
}

export function getPredictionMarketContract() {
  return {
    address: addresses.predictionMarket as `0x${string}`,
    abi: predictionMarketAbi,
  };
}

export function getInsuranceVaultContract() {
  return {
    address: addresses.insuranceVault as `0x${string}`,
    abi: insuranceVaultAbi,
  };
}

export function getDisputeArbiterContract() {
  return {
    address: addresses.disputeArbiter as `0x${string}`,
    abi: disputeArbiterAbi,
  };
}
