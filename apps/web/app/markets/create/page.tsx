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
import { isScrapeableUrl, looksLikeRawApi } from "@/lib/evidence";
import { WINDOW_PRESETS, DEFAULT_WINDOW_SECONDS } from "@/lib/windows";
import { quoteVerdictSimple } from "@veritas/agent-template";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function CreateMarketPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createMarket, isPending, isConfirming, isSuccess, hash } = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [windowSeconds, setWindowSeconds] = useState(DEFAULT_WINDOW_SECONDS);

  const cost = formatEther(quoteVerdictSimple());
  const urlValid = isScrapeableUrl(evidenceUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValid) return;
    createMarket(question, [evidenceUrl.trim()], windowSeconds);
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
              Ask a yes/no question that can be verified by AI. Creating is free: betting
              stays open for the window you choose, then anyone can trigger AI resolution.
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
                <Label htmlFor="evidence">Evidence URL</Label>
                <Input
                  id="evidence"
                  placeholder="https://en.wikipedia.org/wiki/Spherical_Earth"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A public web page the AI will read to decide the verdict. Use a
                  normal HTML page, not a raw JSON API. Questions without a source
                  page cannot be resolved.
                </p>
                {evidenceUrl.trim() && !urlValid && (
                  <p className="text-xs text-destructive">
                    Enter a valid http(s) URL.
                  </p>
                )}
                {urlValid && looksLikeRawApi(evidenceUrl) && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    This looks like a raw JSON API. The agent reads HTML pages, so
                    a human-readable page resolves more reliably.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="window">Betting window</Label>
                <select
                  id="window"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={windowSeconds}
                  onChange={(e) => setWindowSeconds(Number(e.target.value))}
                >
                  {WINDOW_PRESETS.map((p) => (
                    <option key={p.seconds} value={p.seconds}>{p.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  How long staking stays open before the market can be resolved.
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p>Resolution fee: <span className="font-semibold">{cost} STT</span></p>
                <p className="text-muted-foreground text-xs mt-1">
                  Paid when the market is resolved (not now). After the window closes,
                  anyone can trigger resolution by paying this fee.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to create a market</p>
              ) : (
                <Button type="submit" disabled={isPending || isConfirming || !question.trim() || !urlValid}>
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
