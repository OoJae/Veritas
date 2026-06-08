"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Seal } from "@/components/seal";

/* ================================================================
   Landing page — ported from brand/Veritas.html
   Onboarding → Hero → Thesis → Loop → Verdict Moment →
   Consumers → Receipt → Why Somnia → Enter / Footer
   ================================================================ */

// ---- Onboarding overlay ----
function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("Initializing primitive");
  const [nodes, setNodes] = useState<boolean[]>(Array(7).fill(false));
  const [done, setDone] = useState(false);

  const messages = [
    "Initializing primitive",
    "Establishing deterministic consensus",
    "Connecting validator subcommittee",
    "Synchronizing evidence pipeline",
    "Consensus reached",
  ];

  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) p = 100;
      setPct(Math.round(p));
      const msgIdx = Math.min(Math.floor(p / 22), messages.length - 1);
      setStatus(messages[msgIdx]);
      setNodes((prev) => prev.map((_, i) => i <= Math.floor(p / 16)));
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          setDone(true);
          setTimeout(onDone, 1200);
        }, 400);
      }
    }, 240);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone]);

  return (
    <div className={`intro-overlay${done ? " done" : ""}`}>
      <div className="intro-inner">
        <Seal size={92} className="intro-seal text-[var(--marble)]" />
        <div className="intro-status">{status}</div>
        <div className="intro-bar">
          <div className="intro-bar-fill" style={{ right: `${100 - pct}%` }} />
        </div>
        <div className="intro-pct">{String(pct).padStart(3, "0")} / 100</div>
        <div className="intro-nodes">
          {nodes.map((on, i) => (
            <span key={i} className={`intro-node${on ? " on" : ""}`} />
          ))}
        </div>
      </div>
      <button className="intro-skip" onClick={() => { setDone(true); setTimeout(onDone, 1200); }}>
        Skip intro →
      </button>
    </div>
  );
}

// ---- UTC clock ----
function UTCClock() {
  const [time, setTime] = useState("00:00:00 UTC");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().slice(11, 19) + " UTC");
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span data-clock>{time}</span>;
}

// ---- Top status bar ----
function TopBar() {
  return (
    <header className="topbar">
      <div className="tb-left">
        <a href="#top" className="tb-brand">
          <Seal size={24} className="text-[#fff]" />
          <span className="tb-name">VERITAS</span>
        </a>
        <span className="tb-meta">
          <span className="dot" />
          <UTCClock /> · SOMNIA TESTNET
        </span>
      </div>
      <nav className="tb-nav">
        <a href="#loop">Primitive</a>
        <a href="#markets">Markets</a>
        <a href="#insurance">Insurance</a>
        <a href="#disputes">Disputes</a>
      </nav>
      <div className="tb-right">
        <Link href="/markets" className="tb-cta">Enter App <span>↗</span></Link>
      </div>
    </header>
  );
}

// ---- Progress rail ----
function ProgressRail({ active }: { active: number }) {
  return (
    <div className="prail">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} className={i === active ? "on" : ""} />
      ))}
    </div>
  );
}

// ---- Reveal on scroll ----
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("in"); },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const d = delay > 0 ? ` d${delay}` : "";
  return (
    <div ref={ref} className={`reveal${d} ${className}`}>
      {children}
    </div>
  );
}

