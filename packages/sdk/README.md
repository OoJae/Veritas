# @veritas/agent-template

SDK for building on-chain applications that use the Veritas AI verdict primitive on Somnia.

## Install

```bash
pnpm add @veritas/agent-template
```

## Quick Start (TypeScript)

```ts
import {
  addresses,
  veritasAbi,
  predictionMarketAbi,
  quoteVerdictSimple,
  quoteVerdictDeliberated,
  getReceiptUrl,
  somniaTestnet,
} from "@veritas/agent-template";
import { createPublicClient, http, parseAbiItem } from "viem";

// Read a verdict
const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

const verdict = await client.readContract({
  address: addresses.veritas,
  abi: veritasAbi,
  functionName: "getVerdict",
  args: [0n], // verdictId
});

console.log("Result:", verdict.result);
console.log("Confidence:", verdict.confidence);

// Get the cost for a Simple verdict with 1 evidence URL
const cost = quoteVerdictSimple(); // 0.33 STT

// Get the cost for a Deliberated verdict with 2 evidence URLs
const cost2 = quoteVerdictDeliberated(2); // 0.03 + 0.60 + 0.21 = 0.84 STT

// Fetch the reasoning trace for a resolved verdict
const receiptUrl = getReceiptUrl(verdict.lastRequestId);
```

## Quick Start (Solidity)

See [examples/MinimalConsumer.sol](examples/MinimalConsumer.sol) for a minimal consumer contract that:

1. Accepts a bet with a yes/no question
2. Requests a Veritas verdict
3. Receives the callback when the verdict resolves
4. Pays out based on the result

## Contract Addresses (Somnia Testnet, chain 50312)

| Contract | Address |
|----------|---------|
| Platform (AgentRequester) | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| Veritas | `0x3324FCbe5c35982196D614113516e17a34eD019B` |
| PredictionMarket | `0x228018ED7d0fD34F356589c901EEE00100864199` |
| InsuranceVault | `0xfE484491b1588F6b1Cc654D5d51E1d9Debf7Fc3D` |
| DisputeArbiter | `0x54D85A352D633FF0C66f6f45a5451299D0Aa5263` |

## Verdict Modes

- **Simple**: One LLM Parse Website call. Cost: `quoteVerdictSimple()` = 0.33 STT.
- **Deliberated**: One evidence extraction per URL, then one inference synthesis. Cost: `quoteVerdictDeliberated(n)` = 0.03 + n * 0.30 + 0.21 STT.

## Receipts

After a verdict resolves, fetch the AI reasoning trace:

```
https://receipts.testnet.agents.somnia.host?requestId=<lastRequestId>
```

Use `getReceiptUrl(requestId)` to build this URL. The response contains the chain-of-thought reasoning, confidence score, and execution steps.
