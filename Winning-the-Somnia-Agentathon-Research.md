# Winning the Somnia Agentathon: 5 Ideas, 1 Champion

## TL;DR
- Build **Veritas: a Trustless AI Verdict Primitive for the Agentic L1**, a single reusable Solidity contract that takes any natural-language question + evidence URLs and returns a binding, consensus-verified verdict (plus an auditable Receipt) by chaining Somnia's LLM Parse Website, JSON API Request, and LLM Inference agents. Demo it powering three composable apps in one repo: a Sparkball/Twitch prediction market that auto-resolves, a parametric flight/weather insurance vault, and a DAO bounty-dispute resolver.
- Veritas wins because it is the missing "judgment" primitive for Paul Thomas's "market of markets" thesis and Peter Lipka's "Prediction Markets in the Age of AI Agents" keynote, demonstrates composability across three verticals (prediction markets, insurance, DAOs), is solo-buildable in three weeks with the existing single-shot agent API, and reverse-engineers every line of the Somnia Demo Engineer JD (prediction market resolvers, agent-to-agent interactions, reusable starter kits, video walkthroughs).
- Treat the on-chain LLM "yield-and-resume" tool-calling loop and MCP support as a Phase 2 / 2026 roadmap item rather than a Phase 1 demo dependency: today's verified primitives (deterministic LLM Inference, JSON API Request, LLM Parse Website, Reactivity, single-shot ABI-encoded callbacks) are already sufficient to win, and gesturing at the future SDK in the roadmap slide of the demo is the right amount of forward-looking ambition for a hackathon.

## Key Findings

### What Somnia actually shipped (Phase 1, verified)
Somnia Agents are live on Somnia Mainnet (chain 5031, SOMI) and Testnet (chain 50312, STT). The platform contract is `AgentRequester` at `0x5E5205CF39E766118C01636bED000A54D93163E6` on mainnet and `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` on testnet. The official model is **single-shot request/callback**, not a multi-turn tool-calling loop:
1. Your contract calls `createRequest{value: deposit}(agentId, callbackAddress, callbackSelector, payload)`.
2. An elected validator **subcommittee** (default size 3) runs the agent off-EVM but as part of consensus.
3. Each validator submits `(result, receipt, status, executionCost)`. On Majority or Threshold consensus, the platform calls back your `handleResponse(uint256 requestId, Response[] responses, ResponseStatus status, Request details)`.
4. Subcommittee members are paid the median of reported `executionCost`; leftover deposit is rebated.

Three base agents are curated and live:
- **JSON API Request** (~0.03 STT/SOMI per call): fetch any JSON API, ABI-decoded back into Solidity (e.g., `fetchUint(url, selector, decimals) -> uint256`).
- **LLM Inference** (~0.07 STT/SOMI): deterministic on-chain text generation. Fixed seeds + controlled temperature produce **byte-identical outputs across all validating nodes**, which is what makes consensus possible. The specific model, context window, and exact seed values are not published.
- **LLM Parse Website** (~0.10 STT/SOMI): headless browser + AI structured extraction (returns ABI-encoded structs from any URL).

Plus two roadmap-mentioned agents ("Find URL for Topic", "Idempotent Request") and the **Phase 2 (2026) roadmap** items: Custom User-Defined Agents and Full Agent SDK. **The `inferToolsChat` method, MCP-server tool calling, and the "yield-and-resume" on-chain tool loop described in the hackathon brief are not documented in current public Somnia docs.** They appear to be either a private preview spec, a Phase 2 roadmap feature, or both. Plan the demo around what is shipped today; reference tool calling in the "what's next" roadmap slide.

Critically: **Receipts** are a "signed manifest of intermediate computation steps" (HTTP calls, LLM reasoning, value extraction). They are *subjective per node* but cryptographically anchored, so a UI can render the chain-of-thought after consensus has agreed on the final answer. This is the single most under-exploited primitive for a "wow" demo.

