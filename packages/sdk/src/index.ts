// @veritas/agent-template
// SDK exports for Veritas integration

export const VERITAS_ADDRESSES = {
  testnet: {
    platform: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776",
    veritas: "", // filled after deployment
    predictionMarket: "", // filled after deployment
  },
  mainnet: {
    platform: "0x5E5205CF39E766118C01636bED000A54D93163E6",
    veritas: "",
    predictionMarket: "",
  },
} as const;

export const AGENT_IDS = {
  LLM_PARSE_WEBSITE: 12875401142070969085n,
  LLM_INFERENCE: 12847293847561029384n,
  JSON_API_REQUEST: 13174292974160097713n,
} as const;

export const RECEIPT_URLS = {
  testnet: "https://receipts.testnet.agents.somnia.host",
  mainnet: "https://receipts.mainnet.agents.somnia.host",
} as const;

export function getReceiptUrl(requestId: string | bigint, network: "testnet" | "mainnet" = "testnet"): string {
  return `${RECEIPT_URLS[network]}?requestId=${requestId}`;
}

export function quoteVerdictSimple(): bigint {
  // reserve (0.03) + one Parse Website (0.10 * 3) = 0.33 STT
  return 330000000000000000n;
}

export function quoteVerdictDeliberated(numEvidenceUrls: number): bigint {
  const reserve = 30000000000000000n; // 0.03
  const evidenceCost = BigInt(numEvidenceUrls) * 300000000000000000n; // 0.30 each
  const inferenceCost = 210000000000000000n; // 0.07 * 3
  return reserve + evidenceCost + inferenceCost;
}
