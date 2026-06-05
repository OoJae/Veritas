import { veritasAbi } from "./abis/Veritas";
import { predictionMarketAbi } from "./abis/PredictionMarket";
import { insuranceVaultAbi } from "./abis/InsuranceVault";
import { disputeArbiterAbi } from "./abis/DisputeArbiter";

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const,
    veritas: "0x702969d634b103f26F859aE658cD0405aa510FE3" as const,
    predictionMarket: "0x3BB03e11f82ce723F033cC2A47176dba326EC7C6" as const,
    insuranceVault: "0x0170D5C42cF51652b91604faf742c80e564260B5" as const,
    disputeArbiter: "0x426B0db1BC2E761410956D24b8e9FE91a6a54d2E" as const,
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
