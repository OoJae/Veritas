// @veritas/agent-template
// SDK exports for Veritas integration

export { somniaTestnet } from "./chains";
export { veritasAbi } from "./abis/Veritas";
export { predictionMarketAbi } from "./abis/PredictionMarket";
export { insuranceVaultAbi } from "./abis/InsuranceVault";
export { disputeArbiterAbi } from "./abis/DisputeArbiter";
import { VERITAS_ADDRESSES } from "./contracts";

export {
  VERITAS_ADDRESSES,
  addresses,
  getVeritasContract,
  getPredictionMarketContract,
  getInsuranceVaultContract,
  getDisputeArbiterContract,
} from "./contracts";

export const AGENT_IDS = {
  LLM_PARSE_WEBSITE: BigInt("12875401142070969085"),
  LLM_INFERENCE: BigInt("12847293847561029384"),
  JSON_API_REQUEST: BigInt("13174292974160097713"),
} as const;

export const RECEIPT_URLS = {
  testnet: "https://receipts.testnet.agents.somnia.host",
  mainnet: "https://receipts.mainnet.agents.somnia.host",
} as const;

/// Returns the receipts index URL for a request. The service responds with a
/// JSON list of receipt file URLs (one per subcommittee member), each of which
/// is the full execution manifest. The route requires the platform contract
/// address (per Somnia DevRel): /agent-receipts?contractAddress=<platform>&requestId=<id>.
export function getReceiptUrl(requestId: string | bigint, network: "testnet" | "mainnet" = "testnet"): string {
  const platform = VERITAS_ADDRESSES.testnet.platform;
  return `${RECEIPT_URLS[network]}/agent-receipts?contractAddress=${platform}&requestId=${requestId}`;
}

export function quoteVerdictSimple(): bigint {
  return BigInt("330000000000000000"); // 0.33 STT
}

export function quoteVerdictDeliberated(numEvidenceUrls: number): bigint {
  const reserve = BigInt("30000000000000000"); // 0.03
  const evidenceCost = BigInt(numEvidenceUrls) * BigInt("300000000000000000"); // 0.30 each
  const inferenceCost = BigInt("210000000000000000"); // 0.07 * 3
  return reserve + evidenceCost + inferenceCost;
}