// ---- Main landing page ----
export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [secIdx, setSecIdx] = useState(0);

  useEffect(() => {
    const handler = () => {
      const sections = document.querySelectorAll("[data-sec]");
      const scrollY = window.scrollY + window.innerHeight / 2;
      let idx = 0;
      sections.forEach((sec, i) => {
        if (scrollY >= (sec as HTMLElement).offsetTop) idx = i;
      });
      setSecIdx(idx);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const introDone = useCallback(() => setShowIntro(false), []);

  return (
    <div className="grain">
      {showIntro && <IntroOverlay onDone={introDone} />}
      <TopBar />
      <ProgressRail active={secIdx} />

      <main id="top">
        {/* ====== HERO ====== */}
        <section className="hero" data-sec>
          <div className="hero-stage">
            <div className="hero-bust">
              <div className="w-full h-full flex items-end justify-center opacity-20">
                <Seal size={320} spin={false} className="text-[var(--marble)]" />
              </div>
            </div>
          </div>
          <div className="hero-wordmark-wrap">
            <h1 className="wordmark hero-wordmark">VERITAS</h1>
          </div>
          <div className="hero-foot">
            <div className="hero-desc">
              <span className="eyebrow">The on-chain oracle of truth</span>
              <p>
                A trustless AI verdict primitive on the Somnia Agentic L1. Ask if something is true.
                Receive a binding, consensus-verified verdict — <span className="serif-it">with a receipt.</span>
              </p>
            </div>
            <div className="scroll-cue">
              Scroll to query <span className="ln" />
            </div>
          </div>
        </section>

        {/* ====== THESIS ====== */}
        <section className="section" data-sec>
          <div className="shell thesis">
            <Reveal>
              <p>
                <span className="mut">Markets, escrow, and policies all wait on the same missing part —</span>{" "}
                a judge you can <span className="serif-it">trust.</span>{" "}
                <span className="mut">Veritas is that judge:</span> one Solidity call that asks the chain itself{" "}
                <span className="serif-it">&ldquo;is this true?&rdquo;</span>{" "}
                <span className="mut">and returns an answer no single party can forge.</span>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ====== THE LOOP ====== */}
        <section className="section loop" id="loop" data-sec>
          <div className="shell">
            <Reveal className="sec-head">
              <div><span className="idx">01 — THE PRIMITIVE</span></div>
              <div className="eyebrow">requestVerdict( ) → resolved on-chain</div>
            </Reveal>

            {/* Ask */}
            <div className="loop-step">
              <Reveal>
                <div className="loop-num">→ STEP 01</div>
                <h3 className="loop-title display">Ask</h3>
                <p className="loop-copy">A consumer contract poses a natural-language question and attaches its evidence URLs. No oracle committee, no privileged resolver — just a payable call to the primitive.</p>
              </Reveal>
              <div className="loop-visual">
                <div className="card3d" style={{ width: "78%", height: "46%", transform: "translateZ(60px)" }}>
                  <span className="lbl">QUESTION · STRING</span>
                  <div style={{ position: "absolute", left: 14, right: 14, bottom: 16, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "clamp(15px,1.6vw,22px)", color: "var(--marble)" }}>
                    Did flight BA1432 arrive more than 3 hours late?
                    <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--verum)", marginLeft: 3, verticalAlign: -2 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gather */}
            <div className="loop-step">
              <Reveal>
                <div className="loop-num">→ STEP 02</div>
                <h3 className="loop-title display">Gather</h3>
                <p className="loop-copy">Validators independently run the Parse Website agent over each source, scraping and extracting the facts that matter. Evidence is accumulated on-chain, in the open.</p>
              </Reveal>
              <div className="loop-visual">
                <div style={{ position: "relative", width: "80%", height: "70%", transformStyle: "preserve-3d" }}>
                  <div className="card3d" style={{ inset: 0, transform: "translateZ(0)" }}><span className="lbl">SOURCE 03 · flightradar</span></div>
                  <div className="card3d" style={{ inset: 0, transform: "translateZ(40px) translate(22px,-22px)" }}><span className="lbl">SOURCE 02 · status API</span></div>
                  <div className="card3d" style={{ inset: 0, transform: "translateZ(80px) translate(44px,-44px)", background: "linear-gradient(160deg,var(--panel-2),var(--panel))" }}>
                    <span className="lbl" style={{ color: "var(--verum)" }}>SOURCE 01 · scraped</span>
                    <div style={{ position: "absolute", left: 14, bottom: 14, right: 14, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.6, color: "var(--stone-300)" }}>
                      arrival: 04:12<br />scheduled: 23:55<br /><span style={{ color: "var(--verum)" }}>delay: 252 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="loop-step">
              <Reveal>
                <div className="loop-num">→ STEP 03</div>
                <h3 className="loop-title display">Reason</h3>
                <p className="loop-copy">A deterministic LLM synthesizes the evidence into a verdict. Identical inputs produce byte-identical output across every validator — so a subcommittee can reach majority consensus on a thought.</p>
              </Reveal>
              <div className="loop-visual">
                <div className="nodes-vis">
                  <svg viewBox="0 0 200 200" fill="none" style={{ width: "100%", height: "100%" }}>
                    <circle cx="100" cy="100" r="78" stroke="var(--line-2)" strokeWidth="1" />
                    <circle cx="100" cy="100" r="50" stroke="var(--line)" strokeWidth="1" />
                    <g stroke="var(--line-2)" strokeWidth="1">
                      <line x1="100" y1="100" x2="100" y2="22" /><line x1="100" y1="100" x2="168" y2="60" />
                      <line x1="100" y1="100" x2="168" y2="140" /><line x1="100" y1="100" x2="100" y2="178" />
                      <line x1="100" y1="100" x2="32" y2="140" /><line x1="100" y1="100" x2="32" y2="60" />
                    </g>
                    <g fill="var(--verum)">
                      <circle cx="100" cy="22" r="5" /><circle cx="168" cy="60" r="5" /><circle cx="168" cy="140" r="5" />
                      <circle cx="100" cy="178" r="5" /><circle cx="32" cy="140" r="5" /><circle cx="32" cy="60" r="5" />
                    </g>
                    <circle cx="100" cy="100" r="14" fill="var(--verum)" />
                    <path d="M90 100 L98 110 L112 92" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="loop-step">
              <Reveal>
                <div className="loop-num">→ STEP 04</div>
                <h3 className="loop-title display">Verdict</h3>
                <p className="loop-copy">The result is written on-chain with a confidence score and a receipt pointer, then dispatched to the consumer to settle funds automatically. One call in, one binding truth out.</p>
              </Reveal>
              <div className="loop-visual">
                <div style={{ textAlign: "center" }}>
                  <Seal size={200} className="text-[var(--verum)] mx-auto" />
                  <div className="chip chip--true" style={{ marginTop: 24 }}>
                    <span className="chip__dot" />VERDICT · TRUE · 0.96
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== VERDICT MOMENT ====== */}
        <section className="section verdict-moment" data-sec>
          <div className="shell">
            <Reveal>
              <p className="vm-q">&ldquo;Will the BTC price close above $120,000 on the settlement date?&rdquo;</p>
            </Reveal>
            <Reveal delay={1}>
              <div className="vm-stamp">
                <div className="vm-true">TRUE</div>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div className="vm-sub">
                Sealed by <b>3 / 3 validators</b> · Majority consensus · Receipt <b>0x7af3…e10c</b>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ====== CONSUMERS ====== */}
        <section className="section" id="markets" data-sec>
          <div className="shell">
            <Reveal className="sec-head">
              <div><span className="idx">02 — ONE PRIMITIVE, THREE VERTICALS</span></div>
              <div className="eyebrow">Every app below trusts the same Veritas contract</div>
            </Reveal>

            <Reveal>
              <div className="consumer-row">
                <div className="rnum">01</div>
                <div>
                  <h3 className="consumer-name display">Prediction<br />Markets</h3>
                  <p className="consumer-desc">Stake YES or NO on real-world outcomes. Veritas auto-resolves the question and pays the winners — no admin, no trusted reporter.</p>
                  <div className="consumer-tags">
                    <span className="chip">Esports</span>
                    <span className="chip">Price targets</span>
                    <span className="chip">Streamer milestones</span>
                  </div>
                </div>
                <div className="consumer-art"><div className="aspect-[16/10] rounded bg-[var(--void)] border border-[var(--line)]" /></div>
              </div>
            </Reveal>

            <Reveal>
              <div className="consumer-row" id="insurance">
                <div className="rnum">02</div>
                <div>
                  <h3 className="consumer-name display">Parametric<br />Insurance</h3>
                  <p className="consumer-desc">A policy written in plain language: &ldquo;pay 10 STT if flight BA1432 is delayed over 3 hours.&rdquo; Veritas checks the source and triggers the payout itself.</p>
                  <div className="consumer-tags">
                    <span className="chip">Flight delay</span>
                    <span className="chip">Weather</span>
                    <span className="chip">SLA breach</span>
                  </div>
                </div>
                <div className="consumer-art"><div className="aspect-[16/10] rounded bg-[var(--void)] border border-[var(--line)]" /></div>
              </div>
            </Reveal>

            <Reveal>
              <div className="consumer-row" id="disputes">
                <div className="rnum">03</div>
                <div>
                  <h3 className="consumer-name display">Dispute<br />Resolution</h3>
                  <p className="consumer-desc">Two parties submit evidence URLs for a bounty or escrow dispute. Veritas reads both sides and returns a settlement verdict that releases the funds.</p>
                  <div className="consumer-tags">
                    <span className="chip">DAO bounties</span>
                    <span className="chip">Escrow</span>
                    <span className="chip">Freelance</span>
                  </div>
                </div>
                <div className="consumer-art"><div className="aspect-[16/10] rounded bg-[var(--void)] border border-[var(--line)]" /></div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ====== RECEIPT ====== */}
        <section className="section" data-sec>
          <div className="shell">
            <Reveal className="sec-head">
              <div><span className="idx">03 — THE WOW LAYER</span></div>
              <div className="eyebrow">No other chain shows this for an AI decision</div>
            </Reveal>
            <div className="receipt-wrap">
              <Reveal>
                <h3 className="display" style={{ fontSize: "clamp(34px,4.4vw,72px)", margin: "0 0 22px" }}>
                  Every verdict<br />leaves a<br /><span style={{ color: "var(--verum)" }}>receipt.</span>
                </h3>
                <p style={{ color: "var(--stone-300)", fontSize: 16, lineHeight: 1.55, maxWidth: 420 }}>
                  After consensus, validators sign a manifest of every step: the URLs fetched, the exact prompt, the chain-of-thought, and the extracted value. Anyone can audit precisely how the on-chain judge reasoned.
                </p>
              </Reveal>
              <Reveal delay={2}>
                <div className="receipt">
                  <div className="rhead">
                    <span style={{ color: "var(--verum)", letterSpacing: "0.1em" }}>VERITAS · RECEIPT</span>
                    <span style={{ color: "var(--stone-500)" }}>#0x7af3…e10c</span>
                  </div>
                  <ul className="trace-steps">
                    <li><div className="ts-k">01 · Parse Website</div><div className="ts-v">flightradar24.com/BA1432 → arrival 04:12 UTC</div></li>
                    <li><div className="ts-k">02 · Parse Website</div><div className="ts-v">scheduled 23:55 → <span style={{ color: "var(--verum)" }}>delay 252 min</span></div></li>
                    <li><div className="ts-k">03 · LLM Inference · chain-of-thought</div><div className="ts-v">&ldquo;252 min &gt; 180 min threshold, so the policy condition is met.&rdquo;</div></li>
                  </ul>
                  <div style={{ height: 14 }} />
                  <div className="rrow"><span className="rk">VERDICT</span><span className="rv gold">TRUE</span></div>
                  <div className="rrow"><span className="rk">CONFIDENCE</span><span className="rv">0.96</span></div>
                  <div className="rrow"><span className="rk">CONSENSUS</span><span className="rv">MAJORITY · 3/3</span></div>
                  <div className="rrow"><span className="rk">VALIDATOR SIG</span><span className="rv sig">0x9c1ad4…b827f0a3</span></div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ====== WHY SOMNIA ====== */}
        <section className="section" data-sec>
          <div className="shell">
            <Reveal className="sec-head">
              <div><span className="idx">04 — WHY ONLY ON SOMNIA</span></div>
              <div className="eyebrow">A trustless AI judge needs all four at once</div>
            </Reveal>
            <Reveal>
              <div className="why-grid">
                <div className="why-cell"><span className="wn">01</span><div><h4>Deterministic consensus</h4><p>The same prompt yields byte-identical output across validators, so AI decisions become trustless.</p></div></div>
                <div className="why-cell"><span className="wn">02</span><div><h4>On-chain fetch</h4><p>Data gathering is part of validator consensus — not a single off-chain relayer you must trust.</p></div></div>
                <div className="why-cell"><span className="wn">03</span><div><h4>Sub-second finality</h4><p>Resolution feels live. A verdict lands in the time it takes to read this sentence.</p></div></div>
                <div className="why-cell"><span className="wn">04</span><div><h4>Sub-cent fees</h4><p>Micro-policies and per-question markets are finally economic at scale.</p></div></div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ====== ENTER / FOOTER ====== */}
        <section className="enter-section" data-sec>
          <div className="shell">
            <span className="eyebrow">Truth, settled on-chain</span>
            <Link href="/markets">
              <h2 className="wordmark enter-word">ENTER VERITAS</h2>
            </Link>
          </div>
          <div className="footer">
            <span className="mono">© 2026 Veritas · Somnia Agentathon</span>
            <div className="fl">
              <a className="mono" href="#loop">Primitive</a>
              <a className="mono" href="#markets">Markets</a>
              <a className="mono" href="https://github.com/OoJae/Veritas">GitHub ↗</a>
              <a className="mono" href="https://docs.somnia.network/agents">Somnia Docs ↗</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