### What Somnia leadership wants builders to build
- **Paul Thomas (Founder)**: "This concept gives us the market of markets," he wants permissionless, AI-resolved prediction markets covering everything from streamer milestones to local tournaments, plus parametric insurance and autonomous DeFi.
- **Peter Lipka (CEO)**, co-founder and former Chief Operating Officer of Improbable per Somnia's blog post *Meet the New Leadership Team Taking Somnia to the Agentic Future* ("As co-founder and Chief Operating Officer of Improbable, Peter helped grow the metaverse infrastructure company from a small team to a multi-billion dollar valuation following a landmark investment from SoftBank"), delivered the keynote "Prediction Markets in the Age of AI Agents" at Prediction Conference 2026, Las Vegas. Prediction markets are the canonical GTM use case.
- **April 2026 rebrand**: Somnia is now "the Agentic L1"; gaming, DeFi, and NFTs are explicitly demoted to "products of what that infrastructure enables."
- **The Prophecy Social case study** (live April 2026), per Somnia's official blog post *Prophecy Social: The Agentic L1 in Action*: "In less than a week, more than 5,000 users joined and over 2,000 prediction markets went live, every one of them created and resolved without manual intervention, handled end-to-end by Somnia agents." This proves the pattern works and sets the bar.
- **Sparkball**, developed by Opti Games (a team with backgrounds at Riot, Blizzard, and EA, including CTO Jeremy Wood, a founding World of Warcraft engineer from Blizzard, CFO/COO Artur Szczepanek formerly of Riot Games and Blizzard, and CCO Matt Dunn, a League of Legends writer from Riot Games and EA), is publicly committed to prediction markets as its *primary monetization model*. There is a direct partner-shaped hole in the ecosystem for a prediction-market resolver layer that integrates with Sparkball-style esports data.

### Reverse-engineering the Demo Engineer job description
The Ashby JD (`5c47b922-5bd8-49f2-a2a8-4c74014db491`), titled **Demo Engineer**, reports to the Head of DevRel and lists these literal bullets:
- "Build demo dApps that showcase Somnia's speed, cost, and execution."
- "Create **trading bot demos** that highlight Somnia's execution, the advantages of **onchain order books** and our agentic workflows."
- "Prototype agentic apps autonomous agents coordinating onchain, **prediction market resolvers, agent-to-agent interactions**."
- "Produce video walkthroughs and live coding sessions."
- "Develop **reusable starter kits and templates**."
- "Solid Solidity and EVM development experience."
- "Heavy use of AI tools as a core part of your development workflow."
- Nice to have: "CLOB/orderbook-based DEXs," "AI agent frameworks or autonomous agent design," "Video production."

A winning project must therefore: (a) be a prediction-market resolver / autonomous coordination piece, (b) ship as a reusable template, (c) be presented through a polished 2-5 minute video that doubles as a portfolio piece. This is the job, expressed as a hackathon.

