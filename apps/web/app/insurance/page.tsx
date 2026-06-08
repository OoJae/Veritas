"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{policy.question}</CardTitle>
            {policy.resolved ? (
              <BoolBadge value={policy.outcome} trueLabel="Paid" falseLabel="No Payout" />
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Premium</p>
              <p className="font-medium">{formatEther(policy.premium)} STT</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payout / Participant</p>
              <p className="font-medium">
                {policy.participantCount > 0
                  ? formatEther(policy.perParticipant)
                  : "—"} STT
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Participants</p>
              <p className="font-medium">{String(policy.participantCount)} / {String(policy.maxParticipants)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function InsurancePage() {
  const { data: nextId } = useNextPolicyId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="eyebrow mb-1">Parametric Insurance</p>
            <h1 className="font-display text-3xl">Policies</h1>
            <p className="text-muted-foreground mt-1">
              Auto-paying insurance verified by AI
            </p>
          </div>
          <Link href="/insurance/create">
            <Button>Create Policy</Button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No policies yet</p>
            <p className="text-sm mt-1">Be the first to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <PolicyCard key={id} id={id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
