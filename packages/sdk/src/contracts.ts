import { veritasAbi } from "./abis/Veritas";
import { predictionMarketAbi } from "./abis/PredictionMarket";
import { insuranceVaultAbi } from "./abis/InsuranceVault";
import { disputeArbiterAbi } from "./abis/DisputeArbiter";

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const,
    veritas: "0x702969d634b103f26F859aE658cD0405aa510FE3" as const,
    predictionMarket: "0x3BB03e11f82ce723F033cC2A47176dba326EC7C6" as const,
    insuranceVault: "0xE10caF9F4F8a62F289306990a801E0c26be4f347" as const,
    disputeArbiter: "0x5953449B12dF9bDC820E0C61Af526d0686030E11" as const,
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
