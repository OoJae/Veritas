"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { useGetPolicy, useJoinPolicy, useClaimPayout, useNextPolicyId, useIsParticipant, useHasClaimedPolicy, useTriggerResolutionPolicy } from "@/hooks/use-insurance";
import { useGetVerdict, getVerdictStageName, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const policyId = parseInt(id);
  const { isConnected, address } = useAccount();

  const { data: nextPolicyId } = useNextPolicyId();
  const { data: policy, refetch: refetchPolicy } = useGetPolicy(policyId);
  const verdictId = policy ? Number(policy.verdictId) : undefined;
  const { data: verdict } = useGetVerdict(verdictId);

  const { data: isParticipant } = useIsParticipant(policyId, address);
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimedPolicy(policyId, address);

  const { joinPolicy, isPending: joinPending, isConfirming: joinConfirming, isSuccess: joinSuccess } = useJoinPolicy(policyId);
  const { claimPayout, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimPayout(policyId);
  const { triggerResolution, isPending: triggerPending, isConfirming: triggerConfirming, isSuccess: triggerSuccess } = useTriggerResolutionPolicy(policyId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (joinSuccess || claimSuccess || pokeSuccess || triggerSuccess) {
      refetchPolicy();
      refetchClaimed();
    }
  }, [joinSuccess, claimSuccess, pokeSuccess, triggerSuccess]);

  const notFound = nextPolicyId !== undefined && policyId >= Number(nextPolicyId);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Policy not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Policy #{id} does not exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const notTriggered = policy.verdictId === BigInt(0) && !policy.resolved;
  const joinOpen = notTriggered && nowSec < policy.resolveAfter;
  const canTrigger = notTriggered && nowSec >= policy.resolveAfter;
  const resolveDate = new Date(Number(policy.resolveAfter) * 1000);

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
                <p className="text-muted-foreground">Payout / Participant</p>
                <p className="font-medium text-lg">
                  {policy.participantCount > 0
                    ? formatEther(policy.perParticipant)
                    : "—"} STT
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Participants</p>
                <p className="font-medium">{String(policy.participantCount)} / {String(policy.maxParticipants)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verdict Status</p>
                <VerdictStage stage={stage} failureReason={failureReason} />
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

        {verdict && stage === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verdict Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {failureReason ?? "No failure reason available."}
              </p>
            </CardContent>
          </Card>
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

        {canTrigger && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trigger Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The join window has closed. Anyone can trigger the AI verdict by paying the resolution fee.
              </p>
            </CardContent>
            <CardFooter>
              {isConnected ? (
                <Button onClick={() => triggerResolution()} disabled={triggerPending || triggerConfirming}>
                  {triggerPending ? "Confirm..." : triggerConfirming ? "Resolving..." : "Trigger Resolution"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Connect your wallet to trigger resolution</p>
              )}
            </CardFooter>
          </Card>
        )}

        {joinOpen && !isParticipant && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Join Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pay {formatEther(policy.premium)} STT to join this policy (open until {resolveDate.toLocaleString()}).
                If the condition is met, you receive {formatEther(policy.perParticipant)} STT.
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
                {hasClaimed
                  ? "You have already claimed your payout."
                  : `The condition was met. Claim your ${formatEther(policy.perParticipant)} STT payout.`}
              </p>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to claim</p>
              ) : hasClaimed ? (
                <p className="text-sm text-muted-foreground">Payout claimed.</p>
              ) : (
                <Button
                  onClick={() => claimPayout()}
                  disabled={claimPending || claimConfirming}
                >
                  {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Payout"}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        {policy.resolved && policy.outcome && !isParticipant && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                The condition was met, but only participants who joined before resolution can claim.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
