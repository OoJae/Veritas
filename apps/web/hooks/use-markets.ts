"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { predictionMarketAbi, addresses } from "@veritas/agent-template";
import { quoteVerdictSimple } from "@veritas/agent-template";

export function useGetMarket(marketId: number | undefined) {
  return useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "getMarket",
    args: marketId !== undefined ? [BigInt(marketId)] : undefined,
    query: { enabled: marketId !== undefined },
  });
}

export function useNextMarketId() {
  return useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "nextMarketId",
  });
}

export function useYesStake(marketId: number | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "yesStakes",
    args: marketId !== undefined && account ? [BigInt(marketId), account] : undefined,
    query: { enabled: marketId !== undefined && !!account },
  });
}

export function useNoStake(marketId: number | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "noStakes",
    args: marketId !== undefined && account ? [BigInt(marketId), account] : undefined,
    query: { enabled: marketId !== undefined && !!account },
  });
}

export function useMarketClaimed(marketId: number | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: addresses.predictionMarket,
    abi: predictionMarketAbi,
    functionName: "claimed",
    args: marketId !== undefined && account ? [BigInt(marketId), account] : undefined,
    query: { enabled: marketId !== undefined && !!account },
  });
}

export function useCreateMarket() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function createMarket(question: string, evidenceUrls: string[]) {
    writeContract({
      address: addresses.predictionMarket,
      abi: predictionMarketAbi,
      functionName: "createMarket",
      args: [question, evidenceUrls],
      value: quoteVerdictSimple(),
    });
  }

  return { createMarket, hash, isPending, isConfirming, isSuccess, error };
}

export function useStakeYes(marketId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function stakeYes(amount: string) {
    writeContract({
      address: addresses.predictionMarket,
      abi: predictionMarketAbi,
      functionName: "stakeYes",
      args: [BigInt(marketId)],
      value: parseEther(amount),
    });
  }

  return { stakeYes, hash, isPending, isConfirming, isSuccess, error };
}

export function useStakeNo(marketId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function stakeNo(amount: string) {
    writeContract({
      address: addresses.predictionMarket,
      abi: predictionMarketAbi,
      functionName: "stakeNo",
      args: [BigInt(marketId)],
      value: parseEther(amount),
    });
  }

  return { stakeNo, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaim(marketId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function claim() {
    writeContract({
      address: addresses.predictionMarket,
      abi: predictionMarketAbi,
      functionName: "claim",
      args: [BigInt(marketId)],
    });
  }

  return { claim, hash, isPending, isConfirming, isSuccess, error };
}
