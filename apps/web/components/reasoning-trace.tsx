"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReceipt } from "@/hooks/use-receipt";
import { getReceiptUrl } from "@veritas/agent-template";

type AgentResult = {
  verdict?: string;
  confidence_score?: number;
  reasoning?: string;
  answerable?: boolean;
};

// The execution manifest carries the agent's structured output deep in the step
// list, at agentReceipt.steps[].outputs.result. Dig it out defensively.
function extractResult(manifest: Record<string, unknown>): AgentResult | null {
  const agentReceipt = manifest.agentReceipt as Record<string, unknown> | undefined;
  const steps = (agentReceipt?.steps as Array<Record<string, unknown>>) ?? [];
  for (const step of steps) {
    const outputs = step?.outputs as Record<string, unknown> | undefined;
    const result = outputs?.result as AgentResult | undefined;
    if (result && (result.verdict !== undefined || result.reasoning !== undefined)) {
      return result;
    }
  }
  return null;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

export function ReasoningTrace({ requestId }: { requestId: bigint }) {
  const { data, isLoading, error } = useReceipt(requestId);
  const receiptUrl = getReceiptUrl(requestId);

  const result = data ? extractResult(data) : null;
  const agentReceipt = (data?.agentReceipt as Record<string, unknown>) ?? {};
  const llmUsage = (agentReceipt.llmUsage as Record<string, unknown>) ?? {};
  const requestDetails = (data?.requestDetails as Record<string, unknown>) ?? {};
  const status = data?.status as string | undefined;
  const elapsedMs = num(data?.elapsedMs);
  const totalTokens = num(llmUsage.totalTokens);
  const subSize = num(requestDetails.subcommitteeSize);
  const threshold = num(requestDetails.threshold);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Reasoning Trace</CardTitle>
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View raw receipt
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading receipt...
          </div>
        )}

        {!isLoading && (error || !data) && (
          <p className="text-sm text-muted-foreground">
            No receipt data available yet.
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
              Check receipt
            </a>
          </p>
        )}

        {data && (
          <div className="space-y-4">
            {result && (
              <div className="space-y-3">
                {result.verdict !== undefined && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Verdict</span>
                    <Badge className={String(result.verdict).toUpperCase() === "YES" ? "verdict-true" : "verdict-false"} variant={String(result.verdict).toUpperCase() === "YES" ? "default" : "outline"}>
                      {String(result.verdict)}
                    </Badge>
                    {result.confidence_score !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        confidence {result.confidence_score}%
                      </span>
                    )}
                    {result.answerable !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {result.answerable ? "answerable" : "not answerable"}
                      </span>
                    )}
                  </div>
                )}
                {result.reasoning && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning</p>
                    <p className="text-sm break-words">{result.reasoning}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-3">
              {status && <span>status: {status}</span>}
              {elapsedMs !== undefined && <span>{(elapsedMs / 1000).toFixed(1)}s</span>}
              {totalTokens !== undefined && <span>{totalTokens} tokens</span>}
              {subSize !== undefined && threshold !== undefined && (
                <span>consensus {threshold}/{subSize}</span>
              )}
            </div>

            {!result && (
              <p className="text-sm text-muted-foreground">
                Receipt loaded, but no structured result was found.
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                  View raw
                </a>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
