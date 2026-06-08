# Session Notes — June 8, 2026

Full session log for the Veritas project. Covers bug fixes, contract redesigns, new features, and end-to-end tests across all three verticals.

---

## 1. Market Bug Fixes

### Problem: "Market not found" on Status Page

The status page at `/status` iterates verdicts by their global `verdictId` and linked to `/markets/${verdictId}`. But `verdictId` and `marketId` are separate counters — the Veritas contract assigns verdict IDs globally across all verticals (markets, insurance, disputes). If any other vertical created a verdict before the market, the IDs diverge and the link points to a non-existent market.

**Example:** Market #1 had verdict #11. Clicking verdict #11 on the status page navigated to `/markets/11` — a market that doesn't exist.

**Fix:** The status page now scans `ResolutionTriggered(marketId, verdictId)` events from the PredictionMarket contract to build a reverse map. Market links use the actual `marketId`, not the `verdictId`.

**File:** `apps/web/app/status/page.tsx`

### Problem: Somnia RPC 1000-Block Limit

Both `useVerdictFailureReason` and `useVerdictToMarketMap` queried events `fromBlock: 0` to `latest` — that's 403M blocks. The Somnia RPC rejects any event query spanning more than 1000 blocks. The error was caught silently, so the hooks returned empty results. This caused:

- "No failure reason available" when a verdict failed
- Status page links still broken (event map was empty)

**Fix:** Added `scanLogsBackwards()` — a utility that paginates backwards from the latest block in 1000-block chunks until it finds the target event. Used by both `useVerdictFailureReason` and `useVerdictToMarketMap`.

**Files:** `apps/web/hooks/use-veritas.ts`, `apps/web/app/status/page.tsx`

### Problem: No Polling for In-Progress Verdicts

The `useGetVerdict` hook fetched data once on page load and never refetched. While a verdict was in `FetchingEvidence` or `Reasoning` stage, the UI was completely blind to on-chain progress. Users had to manually refresh.

**Fix:** `useGetVerdict` now spins up a second TanStack Query observer with `refetchInterval: 4000` (4 seconds) when the verdict is in stage 1 or 2. Both observers share the same query cache key, so the polling observer keeps the cache fresh and the first observer picks up the new data. Polling stops automatically when the verdict resolves or fails.

**File:** `apps/web/hooks/use-veritas.ts`

### Problem: `pokeSuccess` Missing from useEffect Dependency

In the market detail page, `pokeSuccess` was used in the condition (`if (stakeYesSuccess || stakeNoSuccess || claimSuccess || pokeSuccess || triggerSuccess)`) but was missing from the `useEffect` dependency array. After poking a stuck verdict, the market/verdict data would not automatically refetch.

**Fix:** Added `pokeSuccess` to the dependency array.

**File:** `apps/web/app/markets/[id]/page.tsx`

---

## 2. DisputeArbiter — Configurable Evidence Window

### Problem

The dispute contract had a hardcoded 1-hour evidence window (`uint256 public constant EVIDENCE_WINDOW = 1 hours`). The dispute create page had no window duration dropdown, unlike the market create page.

### Solution

**Contract change:** Replaced `EVIDENCE_WINDOW` with `MAX_EVIDENCE_WINDOW = 7 days`. Added `uint256 evidenceWindow` parameter to `raiseDispute()`. Added `InvalidEvidenceWindow` error for validation.

**New contract:** `0x5953449B12dF9bDC820E0C61Af526d0686030E11`

**Frontend changes:**
- `apps/web/hooks/use-disputes.ts` — `raiseDispute()` now accepts and passes `evidenceWindowSeconds`
- `apps/web/app/disputes/create/page.tsx` — Added evidence window dropdown (2 min / 10 min / 1 hour / 1 day)

### E2E Test: Apple Vision Pro Dispute

| Step | Wallet | TX | Result |
|------|--------|-----|--------|
| Raise dispute (0.1 STT bounty, 2-min window) | A (Claimant) | `0x961c3b...` | Dispute #0 |
| Submit counter-evidence | B (Respondent) | `0xea6091...` | Accepted |
| Trigger resolution (0.33 STT fee) | A | `0x806115...` | Verdict #13 |
| AI verdict | — | — | **YES** (Vision Pro released Feb 2, 2024) |
| Claim bounty | A | `0xd23e02...` | 0.1 STT ✅ |

---

## 3. InsuranceVault — Pool-Based Solvency Redesign

### Problem

The original contract had a critical solvency bug. `payoutAmount` was a fixed per-participant value, but the vault only collected `premium × participantCount`. If `payoutAmount > premium`, the vault was insolvent.

**Example:** Premium = 0.1 STT, Payout = 0.5 STT, 2 participants. Vault holds 0.2 STT but owes 1.0 STT. Claims revert with "transfer failed".

### Solution

Redesigned to a pool-based model:

1. **Creator funds the payout pool** at creation via `msg.value` (replaces the old `payoutAmount` parameter)
2. **Participants pay premiums** to join (added to pool)
3. **At resolution**, `perParticipant = poolBalance / participantCount` is computed once and stored
4. **Each claimant** receives their fixed `perParticipant` share

This ensures the vault is always solvent since `perParticipant × participantCount ≤ poolBalance`.

