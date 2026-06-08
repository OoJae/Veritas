"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BoolBadge } from "@/components/verdict-display";
import { useNextPolicyId } from "@/hooks/use-insurance";
import { insuranceVaultAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";

function PolicyCard({ id }: { id: number }) {
  const { data: policy } = useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "getPolicy",
    args: [BigInt(id)],
  });

  if (!policy) return null;

  return (
    <Link href={`/insurance/${id}`}>
      <div className="card-brand">
        <div className="card-top">
          <div className="card-q">{policy.question}</div>
          {policy.resolved ? (
            <BoolBadge value={policy.outcome} trueLabel="Paid" falseLabel="No Payout" />
          ) : (
            <span className="st st--active"><span className="dot" />Active</span>
          )}
        </div>
        <div className="card-meta">
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
        </div>
      </div>
    </Link>
  );
}

export default function InsurancePage() {
  const { data: nextId } = useNextPolicyId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <div className="page-head">
          <div>
            <span className="eyebrow">Parametric Insurance</span>
            <h1>Policies</h1>
            <p className="sub">Auto-paying insurance verified by AI</p>
          </div>
          <Link href="/insurance/create">
            <button className="b b--gold">Create Policy <span>+</span></button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-[var(--stone-400)]">
            <p className="text-lg">No policies yet</p>
            <p className="text-sm mt-1">Be the first to create one</p>
          </div>
        ) : (
          <div className="cards">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <PolicyCard key={id} id={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
