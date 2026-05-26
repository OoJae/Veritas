# Veritas: Complete Build Plan and Technical Specification

A trustless AI verdict primitive for the Somnia Agentic L1. One reusable Solidity contract that takes a natural language question plus evidence, returns a binding consensus-verified verdict with an auditable Receipt, and powers three reference apps: a prediction market, a parametric insurance vault, and a DAO dispute resolver.

Style rule for this entire repo: no em dashes anywhere, in code, comments, UI copy, commit messages, or docs. Use commas, colons, parentheses, or two sentences.

Status as of writing: Tuesday, May 26, 2026. Project-creation checkpoint (May 24) has passed, so confirm your project exists in the Encode dashboard before anything else. Roughly 16 days remain to the June 11 finale.

---

## 0. The one technical truth everything depends on

Somnia agent invocations are asynchronous. This is the single most important thing to internalize, and the thing most likely to be built wrong if forgotten.

You do not write `string memory text = parseWebsite(url);` and get a value back. Instead:

1. Your contract calls `platform.createRequest{value: deposit}(agentId, address(this), this.someCallback.selector, payload)` and immediately gets back a `requestId`.
2. A validator subcommittee runs the agent off-chain over the next several seconds.
3. When consensus is reached, the platform calls your `someCallback(requestId, responses, status, details)` in a separate transaction.

Consequences for Veritas:

- Veritas must be a state machine. Each verdict has an internal `verdictId` and a `stage`. Each agent callback advances the stage and may fire the next agent request.
- You must store a mapping from the platform's `requestId` to your internal `verdictId`, because callbacks arrive keyed by `requestId`.
- The contract must hold STT (testnet) or SOMI (mainnet) to pay for agent calls, since the contract is the caller. Rebates flow back to the contract, so it must implement `receive()`.
- A single verdict can span multiple transactions and multiple seconds. The UI must reflect pending, resolved, and failed states honestly.

Keep this section open while building the contracts.

---

## 1. What we are building, precisely

### The primitive

`Veritas.sol` exposes a single entry point:

```
function requestVerdict(
    string  calldata question,        // natural language yes/no or numeric question
    string[] calldata evidenceUrls,   // 0 to N source URLs (capped at 3 in demo)
    VerdictMode mode,                 // Simple or Deliberated
    address payoutTarget,             // consumer contract to notify on resolution
    bytes   calldata payoutCalldata   // calldata to execute on payoutTarget when resolved
) external payable returns (uint256 verdictId);
```

When the verdict resolves, Veritas writes `(bool verdict, uint8 confidence, bytes32 reasoningRef)` and calls `payoutTarget` with `payoutCalldata` so the consumer can settle funds. The consumer never has to know anything about Somnia agents. It just trusts Veritas.

### Two verdict modes

- Simple mode: one LLM Parse Website `ExtractString` call. The agent searches or scrapes, reasons, and returns a constrained answer (for example one of `["YES","NO","UNRESOLVED"]`) in a single round trip. One agent call, one callback. This is the robust happy path and the core of the demo.
- Deliberated mode: a sequence. One Parse Website `ExtractString` per evidence URL to extract a short summary fact, accumulated on-chain, then one final LLM Inference `inferString` (or `inferNumber`) call to synthesize a verdict with chain-of-thought. More agent calls, more composability to show off, more failure surface. Use it for the showcase, not the smoke test.

### The three reference apps (consumers)

Each is a thin contract (around 150 lines) that locks funds and accepts a Veritas verdict. They prove the same primitive is reusable across verticals.

- `PredictionMarket.sol`: users stake YES or NO on a question, Veritas resolves it, winners claim. Demo question can be a streamer milestone or an esports match outcome.
- `InsuranceVault.sol`: a policy written in natural language ("pay 10 STT if flight BA1234 on date D is delayed over 3 hours"). Veritas checks a public status source and triggers payout.
- `DisputeArbiter.sol`: two parties submit evidence URLs for a bounty or escrow dispute. Veritas reads both and returns a settlement verdict that releases escrow.

### The wow layer

Receipts. After consensus, the platform exposes a signed manifest of the execution steps (HTTP calls, the LLM prompt, the chain-of-thought reasoning, the extracted value) at the receipts service. A `<ReasoningTrace>` React component fetches and renders this so a viewer can see exactly how the on-chain judge reasoned. No other chain can show that artifact for an on-chain AI decision. Build this before the third consumer app.

---

## 2. Architecture

### Contracts

