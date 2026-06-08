"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{dispute.question}</CardTitle>
            {dispute.resolved ? (
              <Badge variant="default">Resolved</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimant</span>
              <span className="font-mono">{truncate(dispute.claimant)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Respondent</span>
              <span className="font-mono">{truncate(dispute.respondent)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bounty</span>
              <span className="font-medium">{formatEther(dispute.bounty)} STT</span>
            </div>
            {dispute.resolved && dispute.winner !== "0x0000000000000000000000000000000000000000" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Winner</span>
                <span className="font-mono text-[var(--verum)]">{truncate(dispute.winner)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DisputesPage() {
  const { data: nextId } = useNextDisputeId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="eyebrow mb-1">Dispute Resolution</p>
            <h1 className="font-display text-3xl">Disputes</h1>
            <p className="text-muted-foreground mt-1">
              AI-judged resolution with bounty incentives
            </p>
          </div>
          <Link href="/disputes/create">
            <Button>Raise Dispute</Button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No disputes yet</p>
            <p className="text-sm mt-1">Be the first to raise one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <DisputeCard key={id} id={id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
