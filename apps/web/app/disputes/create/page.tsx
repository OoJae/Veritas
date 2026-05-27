"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRaiseDispute } from "@/hooks/use-disputes";
import { useAccount } from "wagmi";

export default function CreateDisputePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { raiseDispute, isPending, isConfirming, isSuccess } = useRaiseDispute();

  const [question, setQuestion] = useState("");
  const [respondent, setRespondent] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [bounty, setBounty] = useState("0.5");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = evidenceUrl.trim() ? [evidenceUrl.trim()] : [];
    raiseDispute(respondent, question, urls, bounty);
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Raised</CardTitle>
              <CardDescription>
                Your dispute has been created. The respondent has 1 hour to submit counter-evidence.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-4">
              <Button onClick={() => router.push("/disputes")}>View All Disputes</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>Raise Another</Button>
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
            <CardTitle>Raise a Dispute</CardTitle>
            <CardDescription>
              Submit a dispute with a bounty. The winner (determined by AI) claims the bounty.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Dispute Question</Label>
                <Textarea
                  id="question"
                  placeholder="Did the DAO treasury lose funds due to the March proposal?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respondent">Respondent Address</Label>
                <Input
                  id="respondent"
                  placeholder="0x..."
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The address you are disputing against
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence">Your Evidence URL</Label>
                <Input
                  id="evidence"
                  placeholder="https://example.com/evidence"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bounty">Bounty (STT)</Label>
                <Input
                  id="bounty"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bounty}
                  onChange={(e) => setBounty(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The winner claims this amount. You send it now.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to raise a dispute</p>
              ) : (
                <Button type="submit" disabled={isPending || isConfirming || !question.trim() || !respondent.trim()}>
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Raise Dispute"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