```
packages/contracts/src/
  Veritas.sol              // the primitive + state machine
  interfaces/
    IVeritas.sol           // what consumers import
    IAgentRequester.sol    // the Somnia platform interface
    IAgents.sol            // base-agent method signatures for selector encoding
  types/
    VeritasTypes.sol       // enums + structs
  consumers/
    PredictionMarket.sol
    InsuranceVault.sol
    DisputeArbiter.sol
  mocks/
    MockAgentRequester.sol // local test double that calls back synchronously
```

### Somnia platform facts (from the agent docs, verified)

- Platform contract `AgentRequester`:
  - Testnet (chain 50312, currency STT): `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
  - Mainnet (chain 5031, currency SOMI): `0x5E5205CF39E766118C01636bED000A54D93163E6`
- Testnet RPC: `https://api.infra.testnet.somnia.network`. Mainnet RPC: `https://api.infra.mainnet.somnia.network`.
- Faucet: the Somnia testnet homepage. Get STT before building.
- Core call: `createRequest(agentId, callbackAddress, callbackSelector, payload) payable returns (uint256 requestId)`.
- Advanced call: `createAdvancedRequest(agentId, callbackAddress, callbackSelector, payload, subcommitteeSize, threshold, consensusType, timeout)`.
- Deposit helpers: `getRequestDeposit()` (the floor) and `getAdvancedRequestDeposit(subSize)`.
- Callback signature your contract must expose:
  ```
  function handleResponse(
      uint256 requestId,
      Response[] memory responses,
      ResponseStatus status,
      Request memory details
  ) external;
  ```
  You can name the function anything as long as the selector you pass matches and the parameter types are exact.
- `ResponseStatus`: None 0, Pending 1, Success 2, Failed 3, TimedOut 4.
- `ConsensusType`: Majority 0, Threshold 1.
- `Response` struct fields: `validator`, `result` (bytes), `status`, `receipt` (uint256 pointer), `timestamp`, `executionCost`.
- Defaults: `minPerAgentDeposit` 0.01, `defaultSubcommitteeSize` 3, `defaultThreshold` 2, `defaultTimeout` 15 minutes.
- Security musts: verify `msg.sender == address(platform)` in the callback, track pending requests in a mapping, handle all statuses, check `responses.length` before decoding, implement `receive()` for rebates.

### Base agent method signatures (for payload encoding)

JSON API Request (per-agent price about 0.03):
```
fetchString(string url, string selector) returns (string)
fetchUint(string url, string selector, uint8 decimals) returns (uint256)
fetchInt(string url, string selector, uint8 decimals) returns (int256)
fetchBool(string url, string selector) returns (bool)
fetchStringArray(string url, string selector) returns (string[])
fetchUintArray(string url, string selector, uint8 decimals) returns (uint256[])
```

LLM Inference (per-agent price about 0.07):
```
inferString(string prompt, string system, bool chainOfThought, string[] allowedValues) returns (string)
inferNumber(string prompt, string system, int256 minValue, int256 maxValue, bool chainOfThought) returns (int256)
inferChat(string[] roles, string[] messages, bool chainOfThought) returns (string)
```
Note: `inferToolsChat` (MCP and on-chain tool calling, the yield-and-resume loop) is referenced in the hackathon brief but not confirmed in current public docs. Treat it as a roadmap item. Do not make the core demo depend on it. Confirm availability with DevRel before using it.

LLM Parse Website (per-agent price about 0.10):
```
ExtractString(string key, string description, string[] options, string prompt, string url, bool resolveUrl, uint8 numPages) returns (string)
ExtractANumber(string key, string description, uint256 min, uint256 max, string prompt, string url, bool resolveUrl, uint8 numPages) returns (uint256)
```
`resolveUrl = true` means search the domain. `resolveUrl = false` means scrape the exact URL (numPages capped at 1). The agent also returns hidden `reasoning`, `answerable`, and `confidence_score` fields in the receipt, which is gold for the ReasoningTrace UI.

### Deposit math (fund the contract correctly or requests sit idle and time out)

The floor alone is not enough. Runners skip requests whose per-agent budget is below the agent price. Send floor plus price times subcommittee size.

- Floor (default subSize 3): `getRequestDeposit()` returns about 0.03.
- Simple verdict (one ExtractString): about 0.03 + 0.10 x 3 = 0.33 STT.
- LLM Inference call: about 0.03 + 0.07 x 3 = 0.24 STT.
- JSON API call: about 0.03 + 0.03 x 3 = 0.12 STT.
- Deliberated verdict (3 Parse + 1 Inference): about 3 x 0.33 + 0.24 = 1.23 STT.

