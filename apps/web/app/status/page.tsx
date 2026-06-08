"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { BoolBadge } from "@/components/verdict-display";
import { veritasAbi, predictionMarketAbi, insuranceVaultAbi, disputeArbiterAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";

const VERTICALS: Record<string, { name: string; href: string }> = {
  [addresses.predictionMarket.toLowerCase()]: { name: "Market", href: "/markets" },
  [addresses.insuranceVault.toLowerCase()]: { name: "Insurance", href: "/insurance" },
  [addresses.disputeArbiter.toLowerCase()]: { name: "Dispute", href: "/disputes" },
};

function getVertical(payoutTarget: string): { name: string; href: string } | null {
  return VERTICALS[payoutTarget.toLowerCase()] ?? null;
}

const SOMNIA_BLOCK_LIMIT = 1000;

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
        // Skip
      }
    }
    cursor = fromBlock - 1n;
    if (cursor <= 0n) break;
  }
  return map;
}

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

async function scanInsuranceResolutionEvents(toBlock: bigint): Promise<Map<number, number>> {
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
        address: addresses.insuranceVault,
        abi: insuranceVaultAbi,
        eventName: "ResolutionTriggered",
        fromBlock,
        toBlock: cursor,
      });
      for (const log of logs) {
        const { policyId, verdictId } = log.args as { policyId: bigint; verdictId: bigint };
        map.set(Number(verdictId), Number(policyId));
      }
    } catch {
      try {
        const halfChunk = chunkSize / 2n;
        const logs = await client.getContractEvents({
          address: addresses.insuranceVault,
          abi: insuranceVaultAbi,
          eventName: "ResolutionTriggered",
          fromBlock: cursor >= halfChunk ? cursor - halfChunk + 1n : 0n,
          toBlock: cursor,
        });
        for (const log of logs) {
          const { policyId, verdictId } = log.args as { policyId: bigint; verdictId: bigint };
          map.set(Number(verdictId), Number(policyId));
        }
      } catch {
        // Skip
      }
    }
    cursor = fromBlock - 1n;
    if (cursor <= 0n) break;
  }
  return map;
}

function useVerdictToPolicyMap() {
  const [map, setMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function fetchMapping() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { chain } = await import("@/app/providers");
        const client = createPublicClient({ chain, transport: http() });
        const latest = await client.getBlockNumber();
        const m = await scanInsuranceResolutionEvents(latest);
        if (!cancelled) setMap(m);
      } catch (err) {
        console.error("Failed to fetch Insurance ResolutionTriggered events:", err);
      }
    }
    fetchMapping();
    return () => { cancelled = true; };
  }, []);

  return map;
}

async function scanDisputeResolutionEvents(toBlock: bigint): Promise<Map<number, number>> {
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
        address: addresses.disputeArbiter,
        abi: disputeArbiterAbi,
        eventName: "ResolutionTriggered",
        fromBlock,
        toBlock: cursor,
      });
      for (const log of logs) {
        const { disputeId, verdictId } = log.args as { disputeId: bigint; verdictId: bigint };
        map.set(Number(verdictId), Number(disputeId));
      }
    } catch {
      try {
        const halfChunk = chunkSize / 2n;
        const logs = await client.getContractEvents({
          address: addresses.disputeArbiter,
          abi: disputeArbiterAbi,
          eventName: "ResolutionTriggered",
          fromBlock: cursor >= halfChunk ? cursor - halfChunk + 1n : 0n,
          toBlock: cursor,
        });
        for (const log of logs) {
          const { disputeId, verdictId } = log.args as { disputeId: bigint; verdictId: bigint };
          map.set(Number(verdictId), Number(disputeId));
        }
      } catch {
        // Skip
      }
    }
    cursor = fromBlock - 1n;
    if (cursor <= 0n) break;
  }
  return map;
}

function useVerdictToDisputeMap() {
  const [map, setMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function fetchMapping() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { chain } = await import("@/app/providers");
        const client = createPublicClient({ chain, transport: http() });
        const latest = await client.getBlockNumber();
        const m = await scanDisputeResolutionEvents(latest);
        if (!cancelled) setMap(m);
      } catch (err) {
        console.error("Failed to fetch Dispute ResolutionTriggered events:", err);
      }
    }
    fetchMapping();
    return () => { cancelled = true; };
  }, []);

  return map;
}

function VerdictRow({ id, verdictToMarket, verdictToPolicy, verdictToDispute }: { id: number; verdictToMarket: Map<number, number>; verdictToPolicy: Map<number, number>; verdictToDispute: Map<number, number> }) {
  const { data: verdict } = useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: [BigInt(id)],
  });

  if (!verdict) return null;

  const stage = Number(verdict.stage);
  const vertical = getVertical(verdict.payoutTarget);

  let linkHref: string | undefined;
  if (vertical) {
    if (vertical.name === "Market") {
      const marketId = verdictToMarket.get(id);
      linkHref = marketId !== undefined ? `/markets/${marketId}` : undefined;
    } else if (vertical.name === "Insurance") {
      const policyId = verdictToPolicy.get(id);
      linkHref = policyId !== undefined ? `/insurance/${policyId}` : undefined;
    } else if (vertical.name === "Dispute") {
      const disputeId = verdictToDispute.get(id);
      linkHref = disputeId !== undefined ? `/disputes/${disputeId}` : undefined;
    } else {
      linkHref = `${vertical.href}/${id}`;
    }
  }

  const stageLabel = stage === 3 ? (verdict.result ? "TRUE" : "FALSE") : stage === 4 ? "FAILED" : stage === 1 ? "FETCHING" : stage === 2 ? "REASONING" : "PENDING";
  const stageClass = stage === 3 ? (verdict.result ? "st--true" : "st--false") : stage === 4 ? "st--false" : "st--active";

  const content = (
    <div className="feed-row">
      <span className="fid">#{String(id).padStart(4, "0")}</span>
      <span className="fq">{verdict.question}</span>
      <span className="fmeta">{vertical?.name ?? "—"}</span>
      <span className={`st ${stageClass}`}>{stageLabel}</span>
    </div>
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
  const verdictToPolicy = useVerdictToPolicyMap();
  const verdictToDispute = useVerdictToDisputeMap();
  const count = nextId ? Number(nextId) : 0;
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page">
        <div className="page-head">
          <div>
            <span className="eyebrow">04 — Network</span>
            <h1>Status</h1>
            <p className="sub">Every verdict Veritas has sealed across all three verticals.</p>
          </div>
        </div>

        {/* Stat grid placeholder — will populate with real data */}
        <div className="stat-grid">
          <div className="stat"><div className="n gold">{count}</div><div className="l">Verdicts sealed</div></div>
          <div className="stat"><div className="n">—</div><div className="l">Consensus rate</div></div>
          <div className="stat"><div className="n">—</div><div className="l">Median resolution</div></div>
          <div className="stat"><div className="n">0.33</div><div className="l">Avg cost (STT)</div></div>
        </div>

        {count === 0 ? (
          <div className="text-center py-20 text-[var(--stone-400)]">
            <p className="text-lg">No verdicts yet</p>
            <p className="text-sm mt-1">Create a market, policy, or dispute to get started</p>
          </div>
        ) : (
          <div className="feed">
            {ids.map((id) => (
              <VerdictRow key={id} id={id} verdictToMarket={verdictToMarket} verdictToPolicy={verdictToPolicy} verdictToDispute={verdictToDispute} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
