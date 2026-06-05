"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { insuranceVaultAbi, addresses, quoteVerdictSimple } from "@veritas/agent-template";

export function useGetPolicy(policyId: number | undefined) {
  return useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "getPolicy",
    args: policyId !== undefined ? [BigInt(policyId)] : undefined,
    query: { enabled: policyId !== undefined },
  });
}

export function useNextPolicyId() {
  return useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "nextPolicyId",
  });
}

export function useIsParticipant(policyId: number | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "isParticipant",
    args: policyId !== undefined && account ? [BigInt(policyId), account] : undefined,
    query: { enabled: policyId !== undefined && !!account },
  });
}

export function useHasClaimedPolicy(policyId: number | undefined, account: `0x${string}` | undefined) {
  return useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "hasClaimed",
    args: policyId !== undefined && account ? [BigInt(policyId), account] : undefined,
    query: { enabled: policyId !== undefined && !!account },
  });
}

export function useCreatePolicy() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function createPolicy(
    question: string,
    evidenceUrls: string[],
    premium: string,
    payoutAmount: string,
    maxParticipants: number,
    joinDuration: number
  ) {
    writeContract({
      address: addresses.insuranceVault,
      abi: insuranceVaultAbi,
      functionName: "createPolicy",
      args: [question, evidenceUrls, parseEther(premium), parseEther(payoutAmount), BigInt(maxParticipants), BigInt(joinDuration)],
    });
  }

  return { createPolicy, hash, isPending, isConfirming, isSuccess, error };
}

export function useTriggerResolutionPolicy(policyId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function triggerResolution() {
    writeContract({
      address: addresses.insuranceVault,
      abi: insuranceVaultAbi,
      functionName: "triggerResolution",
      args: [BigInt(policyId)],
      value: quoteVerdictSimple(),
    });
  }

  return { triggerResolution, hash, isPending, isConfirming, isSuccess, error };
}

export function useJoinPolicy(policyId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function joinPolicy(premium: string) {
    writeContract({
      address: addresses.insuranceVault,
      abi: insuranceVaultAbi,
      functionName: "joinPolicy",
      args: [BigInt(policyId)],
      value: parseEther(premium),
    });
  }

  return { joinPolicy, hash, isPending, isConfirming, isSuccess, error };
}

export function useClaimPayout(policyId: number) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function claimPayout() {
    writeContract({
      address: addresses.insuranceVault,
      abi: insuranceVaultAbi,
      functionName: "claimPayout",
      args: [BigInt(policyId)],
    });
  }

  return { claimPayout, hash, isPending, isConfirming, isSuccess, error };
}
