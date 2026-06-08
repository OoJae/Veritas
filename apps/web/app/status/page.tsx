"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { veritasAbi, predictionMarketAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";

const VERTICALS: Record<string, { name: string; href: string }> = {
  [addresses.predictionMarket.toLowerCase()]: { name: "Market", href: "/markets" },
  [addresses.insuranceVault.toLowerCase()]: { name: "Insurance", href: "/insurance" },
  [addresses.disputeArbiter.toLowerCase()]: { name: "Dispute", href: "/disputes" },
};

function getVertical(payoutTarget: string): { name: string; href: string } | null {
  return VERTICALS[payoutTarget.toLowerCase()] ?? null;
}

// Somnia RPC rejects event queries spanning more than 1000 blocks.
const SOMNIA_BLOCK_LIMIT = 1000;

/**
 * Scan backwards from `toBlock` in 1000-block chunks for `ResolutionTriggered`
 * events. Returns ALL matches found within the search window (up to 500k blocks).
 */
async function scanResolutionEvents(toBlock: bigint): Promise<Map<number, number>> {
  const { createPublicClient, http } = await import("viem");
  const { chain } = await import("@/app/providers");
  const client = createPublicClient({ chain, transport: http() });

  const map = new Map<number, number>();
  const chunkSize = BigInt(SOMNIA_BLOCK_LIMIT);
  const maxBlocks = 500_000n;
  let cursor = toBlock;
  const lowerBound = toBlock > maxBlocks ? toBlock - maxBlocks : 0n;

  while (cursor >= lowerBound) {
    const fromBlock = cursor >= chunkSize ? cursor - chunkSize + 1n : 0n;
    try {
      const logs = await client.getContractEvents({
        address: addresses.predictionMarket,
        abi: predictionMarketAbi,
        eventName: "ResolutionTriggered",
        fromBlock,
        toBlock: cursor,
      });
      for (const log of logs) {
        const { marketId, verdictId } = log.args as { marketId: bigint; verdictId: bigint };
        map.set(Number(verdictId), Number(marketId));
      }
    } catch {
      // Smaller retry
      try {
        const halfChunk = chunkSize / 2n;
        const logs = await client.getContractEvents({
          address: addresses.predictionMarket,
          abi: predictionMarketAbi,
          eventName: "ResolutionTriggered",
          fromBlock: cursor >= halfChunk ? cursor - halfChunk + 1n : 0n,
          toBlock: cursor,
        });
        for (const log of logs) {
          const { marketId, verdictId } = log.args as { marketId: bigint; verdictId: bigint };
          map.set(Number(verdictId), Number(marketId));
        }
      } catch {
        // Skip this chunk
      }
    }
    cursor = fromBlock - 1n;
    if (cursor <= 0n) break;
  }
  return map;
}

/**
 * Build a verdictId → marketId map by scanning ResolutionTriggered events.
 * This is needed because verdict IDs are global across all verticals, so
 * verdictId != marketId when other verticals (insurance, disputes) also
 * create verdicts.
 */
function useVerdictToMarketMap() {
  const [map, setMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function fetchMapping() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { chain } = await import("@/app/providers");
        const client = createPublicClient({ chain, transport: http() });
        const latest = await client.getBlockNumber();

        const m = await scanResolutionEvents(latest);
        if (!cancelled) setMap(m);
      } catch (err) {
        console.error("Failed to fetch ResolutionTriggered events:", err);
      }
    }

    fetchMapping();
    return () => { cancelled = true; };
  }, []);

  return map;
}

function VerdictRow({ id, verdictToMarket }: { id: number; verdictToMarket: Map<number, number> }) {
  const { data: verdict } = useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: [BigInt(id)],
  });

  if (!verdict) return null;

  const stage = Number(verdict.stage);
  const vertical = getVertical(verdict.payoutTarget);

  // Resolve the correct entity ID for the link:
  // For markets, use the marketId from the ResolutionTriggered event (not the verdictId).
  // For other verticals, the ID mapping isn't available yet — fall back to the verdictId.
  let linkHref: string | undefined;
  if (vertical) {
    if (vertical.name === "Market") {
      const marketId = verdictToMarket.get(id);
      linkHref = marketId !== undefined ? `/markets/${marketId}` : undefined;
    } else {
      linkHref = `${vertical.href}/${id}`;
    }
  }

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

  const verdictToMarket = useVerdictToMarketMap();
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
              <VerdictRow key={id} id={id} verdictToMarket={verdictToMarket} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
