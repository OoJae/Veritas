"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useCreatePolicy } from "@/hooks/use-insurance";
import { isScrapeableUrl, looksLikeRawApi } from "@/lib/evidence";
import { WINDOW_PRESETS, DEFAULT_WINDOW_SECONDS } from "@/lib/windows";
import { quoteVerdictSimple } from "@veritas/agent-template";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function CreatePolicyPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createPolicy, isPending, isConfirming, isSuccess } = useCreatePolicy();

  const [question, setQuestion] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [premium, setPremium] = useState("0.1");
  const [poolFunding, setPoolFunding] = useState("2.5");
  const [maxParticipants, setMaxParticipants] = useState("5");
  const [windowSeconds, setWindowSeconds] = useState(DEFAULT_WINDOW_SECONDS);

  const cost = formatEther(quoteVerdictSimple());
  const urlValid = isScrapeableUrl(evidenceUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValid) return;
    createPolicy(question, [evidenceUrl.trim()], premium, parseInt(maxParticipants), windowSeconds, poolFunding);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page">
          <div className="panel">
            <div className="panel-h">
              <h3>Policy Created</h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 22px" }}>
              Your insurance policy is live. Participants can now join.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/insurance">
                <button className="b b--gold">View All Policies</button>
              </Link>
              <button className="b" onClick={() => window.location.reload()}>Create Another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <Link href="/insurance" className="back" style={{ marginBottom: 22, display: "inline-flex", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>← All policies</Link>

        <div className="panel">
          <div className="panel-h">
            <h3>Create Policy</h3>
            <span className="eyebrow">New Insurance Policy</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 26px" }}>
            Define a condition that AI will evaluate. If the condition is met, all participants receive a payout.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label htmlFor="question" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Condition</label>
                <textarea
                  id="question"
                  placeholder="Did it rain more than 2 inches in NYC on May 25?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--sans)", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80 }}
                />
              </div>

              <div>
                <label htmlFor="evidence" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Evidence URL</label>
                <input
                  id="evidence"
                  type="text"
                  placeholder="https://www.wunderground.com/history/daily/..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                />
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                  A public status or data page the AI will read to evaluate the condition. Use a normal HTML page, not a raw JSON API.
                </p>
                {evidenceUrl.trim() && !urlValid && (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--destructive)", marginTop: 4 }}>
                    Enter a valid http(s) URL.
                  </p>
                )}
                {urlValid && looksLikeRawApi(evidenceUrl) && (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--verum)", marginTop: 4 }}>
                    This looks like a raw JSON API. A human-readable page resolves more reliably.
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label htmlFor="premium" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Premium (STT)</label>
                  <div className="stake-amt">
                    <input
                      id="premium"
                      type="number"
                      step="0.01"
                      min="0"
                      value={premium}
                      onChange={(e) => setPremium(e.target.value)}
                      required
                    />
                    <span className="unit">STT</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="poolFunding" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Pool Funding (STT)</label>
                  <div className="stake-amt">
                    <input
                      id="poolFunding"
                      type="number"
                      step="0.01"
                      min="0"
                      value={poolFunding}
                      onChange={(e) => setPoolFunding(e.target.value)}
                      required
                    />
                    <span className="unit">STT</span>
                  </div>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                    You deposit this now. It is split equally among all participants if the condition is met.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="maxParticipants" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Max Participants</label>
                <input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                />
              </div>

              <div>
                <label htmlFor="window" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Join window</label>
                <select
                  id="window"
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(Number(e.target.value))}
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                >
                  {WINDOW_PRESETS.map((p) => (
                    <option key={p.seconds} value={p.seconds}>{p.label}</option>
                  ))}
                </select>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                  How long participants can join before the policy can be resolved.
                </p>
              </div>

              <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
                <div className="field-row"><span>You deposit (payout pool)</span><b>{poolFunding} STT</b></div>
                <div className="field-row"><span>Resolution fee (paid on trigger)</span><b>{cost} STT</b></div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 12, lineHeight: 1.6 }}>
                  You fund the payout pool now. Participants pay the premium to join.
                  If the AI confirms the condition, the pool is split equally among participants.
                  Premiums are added to the pool, increasing each participant's share.
                </p>
              </div>

              <div>
                {!isConnected ? (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to create a policy</p>
                ) : (
                  <button
                    type="submit"
                    className="b b--gold b--lg"
                    disabled={isPending || isConfirming || !question.trim() || !urlValid}
                  >
                    {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Policy"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
