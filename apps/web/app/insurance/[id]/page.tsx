"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { useGetPolicy, useJoinPolicy, useClaimPayout, useNextPolicyId, useIsParticipant, useHasClaimedPolicy, useTriggerResolutionPolicy } from "@/hooks/use-insurance";
import { useGetVerdict, getVerdictStageName, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const policyId = parseInt(id);
  const { isConnected, address } = useAccount();

  const { data: nextPolicyId } = useNextPolicyId();
  const { data: policy, refetch: refetchPolicy } = useGetPolicy(policyId);
  const verdictId = policy ? Number(policy.verdictId) : undefined;
  const { data: verdict } = useGetVerdict(verdictId);

  const { data: isParticipant } = useIsParticipant(policyId, address);
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimedPolicy(policyId, address);

  const { joinPolicy, isPending: joinPending, isConfirming: joinConfirming, isSuccess: joinSuccess } = useJoinPolicy(policyId);
  const { claimPayout, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimPayout(policyId);
  const { triggerResolution, isPending: triggerPending, isConfirming: triggerConfirming, isSuccess: triggerSuccess } = useTriggerResolutionPolicy(policyId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (joinSuccess || claimSuccess || pokeSuccess || triggerSuccess) {
      refetchPolicy();
      refetchClaimed();
    }
  }, [joinSuccess, claimSuccess, pokeSuccess, triggerSuccess]);

  const notFound = nextPolicyId !== undefined && policyId >= Number(nextPolicyId);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page">
          <div className="panel">
            <div className="panel-h"><h3>Not found</h3></div>
            <p className="text-sm text-[var(--stone-400)]">Policy #{id} does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page"><p className="text-[var(--stone-400)]">Loading policy...</p></div>
      </div>
    );
  }

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const notTriggered = policy.verdictId === BigInt(0) && !policy.resolved;
  const joinOpen = notTriggered && nowSec < policy.resolveAfter;
  const canTrigger = notTriggered && nowSec >= policy.resolveAfter;
  const resolveDate = new Date(Number(policy.resolveAfter) * 1000);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <Link href="/insurance" className="back" style={{ marginBottom: 22, display: "inline-flex", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>← All policies</Link>

        <div className="detail">
          {/* Main column */}
          <div>
            {/* Policy panel */}
            <div className="panel">
              <div className="panel-h">
                {policy.resolved ? (
                  <BoolBadge value={policy.outcome} trueLabel="Paid Out" falseLabel="No Payout" />
                ) : (
                  <span className="st st--active"><span className="dot" />Active</span>
                )}
                <span className="eyebrow">POLICY #{id}</span>
              </div>
              <h2 className="detail-q">{policy.question}</h2>
              <div className="dl">
                <div className="kv">
                  <div className="k">Premium</div>
                  <div className="v gold">{formatEther(policy.premium)} STT</div>
                </div>
                <div className="kv">
                  <div className="k">Payout / Participant</div>
                  <div className="v">
                    {policy.participantCount > 0
                      ? formatEther(policy.perParticipant)
                      : "—"} STT
                  </div>
                </div>
                <div className="kv">
                  <div className="k">Participants</div>
                  <div className="v mono">{String(policy.participantCount)} / {String(policy.maxParticipants)}</div>
                </div>
                <div className="kv">
                  <div className="k">Verdict Status</div>
                  <div className="v mono">
                    <VerdictStage stage={stage} failureReason={failureReason} />
                  </div>
                </div>
              </div>

              {stage === 3 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--line)" }}>
                  <div className="field-row">
                    <span>AI Verdict</span>
                    <BoolBadge value={policy.outcome} trueLabel="Condition Met" falseLabel="Condition Not Met" />
                  </div>
                </div>
              )}
            </div>

            {/* Reasoning trace */}
            {verdict && stage === 3 && verdict.lastRequestId > BigInt(0) && (
              <div className="panel">
                <ReasoningTrace requestId={verdict.lastRequestId} />
              </div>
            )}

            {/* Verdict failed */}
            {verdict && stage === 4 && (
              <div className="panel">
                <div className="panel-h"><h3>Verdict Failed</h3></div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)", margin: 0 }}>
                  {failureReason ?? "No failure reason available."}
                </p>
              </div>
            )}

            {/* Verdict stuck - poke */}
            {verdict && (stage === 1 || stage === 2) && verdict.deadline < BigInt(Math.floor(Date.now() / 1000)) && (
              <div className="panel">
                <div className="panel-h"><h3>Verdict Stuck</h3></div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", margin: "0 0 14px" }}>
                  The verdict deadline has passed. Somnia Reactivity will auto-poke this verdict. You can also poke manually.
                </p>
                <button
                  className="b"
                  onClick={() => poke()}
                  disabled={pokePending || pokeConfirming}
                >
                  {pokePending ? "Confirm..." : pokeConfirming ? "Poking..." : "Poke to Failed"}
                </button>
              </div>
            )}

            {/* Trigger resolution */}
            {canTrigger && (
              <div className="panel">
                <div className="panel-h"><h3>Trigger Resolution</h3></div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", margin: "0 0 14px" }}>
                  The join window has closed. Anyone can trigger the AI verdict by paying the resolution fee.
                </p>
                {isConnected ? (
                  <button className="b b--gold b--lg" onClick={() => triggerResolution()} disabled={triggerPending || triggerConfirming}>
                    {triggerPending ? "Confirm..." : triggerConfirming ? "Resolving..." : "Trigger Resolution"}
                  </button>
                ) : (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to trigger resolution</p>
                )}
              </div>
            )}

          </div>

          {/* Side column */}
          <div>
            {/* Join policy */}
            {joinOpen && !isParticipant && (
              <div className="panel">
                <div className="panel-h"><h3>Join Policy</h3></div>
                <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 18px" }}>
                  Pay <b style={{ color: "var(--verum)" }}>{formatEther(policy.premium)} STT</b> to join this policy
                  (open until {resolveDate.toLocaleString()}).
                  If the condition is met, you receive {formatEther(policy.perParticipant)} STT.
                </p>
                {isConnected ? (
                  <button
                    className="b b--gold b--lg"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => joinPolicy(formatEther(policy.premium))}
                    disabled={joinPending || joinConfirming || Number(policy.participantCount) >= Number(policy.maxParticipants)}
                  >
                    {joinPending ? "Confirm..." : joinConfirming ? "Joining..." : "Join Policy"}
                  </button>
                ) : (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to join</p>
                )}
              </div>
            )}

            {/* Participant status */}
            {isParticipant && !policy.resolved && (
              <div className="panel">
                <p style={{ fontSize: 14, color: "var(--verum)", fontFamily: "var(--mono)", margin: 0 }}>
                  You are a participant in this policy. Waiting for resolution.
                </p>
              </div>
            )}

            {/* Claim payout */}
            {policy.resolved && policy.outcome && isParticipant && (
              <div className="panel">
                <div className="panel-h"><h3>Claim Payout</h3></div>
                <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 18px" }}>
                  {hasClaimed
                    ? "You have already claimed your payout."
                    : `The condition was met. Claim your ${formatEther(policy.perParticipant)} STT payout.`}
                </p>
                {!isConnected ? (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to claim</p>
                ) : hasClaimed ? (
                  <p style={{ fontSize: 14, color: "var(--verum)", fontFamily: "var(--mono)", margin: 0 }}>✓ Payout claimed</p>
                ) : (
                  <button
                    className="b b--gold b--lg"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => claimPayout()}
                    disabled={claimPending || claimConfirming}
                  >
                    {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Payout"}
                  </button>
                )}
              </div>
            )}

            {/* Non-participant resolved message */}
            {policy.resolved && policy.outcome && !isParticipant && (
              <div className="panel">
                <p style={{ fontSize: 14, color: "var(--stone-400)", margin: 0 }}>
                  The condition was met, but only participants who joined before resolution can claim.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