Build a view function `quoteVerdict(VerdictMode mode, uint256 numEvidenceUrls) returns (uint256)` that computes the required `msg.value` so the frontend can fund `requestVerdict` correctly. Sending extra is fine, the surplus is rebated.

### Consensus choice

Use Majority consensus for verdicts. Deterministic LLM inference means identical inputs produce byte-identical outputs across validators, which is exactly what Majority needs. If determinism proves shaky in practice during testing (model drift, sampling noise), fall back to `createAdvancedRequest` with subSize 5, threshold 3, `ConsensusType.Threshold`, and aggregate in the callback (majority vote of the YES/NO results, or median for numeric). This fallback is also a strong robustness story for the judges, so document it either way.

### Frontend

- Next.js 15 (app router), TypeScript, Tailwind, shadcn/ui.
- wagmi + viem with a Somnia testnet chain config.
- Routes: `/` (landing that explains the primitive), `/markets`, `/insurance`, `/disputes`.
- Shared `useVerdict()` hook: submits `requestVerdict`, watches for the `VerdictResolved` event, exposes `{ stage, verdict, confidence, reasoningRef }`.
- Shared `<ReasoningTrace requestId={...} />` component: fetches the receipt manifest and renders the step timeline and chain-of-thought.
- Optional: a verdict-precedent search powered by Postgres + pgvector, surfaced as "similar past verdicts," referenced in the LLM prompt template.

### Backend (deliberately thin)

- A small service (Next.js route handlers are fine, no separate server needed) that caches receipt manifests and exposes `GET /api/receipt/:requestId`.
- Receipts service base URLs: testnet `https://receipts.testnet.agents.somnia.host`, mainnet `https://receipts.mainnet.agents.somnia.host`. Fetch with `?requestId=...`.
- No off-chain decision logic. The thinness is the pitch: the judgment lives on-chain.

### Auto-triggering (the autonomy moment)

The goal is verdicts that fire themselves when a deadline passes or an event is emitted, not verdicts a human clicks to resolve. Two options:

- Preferred: Somnia on-chain Reactivity, so a consumer self-triggers `requestVerdict` on a deadline or an emitted event. The exact Reactivity API is not in the agent docs in hand, so confirm it with DevRel early.
- Fallback if Reactivity is not ready: a permissionless `poke(verdictId)` function that anyone (or a tiny off-chain cron) can call once the deadline passes. This still demonstrates autonomy (no privileged resolver) and removes a hard dependency.

Decide this by the end of Sprint 1 based on the DevRel answer.

---

## 3. Veritas.sol state machine (reference shape)

This is pseudocode to anchor the design, not final code. Claude Code will flesh it out.

```solidity
enum VerdictMode { Simple, Deliberated }
enum Stage { None, FetchingEvidence, Reasoning, Resolved, Failed }

struct Verdict {
    address requester;
    string question;
    string[] evidenceUrls;
    VerdictMode mode;
    address payoutTarget;
    bytes payoutCalldata;
    Stage stage;
    uint256 evidenceCursor;     // which URL we are on in Deliberated mode
    string[] gatheredEvidence;  // short extracted summaries
    bool verdict;
    uint8 confidence;
    bytes32 reasoningRef;       // receipt pointer for the final reasoning step
    uint256 lastRequestId;      // platform requestId we are awaiting
}

mapping(uint256 => Verdict) public verdicts;        // verdictId => Verdict
mapping(uint256 => uint256) public requestToVerdict; // platform requestId => verdictId
uint256 public nextVerdictId;

// 1) entry: create the first agent request, store mappings, return verdictId
function requestVerdict(...) external payable returns (uint256 verdictId) { ... }

// 2) callback: only platform, look up verdictId, advance state machine
function handleAgentResponse(
    uint256 requestId,
    Response[] memory responses,
    ResponseStatus status,
    Request memory details
) external {
    require(msg.sender == address(platform), "only platform");
    uint256 verdictId = requestToVerdict[requestId];
    // handle Failed / TimedOut -> Stage.Failed, optional retry
    // Simple mode: decode YES/NO -> _resolve(verdictId, ...)
    // Deliberated mode:
    //   if still gathering evidence: store summary, advance cursor,
    //     fire next Parse request OR move to Reasoning and fire Inference
    //   if reasoning came back: decode verdict -> _resolve(...)
}

// 3) resolve: write result, pin reasoningRef, dispatch payoutCalldata to payoutTarget
function _resolve(uint256 verdictId, bool result, uint8 confidence, uint256 receiptPtr) internal { ... }

receive() external payable {} // accept rebates
```

