"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { useGetPolicy, useJoinPolicy, useClaimPayout } from "@/hooks/use-insurance";
import { useGetVerdict, getVerdictStageName, usePokeVerdict } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { insuranceVaultAbi, addresses } from "@veritas/agent-template";
import { useReadContract } from "wagmi";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const policyId = parseInt(id);
  const { isConnected, address } = useAccount();

  const { data: policy, refetch: refetchPolicy } = useGetPolicy(policyId);
  const verdictId = policy ? Number(policy.verdictId) : undefined;
  const { data: verdict } = useGetVerdict(verdictId);

  const { data: isParticipant } = useReadContract({
    address: addresses.insuranceVault,
    abi: insuranceVaultAbi,
    functionName: "isParticipant",
    args: address && policy ? [BigInt(policyId), address] : undefined,
    query: { enabled: !!address && !!policy },
  });

  const { joinPolicy, isPending: joinPending, isConfirming: joinConfirming, isSuccess: joinSuccess } = useJoinPolicy(policyId);
  const { claimPayout, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimPayout(policyId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  useEffect(() => {
    if (joinSuccess || claimSuccess || pokeSuccess) {
      refetchPolicy();
    }
  }, [joinSuccess, claimSuccess, pokeSuccess]);

  if (!policy) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading policy...</p>
        </main>
      </div>
    );
  }

  const stage = verdict ? Number(verdict.stage) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xl">{policy.question}</CardTitle>
              {policy.resolved ? (
                <BoolBadge value={policy.outcome} trueLabel="Paid Out" falseLabel="No Payout" />
              ) : (
                <Badge variant="outline">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Premium</p>
                <p className="font-medium text-lg">{formatEther(policy.premium)} STT</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payout</p>
                <p className="font-medium text-lg">{formatEther(policy.payoutAmount)} STT</p>
              </div>
              <div>
                <p className="text-muted-foreground">Participants</p>
                <p className="font-medium">{String(policy.participantCount)} / {String(policy.maxParticipants)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verdict Status</p>
                <VerdictStage stage={stage} />
              </div>
            </div>
            {stage === 3 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AI Verdict</span>
                <BoolBadge value={policy.outcome} trueLabel="Condition Met" falseLabel="Condition Not Met" />
              </div>
            )}
          </CardContent>
        </Card>

        {verdict && stage === 3 && verdict.lastRequestId > BigInt(0) && (
          <ReasoningTrace requestId={verdict.lastRequestId} />
        )}

        {verdict && (stage === 1 || stage === 2) && verdict.deadline < BigInt(Math.floor(Date.now() / 1000)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verdict Stuck</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The verdict deadline has passed. Somnia Reactivity will auto-poke this verdict. You can also poke manually.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => poke()}
                disabled={pokePending || pokeConfirming}
              >
                {pokePending ? "Confirm..." : pokeConfirming ? "Poking..." : "Poke to Failed"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {!policy.resolved && !isParticipant && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Join Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pay {formatEther(policy.premium)} STT to join this policy.
                If the condition is met, you receive {formatEther(policy.payoutAmount)} STT.
              </p>
            </CardContent>
            <CardFooter>
              {isConnected ? (
                <Button
                  onClick={() => joinPolicy(formatEther(policy.premium))}
                  disabled={joinPending || joinConfirming || Number(policy.participantCount) >= Number(policy.maxParticipants)}
                >
                  {joinPending ? "Confirm..." : joinConfirming ? "Joining..." : "Join Policy"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Connect your wallet to join</p>
              )}
            </CardFooter>
          </Card>
        )}

        {isParticipant && !policy.resolved && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-green-400">You are a participant in this policy. Waiting for resolution.</p>
            </CardContent>
          </Card>
        )}

        {policy.resolved && policy.outcome && isParticipant && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claim Payout</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The condition was met. Claim your {formatEther(policy.payoutAmount)} STT payout.
              </p>
            </CardContent>
            <CardFooter>
              {isConnected ? (
                <Button
                  onClick={() => claimPayout()}
                  disabled={claimPending || claimConfirming}
                >
                  {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Payout"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Connect your wallet to claim</p>
              )}
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
