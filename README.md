# Veritas

A trustless AI verdict primitive for the Somnia Agentic L1. One reusable contract that takes a natural language question plus evidence, returns a binding consensus-verified verdict with an auditable receipt, and powers three reference applications: a prediction market, a parametric insurance vault, and a DAO dispute resolver.

## Architecture

```
  User / Consumer Contract
         |
         | requestVerdict(question, evidenceUrls, mode)
         v
  +-----------------+
  |    Veritas.sol  |  <-- the primitive (state machine)
  +-----------------+
         |
         | platform.createRequest{value: deposit}(agentId, callback, payload)
         v
  +------------------------+
  |  Somnia AgentRequester |  <-- platform contract (chain 50312)
  +------------------------+
         |
         | Validator subcommittee runs agent off-chain
         v
  +------------------------+
  |  LLM Parse Website /   |  <-- ExtractString, inferString
  |  LLM Inference         |
  +------------------------+
         |
         | handleResponse(requestId, responses, status)
         v
  +-----------------+
  |    Veritas.sol  |  <-- resolves verdict, calls payoutTarget
  +-----------------+
         |
         | payoutTarget.call(payoutCalldata)
         v
  +---------------------+---------------------+---------------------+
  | PredictionMarket    | InsuranceVault      | DisputeArbiter      |
  | (stake YES/NO)      | (parametric policy) | (evidence bounty)   |
  +---------------------+---------------------+---------------------+
```

The key insight: Somnia agent invocations are asynchronous. Your contract calls `createRequest`, gets back a `requestId`, and the platform calls your callback in a separate transaction once the validator subcommittee reaches consensus. Veritas manages this state machine so consumers only need to trust the verdict.

## Contract Addresses (Somnia Testnet, chain 50312)

| Contract | Address |
|----------|---------|
| Platform (AgentRequester) | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| Veritas | `0x3324FCbe5c35982196D614113516e17a34eD019B` |
| PredictionMarket | `0x228018ED7d0fD34F356589c901EEE00100864199` |
| InsuranceVault | `0xfE484491b1588F6b1Cc654D5d51E1d9Debf7Fc3D` |
| DisputeArbiter | `0x54D85A352D633FF0C66f6f45a5451299D0Aa5263` |

## Deposit Math

The platform charges per-agent rewards to the validator subcommittee. You must send enough ETH to cover the floor deposit plus the per-agent price times the subcommittee size (default 3).

| Verdict Mode | Formula | Cost |
|-------------|---------|------|
| Simple (1 URL) | 0.03 + 0.10 x 3 | **0.33 STT** |
| Deliberated (N URLs) | 0.03 + N x 0.30 + 0.21 | **0.03 + N x 0.30 + 0.21 STT** |

Use `quoteVerdict(mode, numEvidenceUrls)` on-chain or `quoteVerdictSimple()` / `quoteVerdictDeliberated(n)` from the SDK to get the exact amount. Sending extra is fine, the surplus is rebated to the contract.

## Why Only on Somnia

- **Sub-second finality**: Verdicts resolve fast enough for live prediction markets and real-time dispute settlement.
- **Low gas**: Multiple agent calls per verdict (evidence extraction, inference synthesis) are affordable. On Ethereum L1, this would cost orders of magnitude more.
- **Native agent platform**: No oracle bridges, no off-chain relayers. The `AgentRequester` is a first-class platform contract. Validators run agents and reach consensus on-chain.
- **Auditable receipts**: After consensus, the platform exposes a signed manifest of execution steps (HTTP calls, LLM prompt, chain-of-thought reasoning). No other chain shows this artifact for an on-chain AI decision.

## Quick Start (TypeScript)

```ts
import {
  addresses,
  veritasAbi,
  quoteVerdictSimple,
  getReceiptUrl,
  somniaTestnet,
} from "@veritas/agent-template";
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});

// Read a verdict
const verdict = await client.readContract({
  address: addresses.veritas,
  abi: veritasAbi,
  functionName: "getVerdict",
  args: [0n],
});

console.log("Result:", verdict.result);
console.log("Confidence:", verdict.confidence);

// Get the cost for a Simple verdict
const cost = quoteVerdictSimple(); // 0.33 STT

// Fetch the reasoning trace for a resolved verdict
const receiptUrl = getReceiptUrl(verdict.lastRequestId);
```

## Quick Start (Solidity)

See [packages/sdk/examples/MinimalConsumer.sol](packages/sdk/examples/MinimalConsumer.sol) for a minimal consumer contract that:

1. Accepts a bet with a yes/no question
2. Requests a Veritas verdict
3. Receives the callback when the verdict resolves
4. Pays out based on the result

## Project Structure

```
veritas/
  packages/
    contracts/              Foundry project
      src/
        Veritas.sol         The primitive (state machine)
        interfaces/         IVeritas, IAgentRequester, IAgents
        types/              Enums and structs
        consumers/          PredictionMarket, InsuranceVault, DisputeArbiter
        mocks/              MockAgentRequester (test double)
      test/                 46 Foundry tests
      script/               Deploy script
    sdk/                    @veritas/agent-template npm package
      src/
        abis/               Contract ABIs (TS + JSON)
        chains.ts           Somnia chain config
        contracts.ts        Addresses and contract helpers
        index.ts            Public exports
      examples/             MinimalConsumer.sol
      README.md             SDK documentation
  apps/
    web/                    Next.js 15 frontend
      app/
        markets/            Prediction market UI
        insurance/          Insurance vault UI
        disputes/           Dispute resolver UI
        status/             System status dashboard
      components/           Shared components (ReasoningTrace, verdict-display)
      hooks/                React hooks for each contract
```

## Development

```bash
# Install dependencies
pnpm install

# Run contract tests
cd packages/contracts && forge test

# Start the frontend dev server
pnpm --filter @veritas/web dev

# Build the frontend
pnpm --filter @veritas/web build

# Build the SDK
pnpm --filter @veritas/agent-template build
```

## Verdict Modes

- **Simple**: One LLM Parse Website call. The agent searches or scrapes, reasons, and returns YES/NO/UNRESOLVED in a single round trip. Cost: `quoteVerdictSimple()` = 0.33 STT.
- **Deliberated**: One evidence extraction per URL, then one inference synthesis. More expensive but supports multi-source reasoning. Cost: `quoteVerdictDeliberated(n)` = 0.03 + n x 0.30 + 0.21 STT.

## Receipts

After a verdict resolves, fetch the AI reasoning trace:

```
https://receipts.testnet.agents.somnia.host?requestId=<lastRequestId>
```

Use `getReceiptUrl(requestId)` to build this URL. The response contains the chain-of-thought reasoning, confidence score, and execution steps. The `<ReasoningTrace>` component in the frontend renders this automatically.

## License

MIT
