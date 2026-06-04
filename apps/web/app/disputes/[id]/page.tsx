"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VerdictStage } from "@/components/verdict-display";
import { useGetDispute, useSubmitEvidence, useResolveDispute, useClaimBounty, useNextDisputeId } from "@/hooks/use-disputes";
import { useGetVerdict, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const disputeId = parseInt(id);
  const { isConnected, address } = useAccount();

  const { data: nextDisputeId } = useNextDisputeId();
  const { data: dispute, refetch: refetchDispute } = useGetDispute(disputeId);
  const verdictId = dispute ? Number(dispute.verdictId) : undefined;
  const { data: verdict } = useGetVerdict(verdictId);

  const [evidenceUrl, setEvidenceUrl] = useState("");

  const isRespondent = address && dispute && address.toLowerCase() === dispute.respondent.toLowerCase();
  const isClaimant = address && dispute && address.toLowerCase() === dispute.claimant.toLowerCase();
  const evidenceDeadline = dispute ? Number(dispute.evidenceDeadline) : 0;
  const now = Math.floor(Date.now() / 1000);
  const evidenceWindowOpen = !dispute?.resolved && evidenceDeadline > now;

  const { submitEvidence, isPending: submitPending, isConfirming: submitConfirming, isSuccess: submitSuccess } = useSubmitEvidence(disputeId);
  const { resolveDispute, isPending: resolvePending, isConfirming: resolveConfirming, isSuccess: resolveSuccess } = useResolveDispute(disputeId);
  const { claimBounty, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaimBounty(disputeId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (submitSuccess || resolveSuccess || claimSuccess || pokeSuccess) {
      refetchDispute();
    }
  }, [submitSuccess, resolveSuccess, claimSuccess, pokeSuccess]);

  const notFound =
    (nextDisputeId !== undefined && disputeId >= Number(nextDisputeId)) ||
    (dispute !== undefined && dispute.claimant === ZERO_ADDRESS);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dispute not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Dispute #{id} does not exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading dispute...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xl">{dispute.question}</CardTitle>
              {dispute.resolved ? (
                <Badge variant="default">Resolved</Badge>
              ) : (
                <Badge variant="outline">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Claimant</p>
                <p className="font-mono">{truncateAddress(dispute.claimant)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Respondent</p>
                <p className="font-mono">{truncateAddress(dispute.respondent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bounty</p>
                <p className="font-medium text-lg">{formatEther(dispute.bounty)} STT</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verdict Status</p>
                <VerdictStage stage={stage} failureReason={failureReason} />
              </div>
            </div>

            {dispute.resolved && dispute.winner !== "0x0000000000000000000000000000000000000000" && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Winner</span>
                  <span className="font-mono text-green-400">{truncateAddress(dispute.winner)}</span>
                </div>
              </>
            )}

            {dispute.claimantEvidenceUrls.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Claimant Evidence</p>
                  {dispute.claimantEvidenceUrls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline block truncate"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </>
            )}

            {dispute.respondentEvidenceUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Respondent Evidence</p>
                {dispute.respondentEvidenceUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block truncate"
                  >
                    {url}
                  </a>
                ))}
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

        {isRespondent && evidenceWindowOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit Counter-Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="evidence">Evidence URL</Label>
                <Input
                  id="evidence"
                  placeholder="https://example.com/counter-evidence"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => submitEvidence(evidenceUrl.trim() ? [evidenceUrl.trim()] : [])}
                disabled={submitPending || submitConfirming}
              >
                {submitPending ? "Confirm..." : submitConfirming ? "Submitting..." : "Submit Evidence"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {!dispute.resolved && dispute.verdictId === BigInt(0) && !evidenceWindowOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolve Dispute</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The evidence window has closed. Anyone can trigger AI resolution by paying the verdict fee.
              </p>
            </CardContent>
            <CardFooter>
              {isConnected ? (
                <Button
                  onClick={() => resolveDispute()}
                  disabled={resolvePending || resolveConfirming}
                >
                  {resolvePending ? "Confirm..." : resolveConfirming ? "Resolving..." : "Resolve Dispute"}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Connect your wallet to resolve</p>
              )}
            </CardFooter>
          </Card>
        )}

        {dispute.resolved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claim Bounty</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {dispute.winner === address
                  ? `You won! Claim your ${formatEther(dispute.bounty)} STT bounty.`
                  : dispute.bounty > BigInt(0)
                    ? "The winner can claim the bounty."
                    : "The bounty has been claimed."}
              </p>
            </CardContent>
            {dispute.winner === address && dispute.bounty > BigInt(0) && (
              <CardFooter>
                {isConnected ? (
                  <Button
                    onClick={() => claimBounty()}
                    disabled={claimPending || claimConfirming}
                  >
                    {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Bounty"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Connect your wallet to claim</p>
                )}
              </CardFooter>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
