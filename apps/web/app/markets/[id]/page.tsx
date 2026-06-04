"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BoolBadge, VerdictStage } from "@/components/verdict-display";
import { useGetMarket, useStakeYes, useStakeNo, useClaim, useNextMarketId, useYesStake, useNoStake, useMarketClaimed } from "@/hooks/use-markets";
import { useGetVerdict, getVerdictStageName, usePokeVerdict, useVerdictFailureReason } from "@/hooks/use-veritas";
import { ReasoningTrace } from "@/components/reasoning-trace";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketId = parseInt(id);
  const { address, isConnected } = useAccount();

  const { data: nextMarketId } = useNextMarketId();
  const { data: market, refetch: refetchMarket } = useGetMarket(marketId);
  const { data: userYesStake } = useYesStake(marketId, address);
  const { data: userNoStake } = useNoStake(marketId, address);
  const { data: userClaimed, refetch: refetchClaimed } = useMarketClaimed(marketId, address);
  const verdictId = market ? Number(market.verdictId) : undefined;
  const { data: verdict, refetch: refetchVerdict } = useGetVerdict(verdictId);

  const [stakeAmount, setStakeAmount] = useState("0.1");

  const { stakeYes, isPending: stakeYesPending, isConfirming: stakeYesConfirming, isSuccess: stakeYesSuccess } = useStakeYes(marketId);
  const { stakeNo, isPending: stakeNoPending, isConfirming: stakeNoConfirming, isSuccess: stakeNoSuccess } = useStakeNo(marketId);
  const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } = useClaim(marketId);
  const { poke, isPending: pokePending, isConfirming: pokeConfirming, isSuccess: pokeSuccess } = usePokeVerdict(verdictId ?? 0);

  const stage = verdict ? Number(verdict.stage) : 0;
  const failureReason = useVerdictFailureReason(verdictId, stage === 4);

  useEffect(() => {
    if (stakeYesSuccess || stakeNoSuccess || claimSuccess || pokeSuccess) {
      refetchMarket();
      refetchVerdict();
      refetchClaimed();
    }
  }, [stakeYesSuccess, stakeNoSuccess, claimSuccess]);

  const notFound = nextMarketId !== undefined && marketId >= Number(nextMarketId);

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Market not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Market #{id} does not exist.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Loading market...</p>
        </main>
      </div>
    );
  }

  const winningStake = market.outcome ? (userYesStake ?? BigInt(0)) : (userNoStake ?? BigInt(0));
  const canClaim = isConnected && winningStake > BigInt(0) && !userClaimed;

  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > BigInt(0) ? Number((market.yesPool * BigInt(100)) / totalPool) : 50;
  const noPct = 100 - yesPct;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xl">{market.question}</CardTitle>
              {market.resolved ? (
                <BoolBadge value={market.outcome} trueLabel="YES" falseLabel="NO" />
              ) : (
                <Badge variant="outline">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-green-400">YES {yesPct}%</span>
                <span className="text-red-400">NO {noPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-secondary">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${yesPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">YES Pool</p>
                  <p className="font-medium">{formatEther(market.yesPool)} STT</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NO Pool</p>
                  <p className="font-medium">{formatEther(market.noPool)} STT</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verdict Status</span>
                <VerdictStage stage={stage} failureReason={failureReason} />
              </div>
              {verdict && stage === 3 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Result</span>
                  <BoolBadge value={verdict.result} trueLabel="YES" falseLabel="NO" />
                </div>
              )}
            </div>
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

        {!market.resolved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Place a Stake</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stake">Amount (STT)</Label>
                <Input
                  id="stake"
                  type="number"
                  step="0.01"
                  min="0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-4">
              {isConnected ? (
                <>
                  <Button
                    onClick={() => stakeYes(stakeAmount)}
                    disabled={stakeYesPending || stakeYesConfirming || !stakeAmount}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {stakeYesPending ? "Confirm..." : stakeYesConfirming ? "Staking..." : "Stake YES"}
                  </Button>
                  <Button
                    onClick={() => stakeNo(stakeAmount)}
                    disabled={stakeNoPending || stakeNoConfirming || !stakeAmount}
                    variant="destructive"
                  >
                    {stakeNoPending ? "Confirm..." : stakeNoConfirming ? "Staking..." : "Stake NO"}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Connect your wallet to stake</p>
              )}
            </CardFooter>
          </Card>
        )}

        {market.resolved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claim Winnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {market.outcome
                  ? "The outcome was YES. YES stakers can claim their share of the total pool."
                  : "The outcome was NO. NO stakers can claim their share of the total pool."}
              </p>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to claim</p>
              ) : userClaimed ? (
                <p className="text-sm text-muted-foreground">You have already claimed your winnings.</p>
              ) : winningStake === BigInt(0) ? (
                <p className="text-sm text-muted-foreground">You have no stake on the winning side.</p>
              ) : (
                <Button
                  onClick={() => claim()}
                  disabled={claimPending || claimConfirming || !canClaim}
                >
                  {claimPending ? "Confirm..." : claimConfirming ? "Claiming..." : "Claim Winnings"}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
