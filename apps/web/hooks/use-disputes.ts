"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { disputeArbiterAbi, addresses, quoteVerdictSimple } from "@veritas/agent-template";

export function useGetDispute(disputeId: number | undefined) {
  return useReadContract({
    address: addresses.disputeArbiter,
    abi: disputeArbiterAbi,
    functionName: "getDispute",
    args: disputeId !== undefined ? [BigInt(disputeId)] : undefined,
    query: { enabled: disputeId !== undefined },
  });
}

export function useNextDisputeId() {
  return useReadContract({
    address: addresses.disputeArbiter,
    abi: disputeArbiterAbi,
    functionName: "nextDisputeId",
  });
}

export function useRaiseDispute() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function raiseDispute(respondent: string, question: string, evidenceUrls: string[], bounty: string) {
    writeContract({
      address: addresses.disputeArbiter,
      abi: disputeArbiterAbi,
      functionName: "raiseDispute",
      args: [respondent as `0x${string}`, question, evidenceUrls],
      value: parseEther(bounty),
    });
  }

  return { raiseDispute, hash, isPending, isConfirming, isSuccess, error };
}

export function useSubmitEvidence(disputeId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function submitEvidence(evidenceUrls: string[]) {
    writeContract({
      address: addresses.disputeArbiter,
      abi: disputeArbiterAbi,
      functionName: "submitEvidence",
      args: [BigInt(disputeId), evidenceUrls],
    });
  }

  return { submitEvidence, hash, isPending, isConfirming, isSuccess, error };
}

export function useResolveDispute(disputeId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function resolveDispute() {
    writeContract({
      address: addresses.disputeArbiter,
      abi: disputeArbiterAbi,
      functionName: "resolveDispute",
      args: [BigInt(disputeId)],
      value: quoteVerdictSimple(),
    });
  }

  return { resolveDispute, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimBounty(disputeId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function claimBounty() {
    writeContract({
      address: addresses.disputeArbiter,
      abi: disputeArbiterAbi,
      functionName: "claimBounty",
      args: [BigInt(disputeId)],
    });
  }

  return { claimBounty, hash, isPending, isConfirming, isSuccess, error };
}