Events to emit (the frontend and demo depend on these):
`VerdictRequested(verdictId, requester, mode)`,
`EvidenceGathered(verdictId, index, summary)`,
`VerdictResolved(verdictId, result, confidence, reasoningRef)`,
`VerdictFailed(verdictId, reason)`.

---

## 4. Repository layout (pnpm + Turborepo monorepo)

```
veritas/
  package.json            // pnpm workspace + turbo
  turbo.json
  pnpm-workspace.yaml
  README.md               // write this like an official Somnia tutorial
  packages/
    contracts/            // Foundry project
      foundry.toml
      src/ ...            // see section 2
      test/ ...          // Foundry tests
      script/Deploy.s.sol
    sdk/                  // @veritas/agent-template, the reusable npm package
      src/index.ts        // viem helpers, ABIs, quoteVerdict, useVerdict-friendly exports
  apps/
    web/                  // Next.js 15 frontend
      app/(routes) ...
      components/ReasoningTrace.tsx
      hooks/useVerdict.ts
      lib/somnia.ts        // chain config + addresses
  services/
    receipts/             // optional, or fold into apps/web/app/api
```

---

## 5. Build plan, mapped to the remaining sprint

Three sprints across roughly 16 days (May 26 to June 11). Confirm the exact Checkpoint 2 date in the Encode dashboard; the "How to win a hackathon" workshop is May 29 and the finale is June 11.

### Sprint 1 (May 26 to May 31): the primitive works end to end on testnet

Goal: one happy-path verdict round trips against the real testnet platform contract. Do not start Sprint 2 until this is green.

- [ ] Confirm the project exists in the Encode dashboard. Join the Somnia Discord and Telegram.
- [ ] Ask DevRel three questions: is `inferToolsChat` and MCP reachable on testnet, what is the on-chain Reactivity API, and are the 0.07 and 0.10 agent prices current.
- [ ] Install Foundry. Scaffold the monorepo (pnpm + turbo). Create the Foundry package.
- [ ] Get STT from the faucet to your deployer wallet.
- [ ] Write `IAgentRequester.sol`, `IAgents.sol`, `VeritasTypes.sol`.
- [ ] Deploy a minimal "hello agent" consumer that calls JSON API `fetchUint` for a price, and confirm the callback fires on testnet. This validates your whole pipeline cheaply (JSON is the cheapest agent).
- [ ] Write `MockAgentRequester.sol` that calls back synchronously, so unit tests do not need the network.
- [ ] Build `Veritas.sol` Simple mode only: one `ExtractString` call, the request-to-verdict mapping, the callback, `_resolve`, `quoteVerdict`, `receive()`.
- [ ] Foundry unit tests against the mock: Success, Failed, TimedOut, empty responses, only-platform access control, payout dispatch.
- [ ] Deploy Veritas + `PredictionMarket.sol` to testnet. Resolve one real market end to end. Capture the requestId and view its receipt in the explorer.

### Sprint 2 (June 1 to June 6): three verticals, Deliberated mode, and the wow layer

- [ ] Implement Deliberated mode (multi-URL evidence gathering plus final Inference synthesis) with the cursor logic.
- [ ] Build `InsuranceVault.sol` and `DisputeArbiter.sol`, each reusing `IVeritas`.
- [ ] Frontend: Next.js scaffold, wagmi/viem Somnia config, the three routes, the shared `useVerdict()` hook.
- [ ] Build `<ReasoningTrace>`: fetch the receipt manifest, render the step timeline and the LLM chain-of-thought. This is the demo centerpiece, so do it before polishing the third app.
- [ ] Wire auto-triggering: Reactivity if confirmed, otherwise the permissionless `poke()` fallback.
- [ ] Publish `@veritas/agent-template` (the SDK package) with ABIs, addresses, `quoteVerdict`, and a copy-paste consumer example.
- [ ] Hit Checkpoint 2 with a live demo: at least one app resolving a real verdict on testnet with the reasoning trace visible.

### Sprint 3 (June 7 to June 11): harden, document, film, submit

