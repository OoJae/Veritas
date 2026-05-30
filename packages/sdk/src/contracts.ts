import { veritasAbi } from "./abis/Veritas";
import { predictionMarketAbi } from "./abis/PredictionMarket";
import { insuranceVaultAbi } from "./abis/InsuranceVault";
import { disputeArbiterAbi } from "./abis/DisputeArbiter";

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const,
    veritas: "0x702969d634b103f26F859aE658cD0405aa510FE3" as const,
    predictionMarket: "0xf8F20dF2EaA923754b368e215f3B3f1646f4C480" as const,
    insuranceVault: "0x7d18cd184f43A7c4302C20016E53BECe508ad7A8" as const,
    disputeArbiter: "0x61d63870DAE005138721251c5cddf0D437A405bE" as const,
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
