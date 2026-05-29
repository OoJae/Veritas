"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { veritasAbi, addresses, quoteVerdictSimple, quoteVerdictDeliberated } from "@veritas/agent-template";
import { useState, useEffect } from "react";

export function useGetVerdict(verdictId: number | undefined) {
  return useReadContract({
    address: addresses.veritas,
    abi: veritasAbi,
    functionName: "getVerdict",
    args: verdictId !== undefined ? [BigInt(verdictId)] : undefined,
    query: { enabled: verdictId !== undefined },
  });
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

    async function fetchReason() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { chain } = await import("@/app/providers");
        const client = createPublicClient({
          chain,
          transport: http(),
        });
        const logs = await client.getContractEvents({
          address: addresses.veritas,
          abi: veritasAbi,
          eventName: "VerdictFailed",
          args: { verdictId: BigInt(verdictId!) },
          fromBlock: 0n,
          toBlock: "latest",
        });
        if (logs.length > 0 && logs[0].args.reason) {
          setReason(logs[0].args.reason);
        }
      } catch (err) {
        console.error("Failed to fetch verdict failure reason:", err);
      }
    }

    fetchReason();
  }, [verdictId, isFailed]);

  return reason;
}
