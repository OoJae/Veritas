"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReceipt } from "@/hooks/use-receipt";
import { getReceiptUrl } from "@veritas/agent-template";

function renderValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return <span className="text-sm break-words">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm">{typeof item === "string" ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="pl-4 border-l border-border space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-xs text-muted-foreground">{k}</span>
            <div>{renderValue(k, v)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm">{JSON.stringify(value)}</span>;
}

const FIELD_LABELS: Record<string, string> = {
  reasoning: "Reasoning",
  answerable: "Answerable",
  confidence_score: "Confidence Score",
  steps: "Steps",
  prompt: "Prompt",
  response: "Response",
  result: "Result",
  url: "URL",
  error: "Error",
};

export function ReasoningTrace({ requestId }: { requestId: bigint }) {
  const { data, isLoading, error } = useReceipt(requestId);
  const receiptUrl = getReceiptUrl(requestId);

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

        {error && (
          <p className="text-sm text-muted-foreground">
            Could not load receipt data.
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
              View directly
            </a>
          </p>
        )}

        {!isLoading && !error && !data && (
          <p className="text-sm text-muted-foreground">
            No receipt data available yet.
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
              Check receipt URL
            </a>
          </p>
        )}

        {data && (
          <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => {
              if (key === "requestId" || key === "id") return null;
              const label = FIELD_LABELS[key] ?? key;
              return (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                  {renderValue(key, value)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
