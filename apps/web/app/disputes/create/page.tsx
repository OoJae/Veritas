"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useRaiseDispute } from "@/hooks/use-disputes";
import { isScrapeableUrl, looksLikeRawApi } from "@/lib/evidence";
import { WINDOW_PRESETS, DEFAULT_WINDOW_SECONDS } from "@/lib/windows";
import { useAccount } from "wagmi";

export default function CreateDisputePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { raiseDispute, isPending, isConfirming, isSuccess } = useRaiseDispute();

  const [question, setQuestion] = useState("");
  const [respondent, setRespondent] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [bounty, setBounty] = useState("0.5");
  const [windowSeconds, setWindowSeconds] = useState(DEFAULT_WINDOW_SECONDS);

  const urlValid = isScrapeableUrl(evidenceUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValid) return;
    raiseDispute(respondent, question, [evidenceUrl.trim()], bounty, windowSeconds);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page">
          <div className="panel">
            <div className="panel-h">
              <h3>Dispute Raised</h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 22px" }}>
              Your dispute has been created. The respondent has 1 hour to submit counter-evidence.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/disputes">
                <button className="b b--gold">View All Disputes</button>
              </Link>
              <button className="b" onClick={() => window.location.reload()}>Raise Another</button>
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
        <Link href="/disputes" className="back" style={{ marginBottom: 22, display: "inline-flex", gap: 8, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>← All disputes</Link>

        <div className="panel">
          <div className="panel-h">
            <h3>Raise Dispute</h3>
            <span className="eyebrow">New Dispute</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--stone-300)", lineHeight: 1.5, margin: "0 0 26px" }}>
            Submit a dispute with a bounty. The winner (determined by AI) claims the bounty.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label htmlFor="question" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Dispute Question</label>
                <textarea
                  id="question"
                  placeholder="Did the DAO treasury lose funds due to the March proposal?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--sans)", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80 }}
                />
              </div>

              <div>
                <label htmlFor="respondent" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Respondent Address</label>
                <input
                  id="respondent"
                  type="text"
                  placeholder="0x..."
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                />
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                  The address you are disputing against
                </p>
              </div>

              <div>
                <label htmlFor="evidence" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Your Evidence URL</label>
                <input
                  id="evidence"
                  type="text"
                  placeholder="https://example.com/evidence"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  required
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", color: "var(--marble)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }}
                />
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                  A public web page the AI will read as your evidence. Use a normal HTML page, not a raw JSON API.
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

              <div>
                <label htmlFor="window" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Evidence window</label>
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
                  How long the respondent has to submit counter-evidence.
                </p>
              </div>

              <div>
                <label htmlFor="bounty" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone-400)", display: "block", marginBottom: 8 }}>Bounty (STT)</label>
                <div className="stake-amt">
                  <input
                    id="bounty"
                    type="number"
                    step="0.01"
                    min="0"
                    value={bounty}
                    onChange={(e) => setBounty(e.target.value)}
                    required
                  />
                  <span className="unit">STT</span>
                </div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--stone-500)", marginTop: 8 }}>
                  The winner claims this amount. You send it now.
                </p>
              </div>

              <div>
                {!isConnected ? (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--stone-400)" }}>Connect your wallet to raise a dispute</p>
                ) : (
                  <button
                    type="submit"
                    className="b b--gold b--lg"
                    disabled={isPending || isConfirming || !question.trim() || !respondent.trim() || !urlValid}
                  >
                    {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Raise Dispute"}
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
