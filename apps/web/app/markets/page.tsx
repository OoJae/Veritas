"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BoolBadge } from "@/components/verdict-display";
import { useNextMarketId } from "@/hooks/use-markets";
import { predictionMarketAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";

function MarketCard({ id }: { id: number }) {
  const { data: market } = useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "getMarket",
    args: [BigInt(id)],
  });

  if (!market) return null;

  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > BigInt(0) ? Number((market.yesPool * BigInt(100)) / totalPool) : 50;
  const noPct = 100 - yesPct;
  const nowSec = Math.floor(Date.now() / 1000);
  const resolveAfter = Number(market.resolveAfter);
  const isResolved = market.resolved;
  const isTriggered = market.verdictId !== BigInt(0);
  const isOpen = !isTriggered && !isResolved && nowSec < resolveAfter;

  const timeLeft = isOpen ? resolveAfter - nowSec : 0;
  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const timeStr = days > 0 ? `${days}D ${hours}H` : `${hours}H`;

  return (
    <Link href={`/markets/${id}`}>
      <div className="card-brand">
        <div className="card-top">
          <div className="card-q">{market.question}</div>
          {isResolved ? (
            <BoolBadge value={market.outcome} trueLabel="Resolved · YES" falseLabel="Resolved · NO" />
          ) : isOpen ? (
            <span className="st st--active"><span className="dot" />Active</span>
          ) : (
            <span className="st st--resolved">Awaiting resolution</span>
          )}
        </div>
        <div className="split">
          <div className="split-l">
            <span className="y">YES {yesPct}%</span>
            <span className="n">NO {noPct}%</span>
          </div>
          <div className="split-bar">
            <span className="y" style={{ width: `${yesPct}%` }} />
            <span className="n" style={{ width: `${noPct}%` }} />
          </div>
        </div>
        <div className="pool">
          POOL · {formatEther(totalPool)} STT{isOpen ? ` · CLOSES IN ${timeStr}` : isResolved ? " · RESOLVED" : ""}
        </div>
      </div>
    </Link>
  );
}

export default function MarketsPage() {
  const { data: nextId } = useNextMarketId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <div className="page-head">
          <div>
            <span className="eyebrow">01 — Prediction Markets</span>
            <h1>Markets</h1>
            <p className="sub">Stake on real-world outcomes. Each market is resolved by a consensus-verified AI verdict.</p>
          </div>
          <Link href="/markets/create">
            <button className="b b--gold">Create market <span>+</span></button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-[var(--stone-400)]">
            <p className="text-lg">No markets yet</p>
            <p className="text-sm mt-1">Be the first to create one</p>
          </div>
        ) : (
          <div className="cards">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <MarketCard key={id} id={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
