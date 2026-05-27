"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMarket } from "@/hooks/use-markets";
import { quoteVerdictSimple } from "@veritas/agent-template";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createMarket, isPending, isConfirming, isSuccess, hash } = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const cost = formatEther(quoteVerdictSimple());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = evidenceUrl.trim() ? [evidenceUrl.trim()] : [];
    createMarket(question, urls);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Market Created</CardTitle>
              <CardDescription>
                Your prediction market has been created and the AI verdict has been requested.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-4">
              <Button onClick={() => router.push("/markets")}>View All Markets</Button>
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
            <CardTitle>Create Prediction Market</CardTitle>
            <CardDescription>
              Ask a yes/no question that can be verified by AI. Stake {cost} STT for the verdict.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  placeholder="Will ETH be above $5000 by end of 2026?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence">Evidence URL (optional)</Label>
                <Input
                  id="evidence"
                  placeholder="https://example.com/evidence"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A URL the AI will fetch to evaluate your question
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p>Verdict cost: <span className="font-semibold">{cost} STT</span></p>
                <p className="text-muted-foreground text-xs mt-1">
                  This funds the AI agents that will evaluate evidence and determine the outcome
                </p>
              </div>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to create a market</p>
              ) : (
                <Button type="submit" disabled={isPending || isConfirming || !question.trim()}>
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Market"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
