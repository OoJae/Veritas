"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BoolBadge } from "@/components/verdict-display";
import { useGetMarket, useStakeYes, useStakeNo, useClaim, useNextMarketId, useYesStake, useNoStake, useMarketClaimed, useTriggerResolution } from "@/hooks/use-markets";
import { useGetVerdict, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketId = parseInt(id);
  const { address, isConnected } = useAccount();

  const { data: nextMarketId } = useNextMarketId();
  const { data: market, refetch: refetchMarket } = useGetMarket(marketId);
  const { data: userYesStake } = useYesStake(marketId, address);
  const { data: userNoStake } = useNoStake(marketId, address);
  const { data: userClaimed, refetch: refetchClaimed } = useMarketClaimed(marketId, address);
  const verdictId = market ? Number(market.verdictId) : undefined;
  const { data: verdict, refetch: refetchVerdict } = useGetVerdict(verdictId);

  const [stakeAmount, setStakeAmount] = useState("0.1");

  const { stakeYes, isPending: stakeYesPending, isConfirming: stakeYesConfirming, isSuccess: stakeYesSuccess } = useStakeYes(marketId);
  const { stakeNo, isPending: stakeNoPending, isConfirming: stakeNoConfirming, isSuccess: stakeNoSuccess } = useStakeNo(marketId);
  const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaim(marketId);
  const { triggerResolution, isPending: triggerPending, isConfirming: triggerConfirming, isSuccess: triggerSuccess } = useTriggerResolution(marketId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (stakeYesSuccess || stakeNoSuccess || claimSuccess || pokeSuccess || triggerSuccess) {
      refetchMarket();
      refetchVerdict();
      refetchClaimed();
    }
  }, [stakeYesSuccess, stakeNoSuccess, claimSuccess, triggerSuccess, pokeSuccess, refetchMarket, refetchVerdict, refetchClaimed]);

  const notFound = nextMarketId !== undefined && marketId >= Number(nextMarketId);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page">
          <div className="panel">
            <div className="panel-h"><h3>Not found</h3></div>
            <p className="text-sm text-[var(--stone-400)]">Market #{id} does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page"><p className="text-[var(--stone-400)]">Loading market...</p></div>
      </div>
    );
  }

  const winningStake = market.outcome ? (userYesStake ?? BigInt(0)) : (userNoStake ?? BigInt(0));
  const canClaim = isConnected && winningStake > BigInt(0) && !userClaimed;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const notTriggered = market.verdictId === BigInt(0) && !market.resolved;
  const bettingOpen = notTriggered && nowSec < market.resolveAfter;
  const canTrigger = notTriggered && nowSec >= market.resolveAfter;
  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > BigInt(0) ? Number((market.yesPool * BigInt(100)) / totalPool) : 50;
  const noPct = 100 - yesPct;

  // Verdict tracker stages
  const trackerStages = [
    { key: "ask", label: "Ask", sub: "Question + evidence committed on-chain" },
    { key: "gather", label: "Gather", sub: "Parse Website agent scrapes the source" },
    { key: "reason", label: "Reason", sub: "Deterministic LLM synthesizes a verdict" },
    { key: "verdict", label: "Verdict", sub: "Written on-chain, payout dispatched" },
  ];

  function getTrackerState(idx: number) {
    if (stage === 0) return "pending";
    if (stage === 4) return idx === 0 ? "done" : "pending";
    if (stage === 1) return idx === 0 ? "done" : idx === 1 ? "active" : "pending";
    if (stage === 2) return idx <= 1 ? "done" : idx === 2 ? "active" : "pending";
    if (stage === 3) return "done";
    return "pending";
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <Link href="/markets" className="back" style={{ marginBottom: 22, display: "inline-flex", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>← All markets</Link>

        <div className="detail">
          {/* Main column */}
          <div>
            {/* Market panel */}
            <div className="panel">
              <div className="panel-h">
                {market.resolved ? (
                  <BoolBadge value={market.outcome} trueLabel="Resolved · YES" falseLabel="Resolved · NO" />
                ) : notTriggered && nowSec < market.resolveAfter ? (
                  <span className="st st--active"><span className="dot" />Awaiting resolution</span>
                ) : (
                  <span className="st st--resolved">Awaiting resolution</span>
                )}
                <span className="eyebrow">MARKET #{id}</span>
              </div>
              <h2 className="detail-q">{market.question}</h2>
              <div className="split" style={{ marginBottom: 22 }}>
                <div className="split-l">
                  <span className="y">YES {yesPct}%</span>
                  <span className="n">NO {noPct}%</span>
                </div>
                <div className="split-bar">
                  <span className="y" style={{ width: `${yesPct}%` }} />
                  <span className="n" style={{ width: `${noPct}%` }} />
                </div>
              </div>
              <div className="dl">
                <div className="kv"><div className="k">YES Pool</div><div className="v gold">{formatEther(market.yesPool)} STT</div></div>
                <div className="kv"><div className="k">NO Pool</div><div className="v">{formatEther(market.noPool)} STT</div></div>
                <div className="kv"><div className="k">Total Pool</div><div className="v mono">{formatEther(totalPool)} STT</div></div>
                <div className="kv"><div className="k">Status</div><div className="v mono">{notTriggered ? "Not triggered" : stage === 3 ? "Resolved" : stage === 4 ? "Failed" : "Processing"}</div></div>
              </div>
            </div>

            {/* Verdict tracker */}
            <div className="panel">
              <div className="panel-h">
                <h3>Verdict</h3>
                <span className="eyebrow">{notTriggered ? "Not requested" : `Stage ${stage}`}</span>
              </div>
              <div className="tracker">
                {trackerStages.map((s, i) => {
                  const state = getTrackerState(i);
                  return (
                    <div key={s.key} className={`tk ${state}`}>
                      <div className="node">{String(i + 1).padStart(2, "0")}</div>
                      <div>
                        <div className="tk-title">{s.label}</div>
                        <div className="tk-sub">{s.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Result banner */}
              {stage === 3 && verdict && (
                <div className={`result-banner ${verdict.result ? "true" : ""}`} style={{ marginTop: 16 }}>
                  <div className="big">{verdict.result ? "TRUE" : "FALSE"}</div>
                  <div className="meta">
                    Verdict: <b>{verdict.result ? "YES" : "NO"}</b><br />
                    Confidence: <b>80%</b><br />
                    Consensus: <b>Majority</b>
                  </div>
                </div>
              )}

              {/* Failed */}
              {stage === 4 && (
                <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "1px solid var(--line)", background: "var(--panel)" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)", margin: 0 }}>
                    {failureReason ?? "No failure reason available."}
                  </p>
                </div>
              )}

              {/* Stuck — poke */}
              {stage === 1 && verdict && verdict.deadline < BigInt(Math.floor(Date.now() / 1000)) && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginBottom: 12 }}>
                    The verdict deadline has passed. Poke to mark as failed.
                  </p>
                  <button className="b" onClick={() => poke()} disabled={pokePending || pokeConfirming}>
                    {pokePending ? "Confirm..." : pokeConfirming ? "Poking..." : "Poke to Failed"}
                  </button>
                </div>
              )}

              {/* Trigger resolution */}
              {canTrigger && (
                <div style={{ marginTop: 20 }}>
                  <button className="b b--gold b--lg" onClick={() => triggerResolution()} disabled={triggerPending || triggerConfirming}>
                    {triggerPending ? "Confirm in wallet..." : triggerConfirming ? "Resolving..." : "Trigger resolution"} <span>↗</span>
                  </button>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", margin: "12px 0 0", letterSpacing: "0.04em" }}>
                    Betting has closed. Anyone can trigger the AI verdict by paying the resolution fee.
                  </p>
                </div>
              )}
            </div>

            {/* Reasoning trace */}
            {verdict && stage === 3 && verdict.lastRequestId > BigInt(0) && (
              <div className="panel">
                <ReasoningTrace requestId={verdict.lastRequestId} />
              </div>
            )}
          </div>

          {/* Side column */}
          <div>
            {/* Stake panel */}
            {bettingOpen && (
              <div className="panel">
                <div className="panel-h"><h3>Place a stake</h3></div>
                <div className="stake-amt">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    step="0.05"
                    min="0"
                  />
                  <span className="unit">STT</span>
                </div>
                <div className="stake-btns">
                  {isConnected ? (
                    <>
                      <button
                        className="b stake-yes"
                        onClick={() => stakeYes(stakeAmount)}
                        disabled={stakeYesPending || stakeYesConfirming || !stakeAmount}
                      >
                        {stakeYesPending ? "Confirm..." : stakeYesConfirming ? "Staking..." : "Stake YES"}
                      </button>
                      <button
                        className="b stake-no"
                        onClick={() => stakeNo(stakeAmount)}
                        disabled={stakeNoPending || stakeNoConfirming || !stakeAmount}
                      >
                        {stakeNoPending ? "Confirm..." : stakeNoConfirming ? "Staking..." : "Stake NO"}
                      </button>
                    </>
                  ) : (
                    <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--stone-400)", fontFamily: "var(--mono)" }}>Connect your wallet to stake</p>
                  )}
                </div>
                <div style={{ marginTop: 18 }}>
                  <div className="field-row"><span>Your YES</span><b>{formatEther(userYesStake ?? BigInt(0))} STT</b></div>
                  <div className="field-row"><span>Your NO</span><b>{formatEther(userNoStake ?? BigInt(0))} STT</b></div>
                </div>
              </div>
            )}

            {/* Claim panel */}
            {market.resolved && canClaim && (
              <div className="panel">
                <div className="panel-h"><h3>Claim winnings</h3></div>
                <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 18px" }}>
                  The outcome was <b style={{ color: "var(--verum)" }}>{market.outcome ? "YES" : "NO"}</b>.
                  Your winning stake is eligible to claim its share of the {formatEther(totalPool)} STT pool.
                </p>
                <button
                  className="b b--gold b--lg"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => claim()}
                  disabled={claimPending || claimConfirming}
                >
                  {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : `Claim ${formatEther(winningStake)} STT`}
                </button>
              </div>
            )}

            {market.resolved && userClaimed && (
              <div className="panel">
                <div className="panel-h"><h3>Claim winnings</h3></div>
                <p style={{ fontSize: 14, color: "var(--verum)", fontFamily: "var(--mono)", margin: 0 }}>✓ Already claimed</p>
              </div>
            )}

            {/* Trust panel */}
            <div className="panel">
              <div className="panel-h"><h3>Why trust this</h3></div>
              <div className="field-row"><span>Resolution</span><b>No admin key</b></div>
              <div className="field-row"><span>Consensus</span><b>Majority 3/3</b></div>
              <div className="field-row"><span>Auditable</span><b>On-chain receipt</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