**Additional fix:** Used `poolBalance` mapping (per-policy) instead of `address(this).balance` to avoid commingling funds across policies and including pre-existing contract balance.

**New contract:** `0xE10caF9F4F8a62F289306990a801E0c26be4f347`

**Frontend changes:**
- `apps/web/hooks/use-insurance.ts` — `createPolicy()` now accepts `poolFunding` as `msg.value`, removed `payoutAmount`
- `apps/web/app/insurance/create/page.tsx` — Replaced "Payout" input with "Pool Funding" input, updated help text
- `apps/web/app/insurance/[id]/page.tsx` — Shows `perParticipant` instead of `payoutAmount`
- `apps/web/app/insurance/page.tsx` — Same update on the list page

### E2E Test: NVIDIA Stock Split Insurance

| Step | Wallet | TX | Result |
|------|--------|-----|--------|
| Create policy (2.5 STT pool, 0.1 STT premium, 5 max, 2-min window) | A | `0x2c4095...` | Policy #1 |
| Join policy (0.1 STT premium) | A | — | Participant 1 |
| Join policy (0.1 STT premium) | B | — | Participant 2 |
| Trigger resolution (0.33 STT fee) | A | — | Veritas agent fired |
| AI verdict | — | — | **YES** (NVIDIA announced 10-for-1 split in May 2024) |
| Claim payout | A | — | **1.35 STT** ✅ |
| Claim payout | B | — | **1.35 STT** ✅ |
| Vault balance | — | — | **0 STT** (fully distributed) |

**Pool math:** 2.5 (creator) + 0.2 (premiums) = 2.7 STT → 2.7 / 2 = 1.35 STT per participant

---

## 4. Contract Addresses (Somnia Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| Platform (AgentRequester) | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` | Unchanged |
| Veritas | `0x702969d634b103f26F859aE658cD0405aa510FE3` | Unchanged |
| PredictionMarket | `0x3BB03e11f82ce723F033cC2A47176dba326EC7C6` | Unchanged |
| InsuranceVault | `0xE10caF9F4F8a62F289306990a801E0c26be4f347` | **Redeployed** |
| DisputeArbiter | `0x5953449B12dF9bDC820E0C61Af526d0686030E11` | **Redeployed** |

---

## 5. Files Changed

### Contracts
| File | Change |
|------|--------|
| `packages/contracts/src/consumers/InsuranceVault.sol` | Pool-based solvency model |
| `packages/contracts/src/consumers/DisputeArbiter.sol` | Configurable evidence window |
| `packages/contracts/test/InsuranceVault.t.sol` | Updated for pool model |
| `packages/contracts/test/DisputeArbiter.t.sol` | Updated for evidenceWindow param |

### SDK
| File | Change |
|------|--------|
| `packages/sdk/src/contracts.ts` | New addresses for InsuranceVault and DisputeArbiter |
| `packages/sdk/src/abis/InsuranceVault.ts` | New ABI (pool model, no payoutAmount) |
| `packages/sdk/src/abis/DisputeArbiter.ts` | New ABI (evidenceWindow param) |

### Frontend
| File | Change |
|------|--------|
| `apps/web/app/status/page.tsx` | verdictId→marketId fix, backwards-paginating event scan |
| `apps/web/hooks/use-veritas.ts` | Backwards-paginating events, 4s polling for in-progress verdicts |
| `apps/web/app/markets/[id]/page.tsx` | pokeSuccess dependency fix |
| `apps/web/app/disputes/create/page.tsx` | Evidence window dropdown |
| `apps/web/hooks/use-disputes.ts` | evidenceWindow param |
| `apps/web/app/insurance/create/page.tsx` | Pool funding UI |
| `apps/web/app/insurance/[id]/page.tsx` | perParticipant display |
| `apps/web/app/insurance/page.tsx` | perParticipant display |
| `apps/web/hooks/use-insurance.ts` | Pool funding model |
| `README.md` | Updated addresses, vertical docs, E2E test results |

---

## 6. Test Wallets Used

| Wallet | Address | Role |
|--------|---------|------|
| A (Main) | `0x2b61FbdefEf22aBCc39645732a19842885f37F1c` | Creator / Claimant |
| B (Secondary) | `0x7111d20FcF6bd84E398Ab7940Ce5a97981432954` | Respondent / Participant |

---

## 7. Known Issues / Future Work

1. **Status page event scan latency** — The backwards-paginating event scanner searches up to 500k blocks. On a chain with 400M+ blocks, this means the first load of `/status` can take a few seconds. A subgraph or event indexer would fix this.

2. **Insurance pool refund on NO outcome** — If the AI verdict is NO (condition not met), the creator's pool funds stay locked in the contract. A `refundPool()` function would let the creator reclaim unused funds.

3. **Dispute evidence window auto-trigger** — Currently, someone must manually call `resolveDispute` after the evidence window closes. Somnia Reactivity could auto-trigger resolution, similar to how Veritas auto-pokes stuck verdicts.

4. **Market creation redirect** — After creating a market, the user sees a generic success screen and must navigate to `/markets` manually. The create page should redirect to `/markets/${newMarketId}` using the transaction receipt.