### Patterns of AI x crypto hackathon winners (2024-2026)
Drawing on the Solana AI Hackathon (per SendAI's official winners announcement reported by PANews on January 16, 2025: "the 15-day Solana AI Hackathon attracted more than 400 projects to participate, 21 projects won awards, and the total prize money exceeded US$275,000," with overall winner The Hive taking $60,000), the Microsoft AI Agents Hackathon 2025 (per the official site at microsoft.github.io/AI_Agents_Hackathon: "over 18,000 developers registered and 570 project submissions spanning diverse use cases," with RiskWise winning Best Overall Agent at $20,000 for "its innovative approach to supply chain risk analysis"), the IQAI/EwhaChain Agent Arena, the Kong Agentic AI Hackathon, and the CoinGecko MCP Hackathon, the winning patterns are consistent and remarkably blunt:
1. **One sharp, demoable agent loop** beats a sprawling multi-feature platform. RiskWise won on one supply-chain risk analysis flow; GeckoPilot won on one conversational analyst flow.
2. **Composability over breadth**: ResearchOS won an MVP award by being a single agent framework applied to a knowledge-work domain, showcasing a reusable primitive rather than a vertical product.
3. **Token-gated or token-integrated agents** that close the economic loop (Rogue integrating its $RGE token into tiered access) score on both Innovation and Real-World Utility.
4. **Production polish**: dashboards, structured-output validation, monitoring, and caching are what separate "great demo" from "looks like a tutorial."
5. **A clearly articulated "impossible elsewhere" claim** in the README and video is rewarded by judges.
6. Encode Club specifically has a "build your startup" framing: judges reward projects that read as the seed of a venture, not a weekend toy.

### The white space uniquely enabled by Somnia
The combination of (i) deterministic, consensus-verified on-chain LLM inference, (ii) native JSON and website agents, (iii) sub-second finality with sub-cent fees, and (iv) on-chain Reactivity opens a class of applications that are either impossible or trust-broken on Ethereum, Base, and Solana:
- **Trustless AI oracles** for subjective truth (who won, was the food cold, did the streamer hit 1,000 subs).
- **Autonomous prediction-market creation and resolution** without a centralized resolver guild or UMA-style optimistic dispute window.
- **Parametric insurance** that triggers in seconds from natural-language policies, without a Chainlink + custom-adapter setup.
- **AI-judged DAO arbitration** where the verdict and the chain-of-thought are both on-chain artifacts.
- **A2A negotiation and coordination** with audit receipts of the reasoning.
- **Dynamic NFTs and games** where the brain of an NPC is a consensus-validated LLM call.
- **Content moderation and credit underwriting** as a public good, with reasoning anchored on-chain.

On Ethereum or Base, putting an LLM inference behind consensus requires either zkML (slow and expensive), TEEs (trust the manufacturer), or optimistic rollups (slow). On Somnia, it is a single payable Solidity call.

## Details

### The Five Candidate Ideas

**1. Veritas, a Trustless AI Verdict Primitive.** A single Solidity contract `Veritas.requestVerdict(string question, string[] evidenceUrls, address payoutTarget, bytes payoutCalldata)` that chains Parse Website + JSON API + LLM Inference to return a binding `(verdict, confidence, reasoningHash)`. Shipped with three reference apps reusing the same primitive: a Sparkball/Twitch prediction market, a parametric flight-delay insurance vault, and a Gitcoin-style bounty-dispute resolver. Hits Functionality, Agent-First, Innovation, and Autonomous Performance simultaneously, plus the Demo Engineer JD's "reusable starter kit" bullet. **Solo feasibility: high.** Score: 9/10 across all judging criteria.

**2. Polymind, Permissionless "Market of Markets" Factory.** A Polymarket-on-steroids where any user can prompt-create a market ("Will Sparkball season 3 finals MVP be Kael?"), agents discover canonical data sources, set initial odds, and auto-resolve. Closest to Paul Thomas's verbatim "market of markets" framing. Risk: Prophecy Social already covers a similar surface, so the builder must out-engineer or pick a specific vertical (gaming/esports). **Solo feasibility: medium.** Score: 8.5/10. Strong, but more crowded.

**3. Helios, Permissionless Parametric Insurance Vaults.** Anyone writes an insurance policy in natural language ("pay 10 STT if my BA1234 flight tomorrow is delayed more than 3 hours"). The agent fetches the policy data via JSON API and pays out automatically. Beautiful demo, real real-world utility, lower novelty than Veritas because it is a single vertical. **Solo feasibility: high.** Score: 8/10. Becomes a sub-app of Veritas.

**4. AgentForge, A2A Agent Marketplace.** A registry where autonomous on-chain agents publish capabilities, discover each other via LLM-driven semantic search, negotiate prices in natural language, and pay each other. Most technically ambitious; depends on the Phase 2 tool-calling SDK to feel complete; risky for a 3-week solo build. **Solo feasibility: low-medium.** Score: 8/10 on novelty, 6/10 on feasibility.

**5. Praxis, Trustless Agentic Hedge Fund.** Users deposit, an on-chain LLM portfolio manager runs strategies, reads news via Parse Website, fetches prices via JSON API, executes swaps on QuickSwap or Standard Protocol's CLOB. Decisions are consensus-verified, so depositors trust the strategy is not being torched off-chain. Plays perfectly to the builder's stated background (trading copilots, agentic hedge funds) and to the JD's "trading bot demos" + "CLOB" nice-to-haves. Risk: regulatory optics, and the wow-factor is hidden inside trading mechanics. **Solo feasibility: medium.** Score: 8.5/10. Strong runner-up.

### The Champion: Veritas

**Why it wins.** Veritas is the *primitive* that Polymind, Helios, and any Sparkball-integrated prediction layer all need. Building the primitive plus three reference apps demonstrates the composability, autonomy, and innovation the judging criteria explicitly reward, and it lets the demo video do something no other submission will do: show the same on-chain contract resolving a Twitch bet, paying out a flight-delay insurance claim, and settling a DAO bounty dispute in the same five minutes. That moment is the "wow."

**Why Somnia hires the builder.** The Demo Engineer JD is, almost literally, a job ad for the person who built Veritas. It asks for prediction-market resolvers (Veritas does this), agent-to-agent interactions (the three apps consume Veritas as an A2A counterparty), reusable starter kits (Veritas ships as a Foundry template + npm package), trading bot demos (the Praxis variant in the roadmap), Solidity skill (heavy contract work), AI-tools-first workflow (the README brags about Claude Code + prompt caching + MCP), video walkthroughs (deliverable), and "good instincts for what makes a demo compelling vs. forgettable" (the three-apps-one-primitive demo is exactly that instinct). Veritas is the artifact the builder shows in the interview to skip the take-home.

**Why it is only possible on Somnia.** A "trustless AI judge" needs four things at once: (i) AI inference that is deterministic enough for consensus, (ii) data fetching that is part of validator consensus, (iii) sub-second finality so resolution feels live, and (iv) sub-cent fees so micro-policies are economic. Ethereum, Base, Solana, and Monad each fail at least two. On Somnia, it is one payable call to `AgentRequester`, with the LLM reasoning anchored in a signed Receipt that the UI can render as a chain-of-thought verdict.

**Architecture sketch.**
- **Contracts**
  - `Veritas.sol` (the primitive). Exposes `requestVerdict(...)` which encodes a multi-step payload, calls `AgentRequester.createRequest` against Parse Website to grab each evidence URL, stores the parsed text, then calls LLM Inference with a structured prompt template, then writes `(verdict bool, confidence uint8, reasoningHash bytes32)` to storage and dispatches `payoutCalldata` to `payoutTarget`.
  - `VerdictReceipt.sol`. ERC-1155 (or pure storage) that pins the receipt hash and exposes a `getReasoning(verdictId)` view that points the UI to the validator-signed manifest URL.
  - `PredictionMarket.sol`, `InsuranceVault.sol`, `DisputeArbiter.sol`. Three minimal consumers, each ~150 lines, that lock funds and accept a Veritas verdict.
  - **Reactivity hook**: a `SomniaEventHandler` subscription on each consumer fires `requestVerdict` automatically when the resolution deadline arrives or a key event is emitted (e.g., Sparkball `MatchEnded`). This is the "agents triggering agents" autonomy moment.
- **Agents used (Phase 1, verified)**
  - LLM Parse Website (~0.10 SOMI/STT per evidence URL).
  - JSON API Request (~0.03 SOMI/STT per fact lookup).
  - LLM Inference (~0.07 SOMI/STT per verdict synthesis).
  - Optional: chain a second LLM Inference call for "confidence + dissent" framing.
- **Frontend**: Next.js 15 + Vercel AI SDK on the marketing/landing page; viem + wagmi for the three reference apps; a shared `<ReasoningTrace>` React component that pulls the validator-signed Receipt JSON and renders the chain-of-thought as a collapsible audit panel. Postgres + pgvector index of past verdicts for a "judge precedent" search demo, which the LLM prompt template references.
- **Backend**: deliberately thin. A small Node service caches Receipt manifests and exposes `/receipt/:id` for the UI; no off-chain decision logic, no centralized resolver. That thinness *is* the pitch.
- **Token economics**: a `VERITAS` fee token is unnecessary and would distract; charge in STT/SOMI and rebate a slice to the Veritas treasury for the Phase 2 SDK roadmap. Keep the token slide aspirational.

**Three-week build plan, mapped to Encode Club checkpoints.**
- **Week 1 (May 20-26, 2026): Primitive.** Day 1-2: stand up Foundry + Vercel + viem; deploy a hello-world `AgentRequester` consumer on testnet (chain 50312) and verify a JSON API round-trip. Day 3-5: build `Veritas.sol`, the multi-step payload encoder, the Receipt parser, and a unit test suite using Foundry fork tests against the testnet platform contract. Day 6-7: ship the reference Prediction Market consumer + minimal frontend.
- **Week 2 (May 27-June 2): Two more verticals + Reactivity.** Day 8-10: ship the Insurance Vault and Dispute Arbiter consumers; reuse 90% of the frontend via a shared `useVerdict()` hook. Day 11-12: wire Reactivity subscriptions so each consumer self-triggers (the autonomy moment). Day 13-14: build the `<ReasoningTrace>` component and the verdict-precedent pgvector index.
- **Week 3 (June 3-11, submission June 11): Polish + video.** Day 15-17: harden edge cases (validator timeouts, partial-consensus paths, fund-rebate UX), add monitoring (Pino logs + a tiny dashboard), publish the Foundry template as an npm package `@veritas/agent-template`. Day 18-19: write the README as a Somnia-style developer guide (it should look like an official tutorial; this is a hiring signal). Day 20-21: record a 4-minute Loom-style demo video with the three-apps-one-primitive arc, end with the Phase 2 roadmap slide that gestures at `inferToolsChat` and MCP support. Submit June 11.

**Demo video narrative (4 minutes).**
- 0:00-0:20 Hook: split-screen Twitch stream, a flight tracker page, and a DAO bounty board. Voiceover: "Three problems, one missing primitive: a judge you can trust."
- 0:20-1:00 Demo 1: user prompts a market on a Sparkball finals MVP question. Veritas fetches the match data, parses the post-game recap, returns the verdict with a confidence score. Payout transaction lands in ~600ms.
- 1:00-1:40 Demo 2: same Veritas contract resolves a parametric flight-delay insurance policy from a publicly reachable flight-status API. Same primitive, different consumer.
- 1:40-2:20 Demo 3: a DAO bounty dispute. Both parties submit evidence URLs; Veritas reads, reasons, and returns a non-binding-but-binding verdict that auto-settles the escrow.
- 2:20-3:10 Under the hood: open the `<ReasoningTrace>` panel. Show the validator-signed Receipt, the chain-of-thought, the consensus snapshot. **This is the wow moment** because no other chain can show that artifact.
- 3:10-3:40 Roadmap: gesture at Phase 2 tool calling (inferToolsChat / MCP) and an A2A future where Veritas verdicts become inputs to other autonomous agents.
- 3:40-4:00 Close: GitHub link, npm template, "I built this in three weeks and I want to do it full time at Somnia."

**The Sparkball partnership ambush.** Reach out to Opti Games (Sparkball's studio) via the Somnia Discord on day 1 with a one-line message: "I'm building a prediction-market resolver primitive for the Agentathon; can I integrate it as a reference demo for your in-game markets?" Even a soft "sure, here's our match-data API" is a partnership signal that lands well with judges and BD.

**Risks and mitigations.**
- *Agent prototype instability.* Somnia Agents are Phase 1 prototype; expect timeouts and consensus failures. **Mitigation**: design Veritas with a `verdictPending -> verdictFailed -> retry` state machine, surface this in the UI as honest engineering, and add a `Threshold` consensus fallback path so a 2-of-3 validator agreement still resolves the verdict.
- *LLM non-determinism in practice.* Subtle floating-point or model-version drift can break consensus. **Mitigation**: keep prompts short, structured (JSON schema in the prompt), and ask for binary or single-integer outputs that are robust to token-sampling drift.
- *Receipt size / cost.* Parse Website is the most expensive agent at ~0.10 STT/SOMI per URL. **Mitigation**: cap evidence URLs at 3 per verdict in the demo, charge users a small `requestFee` that covers the budget, and surface the cost in the UI as a transparency win.
- *Phase 2 dependency leak.* If the brief truly assumes `inferToolsChat` and MCP, hedging the demo to Phase 1 may look conservative. **Mitigation**: ship a clearly labeled `VeritasV2` interface stub on a feature branch showing how the same contract would consume tool calls when Phase 2 lands, and demo it at the end of the video as the roadmap.
- *Prophecy Social comparison.* Prophecy Social already does AI-resolved prediction markets at scale (more than 5,000 users and over 2,000 markets in under a week, per the Somnia blog). **Mitigation**: position Veritas as the *primitive* others build on, including a hypothetical Prophecy Social V2, and showcase three verticals to prove it.

## Recommendations
1. **Pick Veritas. Start today.** The hackathon runs May 20-June 11, so move immediately.
2. **Get test tokens immediately.** Join the Somnia Discord, ping DevRel in the dev channel, request STT, and ask explicitly whether `inferToolsChat` or MCP-server support is reachable on testnet. The answer determines whether the V2 stub is real or aspirational.
3. **Ship a working Phase 1 demo by end of Week 1.** A working end-to-end verdict against the testnet platform contract before Week 2 is the single biggest predictor of hackathon success. Do not start Week 2 until one happy-path verdict round-trips.
4. **Lean into Receipts.** They are the most underused primitive on Somnia and the single best wow moment. Build the `<ReasoningTrace>` component before the third consumer app, not after.
5. **Treat the README as the interview.** Write it in the voice of an official Somnia tutorial, with diagrams, contract addresses, fund-flow math, and a "Why only on Somnia" section. Hiring managers will read the README, not the code.
6. **Send the demo link directly to the Demo Engineer hiring manager and to George Walker on LinkedIn the day after submission**, with one line: "I built a reusable prediction-market and dispute-resolution primitive on Somnia Agents for the Agentathon. Three reference apps, one contract, full Receipts. Would love 15 minutes."
7. **Benchmarks that would change the plan.**
   - If Somnia DevRel confirms `inferToolsChat` is live on testnet early, pivot the V2 stub from "aspirational" to "the third reference app," and replace the DAO dispute consumer with an A2A negotiation demo. That single feature would be the strongest pure-novelty play.
   - If Sparkball/Opti Games or another Dream Catalyst game commits to integrating Veritas as a reference partner, lean the marketing entirely on gaming prediction markets and rename the project to something more evocative.
   - If a competitor publicly previews a similar trustless-judge primitive before submission, double down on the parametric insurance vertical and rebrand toward a Helios-flavored finish.

## Caveats
- The hackathon brief references `inferToolsChat`, on-chain MCP tool calls, and a "yield-and-resume" agentic loop where the LLM returns ABI-encoded calldata that the contract executes mid-conversation. Independent research against public Somnia documentation could not verify any of these features as of late May 2026; the official Phase 1 model is single-shot request/callback, and the Full Agent SDK / Custom User-Defined Agents are explicitly Phase 2 / 2026 roadmap. Either the brief reflects a private preview spec, or these features are coming during the hackathon window. Confirm with Somnia DevRel before betting demo scope on them.
- Per-agent prices of 0.03 SOMI/STT for JSON API are verified from the Solidity tutorial; the 0.07 and 0.10 figures for LLM Inference and Parse Website are referenced in the brief and consistent with the docs structure but were not directly fetched in this research pass.
- The specific open-source model running on Somnia validators (Llama, Qwen, DeepSeek, or other), its context window, and the exact seed/temperature parameters are not publicly disclosed. The Receipt is the API contract; the model is an implementation detail.
- Prophecy Social, per Somnia's official blog (*Prophecy Social: The Agentic L1 in Action*), is the closest existing comparable to a Veritas application: "more than 5,000 users joined and over 2,000 prediction markets went live, every one of them created and resolved without manual intervention." It is, however, a vertical app rather than the underlying primitive Veritas would provide.
- Encode Club judging weighs Functionality, Agent-First Design, Innovation, and Autonomous Performance; the Veritas pitch is strongest on Innovation and Autonomous Performance but is *least* differentiated on raw Functionality, where multiple submissions will ship working dApps. Polish, Receipts visualization, and the three-apps-one-primitive narrative are the differentiation lever.
