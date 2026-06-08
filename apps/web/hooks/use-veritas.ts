"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import type { PublicClient } from "viem";
import { veritasAbi, addresses, quoteVerdictSimple, quoteVerdictDeliberated } from "@veritas/agent-template";
import { useState, useEffect } from "react";

// Somnia RPC rejects event queries spanning more than 1000 blocks.
const SOMNIA_BLOCK_LIMIT = 1000;

/**
 * Search backwards from `toBlock` in 1000-block chunks for matching logs.
 * Returns the first chunk that contains at least one match, or an empty array
 * if nothing is found within `maxBlocks`.
 */
async function scanLogsBackwards(
  client: PublicClient,
  params: {
    address: `0x${string}`;
    abi: readonly unknown[];
    eventName: string;
    args?: Record<string, unknown>;
    toBlock: bigint;
    maxBlocks?: bigint;
  }
): Promise<unknown[]> {
  const { address, abi, eventName, args, toBlock, maxBlocks = 500_000n } = params;
  const chunkSize = BigInt(SOMNIA_BLOCK_LIMIT);
  let cursor = toBlock;
  const lowerBound = toBlock > maxBlocks ? toBlock - maxBlocks : 0n;

  while (cursor >= lowerBound) {
    const fromBlock = cursor >= chunkSize ? cursor - chunkSize + 1n : 0n;
    try {
      const logs = await client.getContractEvents({
        address,
        abi,
        eventName,
        args,
        fromBlock,
        toBlock: cursor,
      });
      if (logs.length > 0) return logs;
    } catch {
      // RPC error (likely block range) — try a smaller chunk
      const halfChunk = chunkSize / 2n;
      if (halfChunk < 10n) break;
      // Retry this range with a smaller window
      try {
        const logs = await client.getContractEvents({
          address,
          abi,
          eventName,
          args,
          fromBlock: cursor >= halfChunk ? cursor - halfChunk + 1n : 0n,
          toBlock: cursor,
        });
        if (logs.length > 0) return logs;
      } catch {
        // Give up on this chunk
      }
    }
    cursor = fromBlock - 1n;
    if (cursor <= 0n) break;
  }
  return [];
}

export function useGetVerdict(verdictId: number | undefined) {
  const result = useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: verdictId !== undefined ? [BigInt(verdictId)] : undefined,
    query: { enabled: verdictId !== undefined },
  });

  // Once we have data, check if the verdict is still in progress and
  // start a second observer that polls. Both observers share the same
  // TanStack Query cache key so the polling observer keeps the cache fresh
  // and the first observer picks up the new data.
  const stage = result.data ? Number((result.data as unknown as { stage: number }).stage) : 0;
  const inProgress = stage === 1 || stage === 2;

  useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: verdictId !== undefined ? [BigInt(verdictId)] : undefined,
    query: {
      enabled: verdictId !== undefined && inProgress,
      refetchInterval: 4000,
    },
  });

  return result;
}

export function useQuoteVerdict(mode: 0 | 1, numEvidenceUrls: number) {
  if (mode === 0) return formatEther(quoteVerdictSimple());
  return formatEther(quoteVerdictDeliberated(numEvidenceUrls));
}

export function getVerdictStageName(stage: number): string {
  const names: Record<number, string> = {
    0: "Idle",
    1: "Fetching Evidence",
    2: "Reasoning",
    3: "Resolved",
    4: "Failed",
  };
  return names[stage] ?? "Unknown";
}

export function usePokeVerdict(verdictId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function poke() {
    writeContract({
      address: addresses.veritas,
      abi: veritasAbi,
      functionName: "poke",
      args: [BigInt(verdictId)],
    });
  }

  return { poke, hash, isPending, isConfirming, isSuccess, error };
}

export function useVerdictFailureReason(verdictId: number | undefined, isFailed: boolean) {
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!isFailed || verdictId === undefined) return;

    let cancelled = false;

    async function fetchReason() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { chain } = await import("@/app/providers");
        const client = createPublicClient({ chain, transport: http() });

        const latest = await client.getBlockNumber();
        const logs = await scanLogsBackwards(client, {
          address: addresses.veritas,
          abi: veritasAbi,
          eventName: "VerdictFailed",
          args: { verdictId: BigInt(verdictId!) },
          toBlock: latest,
        });

        if (!cancelled && logs.length > 0) {
          const log = logs[0] as { args?: { reason?: string } };
          if (log.args?.reason) setReason(log.args.reason);
        }
      } catch (err) {
        console.error("Failed to fetch verdict failure reason:", err);
      }
    }

    fetchReason();
    return () => { cancelled = true; };
  }, [verdictId, isFailed]);

  return reason;
}
