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
| Veritas | `0x702969d634b103f26F859aE658cD0405aa510FE3` |
| PredictionMarket | `0xf8F20dF2EaA923754b368e215f3B3f1646f4C480` |
| InsuranceVault | `0x7d18cd184f43A7c4302C20016E53BECe508ad7A8` |
| DisputeArbiter | `0x61d63870DAE005138721251c5cddf0D437A405bE` |

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

## Deploying

```bash
cd packages/contracts
export DEPLOYER_PRIVATE_KEY=0x...   # funded testnet wallet (~35 STT: 32 to fund Veritas + gas)
export PLATFORM_ADDRESS=0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
forge script script/Deploy.s.sol --rpc-url https://api.infra.testnet.somnia.network \
  --broadcast --slow --gas-estimate-multiplier 3000
node script/sync-addresses.mjs       # patches the SDK addresses from the broadcast
pnpm --filter @veritas/agent-template build
```

Two Somnia-specific gotchas, both learned the hard way:

- Pin `evm_version = "shanghai"` in `foundry.toml`. solc 0.8.30 defaults to cancun, and Somnia's EVM rejects cancun-era bytecode.
- Somnia charges far more gas for contract deployment than mainnet Ethereum, and its `eth_estimateGas` under-reports it. Use a large `--gas-estimate-multiplier` (3000) or the CREATE runs out of gas and consumes the whole limit. Block gas limit is ~500M, so the inflated per-tx limits are fine.

After deploying, verify all consumers point at the same Veritas:

```bash
RPC=https://api.infra.testnet.somnia.network
cast call <PredictionMarket> 'veritas()(address)' --rpc-url $RPC
cast call <InsuranceVault>  'veritas()(address)' --rpc-url $RPC
cast call <DisputeArbiter>  'veritas()(address)' --rpc-url $RPC
```

## Verdict Modes

- **Simple**: One LLM Parse Website call. The agent searches or scrapes, reasons, and returns YES/NO/UNRESOLVED in a single round trip. Cost: `quoteVerdictSimple()` = 0.33 STT.
- **Deliberated**: One evidence extraction per URL, then one inference synthesis. More expensive but supports multi-source reasoning. Cost: `quoteVerdictDeliberated(n)` = 0.03 + n x 0.30 + 0.21 STT.

## Receipts

After a verdict resolves, fetch the AI reasoning trace. The receipts service uses
a two-step lookup. First the index endpoint (requires the platform contract
address) returns a list of receipt file URLs, one per subcommittee member:

```
https://receipts.testnet.agents.somnia.host/agent-receipts?contractAddress=<platform>&requestId=<lastRequestId>
```

Then fetch any file in the returned `receipts` array to get the full execution
manifest. The agent's chain-of-thought lives at
`agentReceipt.steps[].outputs.result`, for example:

```json
{ "verdict": "YES", "confidence_score": 95, "answerable": true, "reasoning": "The context explicitly states ..." }
```

Use `getReceiptUrl(requestId)` to build the index URL. The `<ReasoningTrace>`
component does the two-step fetch and renders the verdict, real confidence score,
reasoning, and consensus metadata, and degrades to an empty state while a receipt
is still propagating.

## License

MIT
