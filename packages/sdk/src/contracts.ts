import { veritasAbi } from "./abis/Veritas";
import { predictionMarketAbi } from "./abis/PredictionMarket";
import { insuranceVaultAbi } from "./abis/InsuranceVault";
import { disputeArbiterAbi } from "./abis/DisputeArbiter";

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const,
    veritas: "0x519EEEe5216a5FcfC421BF5a51A4D54076dc6539" as const,
    predictionMarket: "0x064C4AFbB0Bba2F13991665D9E6C47Da94B46D8d" as const,
    insuranceVault: "0x7958378c6b7080Aca9938d4b69D4eBa512c5984d" as const,
    disputeArbiter: "0x71bbc8B81e620D2458421362E2b6D9B9f7D6006b" as const,
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
