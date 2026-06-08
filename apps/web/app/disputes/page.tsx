"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useNextDisputeId } from "@/hooks/use-disputes";
import { disputeArbiterAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";

function DisputeCard({ id }: { id: number }) {
  const { data: dispute } = useReadContract({
    address: addresses.disputeArbiter,
    abi: disputeArbiterAbi,
    functionName: "getDispute",
    args: [BigInt(id)],
  });

  if (!dispute) return null;

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Link href={`/disputes/${id}`}>
      <div className="card-brand">
        <div className="card-top">
          <div className="card-q">{dispute.question}</div>
          {dispute.resolved ? (
            <span className="st st--resolved"><span className="dot" />Resolved</span>
          ) : (
            <span className="st st--active"><span className="dot" />Active</span>
          )}
        </div>
        <div className="card-meta">
          <div className="kv">
            <div className="k">Claimant</div>
            <div className="v mono">{truncate(dispute.claimant)}</div>
          </div>
          <div className="kv">
            <div className="k">Respondent</div>
            <div className="v mono">{truncate(dispute.respondent)}</div>
          </div>
          <div className="kv">
            <div className="k">Bounty</div>
            <div className="v gold">{formatEther(dispute.bounty)} STT</div>
          </div>
          {dispute.resolved && dispute.winner !== "0x0000000000000000000000000000000000000000" && (
            <div className="kv">
              <div className="k">Winner</div>
              <div className="v mono" style={{ color: "var(--verum)" }}>{truncate(dispute.winner)}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DisputesPage() {
  const { data: nextId } = useNextDisputeId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <div className="page-head">
          <div>
            <span className="eyebrow">Dispute Resolution</span>
            <h1>Disputes</h1>
            <p className="sub">AI-judged resolution with bounty incentives</p>
          </div>
          <Link href="/disputes/create">
            <button className="b b--gold">Raise Dispute <span>+</span></button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-[var(--stone-400)]">
            <p className="text-lg">No disputes yet</p>
            <p className="text-sm mt-1">Be the first to raise one</p>
          </div>
        ) : (
          <div className="cards">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <DisputeCard key={id} id={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
