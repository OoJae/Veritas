"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { VerdictStage } from "@/components/verdict-display";
import { useGetDispute, useSubmitEvidence, useResolveDispute, useClaimBounty, useNextDisputeId } from "@/hooks/use-disputes";
import { useGetVerdict, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const disputeId = parseInt(id);
  const { isConnected, address } = useAccount();

  const { data: nextDisputeId } = useNextDisputeId();
  const { data: dispute, refetch: refetchDispute } = useGetDispute(disputeId);
  const verdictId = dispute ? Number(dispute.verdictId) : undefined;
  const { data: verdict } = useGetVerdict(verdictId);

  const [evidenceUrl, setEvidenceUrl] = useState("");

  const isRespondent = address && dispute && address.toLowerCase() === dispute.respondent.toLowerCase();
  const isClaimant = address && dispute && address.toLowerCase() === dispute.claimant.toLowerCase();
  const evidenceDeadline = dispute ? Number(dispute.evidenceDeadline) : 0;
  const now = Math.floor(Date.now() / 1000);
  const evidenceWindowOpen = !dispute?.resolved && evidenceDeadline > now;

  const { submitEvidence, isPending: submitPending, isConfirming: submitConfirming, isSuccess: submitSuccess } = useSubmitEvidence(disputeId);
  const { resolveDispute, isPending: resolvePending, isConfirming: resolveConfirming, isSuccess: resolveSuccess } = useResolveDispute(disputeId);
  const { claimBounty, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimBounty(disputeId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (submitSuccess || resolveSuccess || claimSuccess || pokeSuccess) {
      refetchDispute();
    }
  }, [submitSuccess, resolveSuccess, claimSuccess, pokeSuccess]);

  const notFound =
    (nextDisputeId !== undefined && disputeId >= Number(nextDisputeId)) ||
    (dispute !== undefined && dispute.claimant === ZERO_ADDRESS);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page">
          <div className="panel">
            <div className="panel-h"><h3>Not found</h3></div>
            <p className="text-sm text-[var(--stone-400)]">Dispute #{id} does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page"><p className="text-[var(--stone-400)]">Loading dispute...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <Link href="/disputes" className="back" style={{ marginBottom: 22, display: "inline-flex", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>← All disputes</Link>

        <div className="detail">
          {/* Main column */}
          <div>
            {/* Dispute panel */}
            <div className="panel">
              <div className="panel-h">
                {dispute.resolved ? (
                  <span className="st st--resolved"><span className="dot" />Resolved</span>
                ) : (
                  <span className="st st--active"><span className="dot" />Active</span>
                )}
                <span className="eyebrow">DISPUTE #{id}</span>
              </div>
              <h2 className="detail-q">{dispute.question}</h2>
              <div className="dl">
                <div className="kv">
                  <div className="k">Claimant</div>
                  <div className="v mono">{truncateAddress(dispute.claimant)}</div>
                </div>
                <div className="kv">
                  <div className="k">Respondent</div>
                  <div className="v mono">{truncateAddress(dispute.respondent)}</div>
                </div>
                <div className="kv">
                  <div className="k">Bounty</div>
                  <div className="v gold">{formatEther(dispute.bounty)} STT</div>
                </div>
                <div className="kv">
                  <div className="k">Verdict Status</div>
                  <div className="v mono">
                    <VerdictStage stage={stage} failureReason={failureReason} />
                  </div>
                </div>
              </div>

              {dispute.resolved && dispute.winner !== "0x0000000000000000000000000000000000000000" && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--line)" }}>
                  <div className="field-row">
                    <span>Winner</span>
                    <b style={{ color: "var(--verum)" }}>{truncateAddress(dispute.winner)}</b>
                  </div>
                </div>
              )}

              {dispute.claimantEvidenceUrls.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--line)" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", marginBottom: 10 }}>Claimant Evidence</p>
                  {dispute.claimantEvidenceUrls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "block", fontFamily: "var(--mono)", fontSize: 12, color: "var(--verum)", textDecoration: "none", padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {url}
                    </a>
                  ))}
                </div>
              )}

              {dispute.respondentEvidenceUrls.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--line)" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", marginBottom: 10 }}>Respondent Evidence</p>
                  {dispute.respondentEvidenceUrls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "block", fontFamily: "var(--mono)", fontSize: 12, color: "var(--verum)", textDecoration: "none", padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {url}
                    </a>
                  ))}
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
          </div>

          {/* Side column */}
          <div>
            {/* Submit counter-evidence */}
            {isRespondent && evidenceWindowOpen && (
              <div className="panel">
                <div className="panel-h"><h3>Submit Counter-Evidence</h3></div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="evidence" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Evidence URL</label>
                  <input
                    id="evidence"
                    type="text"
                    placeholder="https://example.com/counter-evidence"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                  />
                </div>
                <button
                  className="b b--gold"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => submitEvidence(evidenceUrl.trim() ? [evidenceUrl.trim()] : [])}
                  disabled={submitPending || submitConfirming}
                >
                  {submitPending ? "Confirm..." : submitConfirming ? "Submitting..." : "Submit Evidence"}
                </button>
              </div>
            )}

            {/* Resolve dispute */}
            {!dispute.resolved && dispute.verdictId === BigInt(0) && !evidenceWindowOpen && (
              <div className="panel">
                <div className="panel-h"><h3>Resolve Dispute</h3></div>
                <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 14px" }}>
                  The evidence window has closed. Anyone can trigger AI resolution by paying the verdict fee.
                </p>
                {isConnected ? (
                  <button
                    className="b b--gold b--lg"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => resolveDispute()}
                    disabled={resolvePending || resolveConfirming}
                  >
                    {resolvePending ? "Confirm..." : resolveConfirming ? "Resolving..." : "Resolve Dispute"}
                  </button>
                ) : (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to resolve</p>
                )}
              </div>
            )}

            {/* Claim bounty */}
            {dispute.resolved && (
              <div className="panel">
                <div className="panel-h"><h3>Claim Bounty</h3></div>
                <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 18px" }}>
                  {dispute.winner === address
                    ? `You won! Claim your ${formatEther(dispute.bounty)} STT bounty.`
                    : dispute.bounty > BigInt(0)
                      ? "The winner can claim the bounty."
                      : "The bounty has been claimed."}
                </p>
                {dispute.winner === address && dispute.bounty > BigInt(0) && (
                  <>
                    {isConnected ? (
                      <button
                        className="b b--gold b--lg"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() => claimBounty()}
                        disabled={claimPending || claimConfirming}
                      >
                        {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Bounty"}
                      </button>
                    ) : (
                      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to claim</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
