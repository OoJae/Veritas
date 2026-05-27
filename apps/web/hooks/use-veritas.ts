"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { veritasAbi, addresses, quoteVerdictSimple, quoteVerdictDeliberated } from "@veritas/agent-template";

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