- [ ] Edge cases: validator timeouts, partial consensus, the Threshold fallback path, rebate accounting, insufficient-funding guard in `requestVerdict`.
- [ ] Light monitoring: structured logs, a tiny status dashboard for pending and resolved verdicts.
- [ ] Write the README as an official-style Somnia tutorial: architecture diagram, contract addresses, the deposit fund-flow math, a "Why only on Somnia" section, and quickstart. Hiring managers read the README, not the code.
- [ ] Record the 4-minute demo video (narrative in section 6).
- [ ] Final testnet deployment, public GitHub repo, submit before June 11.
- [ ] Optional stretch if time allows: a mainnet deployment of the primitive with one real SOMI verdict, which reads far stronger to judges.

---

## 6. Demo video narrative (target 4 minutes)

- 0:00 to 0:20. Hook on split screen: a livestream, a flight tracker, a DAO bounty board. "Three problems, one missing primitive: a judge you can trust."
- 0:20 to 1:00. Demo 1, prediction market. Prompt a market on a match or streamer milestone. Veritas fetches and reasons. Payout lands fast. Show the transaction.
- 1:00 to 1:40. Demo 2, parametric insurance. The same Veritas contract resolves a flight-delay policy from a public status source. Same primitive, different consumer.
- 1:40 to 2:20. Demo 3, DAO dispute. Both parties submit evidence URLs. Veritas reads both and settles the escrow.
- 2:20 to 3:10. Under the hood. Open `<ReasoningTrace>`. Show the validator-signed receipt, the chain-of-thought, the consensus snapshot. This is the wow moment, because no other chain shows this artifact for an on-chain AI decision.
- 3:10 to 3:40. Roadmap. Gesture at Phase 2 tool calling (`inferToolsChat`, MCP) and an agent-to-agent future where Veritas verdicts feed other autonomous agents.
- 3:40 to 4:00. Close. GitHub link, the npm template, and a direct line: "I built this in under three weeks and I want to do it full time at Somnia."

---

## 7. Risk register and mitigations

- Agent prototype instability (timeouts, consensus failures). Mitigation: a `Pending -> Failed -> retry` state path, surfaced honestly in the UI, plus the Threshold fallback so a 2-of-3 agreement still resolves.
- LLM non-determinism breaking Majority consensus. Mitigation: short structured prompts, constrained outputs (`allowedValues` of YES/NO/UNRESOLVED, or `inferNumber` bounds), and the Threshold fallback with aggregation.
- Parse Website cost (about 0.10 per URL, the priciest agent). Mitigation: cap evidence at 3 URLs in the demo, charge a `requestFee` that covers the budget, and surface the cost in the UI as a transparency win.
- Phase 2 dependency leak. If the brief assumes `inferToolsChat`/MCP and they are not on testnet, do not block on them. Mitigation: ship a clearly labeled `VeritasV2` interface stub on a branch showing how the same contract would consume tool calls, and present it as roadmap in the video.
- Prophecy Social comparison (an existing AI-resolved prediction market app on Somnia). Mitigation: position Veritas as the primitive others build on, and prove it with three verticals rather than one.
- Time. 16 days solo is tight. Mitigation: Simple mode plus one polished consumer plus the reasoning trace is already a winning submission. Deliberated mode and the second and third consumers are upside, not prerequisites.

---

## 8. Open questions to confirm with Somnia DevRel (ask on day one)

1. Is `inferToolsChat` (and MCP-server tool calling) reachable on testnet today, or is it Phase 2?
2. What is the on-chain Reactivity API, and can a contract subscribe to a deadline or an event to self-trigger a call?
3. Are the per-agent prices (0.07 LLM Inference, 0.10 Parse Website) current, and is the default subcommittee size still 3?
4. Which LLM model backs the inference agent, and what are the determinism guarantees in practice for short constrained prompts?
5. Is there a recommended pattern for a contract that needs to make several sequential agent calls within one logical operation?

The answers to 1 and 2 decide whether the auto-trigger and the V2 stub are real or aspirational. Everything else in this plan stands regardless.

---

## 9. Definition of done

- Public GitHub repo with the monorepo, tests passing, and a tutorial-grade README.
- Veritas plus at least one consumer deployed to testnet, with a real resolved verdict and a viewable receipt.
- The `<ReasoningTrace>` component rendering a real chain-of-thought.
- A 4-minute demo video following the section 6 arc.
- The `@veritas/agent-template` package published or publishable, so the work reads as a reusable starter kit.
- Submitted in the Encode dashboard before the June 11 finale.
