"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePolicy } from "@/hooks/use-insurance";
import { isScrapeableUrl, looksLikeRawApi } from "@/lib/evidence";
import { quoteVerdictSimple } from "@veritas/agent-template";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function CreatePolicyPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createPolicy, isPending, isConfirming, isSuccess } = useCreatePolicy();

  const [question, setQuestion] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [premium, setPremium] = useState("0.1");
  const [payout, setPayout] = useState("0.5");
  const [maxParticipants, setMaxParticipants] = useState("5");

  const cost = formatEther(quoteVerdictSimple());
  const urlValid = isScrapeableUrl(evidenceUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValid) return;
    createPolicy(question, [evidenceUrl.trim()], premium, payout, parseInt(maxParticipants));
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Policy Created</CardTitle>
              <CardDescription>Your insurance policy is live. Participants can now join.</CardDescription>
            </CardHeader>
            <CardFooter className="gap-4">
              <Button onClick={() => router.push("/insurance")}>View All Policies</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Create Another</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Insurance Policy</CardTitle>
            <CardDescription>
              Define a condition that AI will evaluate. If the condition is met, all participants receive a payout.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Condition</Label>
                <Textarea
                  id="question"
                  placeholder="Did it rain more than 2 inches in NYC on May 25?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence">Evidence URL</Label>
                <Input
                  id="evidence"
                  placeholder="https://www.wunderground.com/history/daily/..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A public status or data page the AI will read to evaluate the
                  condition. Use a normal HTML page, not a raw JSON API.
                </p>
                {evidenceUrl.trim() && !urlValid && (
                  <p className="text-xs text-destructive">
                    Enter a valid http(s) URL.
                  </p>
                )}
                {urlValid && looksLikeRawApi(evidenceUrl) && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    This looks like a raw JSON API. A human-readable page resolves
                    more reliably.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="premium">Premium (STT)</Label>
                  <Input
                    id="premium"
                    type="number"
                    step="0.01"
                    min="0"
                    value={premium}
                    onChange={(e) => setPremium(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payout">Payout (STT)</Label>
                  <Input
                    id="payout"
                    type="number"
                    step="0.01"
                    min="0"
                    value={payout}
                    onChange={(e) => setPayout(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  required
                />
              </div>
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p>Verdict cost: <span className="font-semibold">{cost} STT</span></p>
                <p className="text-muted-foreground text-xs mt-1">
                  You fund the AI verdict request. Participants pay the premium to join.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to create a policy</p>
              ) : (
                <Button type="submit" disabled={isPending || isConfirming || !question.trim() || !urlValid}>
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Policy"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
