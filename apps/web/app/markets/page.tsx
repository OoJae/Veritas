"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Link href={`/markets/${id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{market.question}</CardTitle>
            {market.resolved ? (
              <BoolBadge value={market.outcome} trueLabel="YES" falseLabel="NO" />
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--verum)]">YES {yesPct}%</span>
              <span className="text-[var(--stone)]">NO {noPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-secondary">
              <div
                className="h-full bg-[var(--verum)] transition-all"
                style={{ width: `${yesPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Total pool: {formatEther(totalPool)} STT
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MarketsPage() {
  const { data: nextId } = useNextMarketId();
  const count = nextId ? Number(nextId) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="eyebrow mb-1">Prediction Markets</p>
            <h1 className="font-display text-3xl">Markets</h1>
            <p className="text-muted-foreground mt-1">
              Stake on AI-verifiable outcomes
            </p>
          </div>
          <Link href="/markets/create">
            <Button>Create Market</Button>
          </Link>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No markets yet</p>
            <p className="text-sm mt-1">Be the first to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, i) => count - 1 - i).map((id) => (
              <MarketCard key={id} id={id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
