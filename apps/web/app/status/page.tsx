"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { veritasAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";

const VERTICALS: Record<string, { name: string; href: string }> = {
  [addresses.predictionMarket.toLowerCase()]: { name: "Market", href: "/markets" },
  [addresses.insuranceVault.toLowerCase()]: { name: "Insurance", href: "/insurance" },
  [addresses.disputeArbiter.toLowerCase()]: { name: "Dispute", href: "/disputes" },
};

function getVertical(payoutTarget: string): { name: string; href: string } | null {
  return VERTICALS[payoutTarget.toLowerCase()] ?? null;
}

function VerdictRow({ id }: { id: number }) {
  const { data: verdict } = useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: [BigInt(id)],
  });

  if (!verdict) return null;

  const stage = Number(verdict.stage);
  const vertical = getVertical(verdict.payoutTarget);
  const linkHref = vertical ? `${vertical.href}/${id}` : undefined;

  const content = (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-sm font-mono text-muted-foreground shrink-0">#{id}</span>
          <p className="text-sm font-medium truncate">{verdict.question}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {vertical && (
            <Badge variant="secondary">{vertical.name}</Badge>
          )}
          <VerdictStage stage={stage} />
          {stage === 3 && (
            <BoolBadge value={verdict.result} trueLabel="YES" falseLabel="NO" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (linkHref) {
    return <Link href={linkHref}>{content}</Link>;
  }
  return content;
}

export default function StatusPage() {
  const { data: nextId } = useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "nextVerdictId",
  });

  const count = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground mt-1">
            All verdicts across every vertical
          </p>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No verdicts yet</p>
            <p className="text-sm mt-1">Create a market, policy, or dispute to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ids.map((id) => (
              <VerdictRow key={id} id={id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
