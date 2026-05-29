import { Badge } from "@/components/ui/badge";

// Stage enum matches on-chain: 0=Idle, 1=FetchingEvidence, 2=Reasoning, 3=Resolved, 4=Failed
const stageLabels: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  0: { label: "Idle", variant: "secondary" },
  1: { label: "Fetching Evidence", variant: "outline" },
  2: { label: "Reasoning", variant: "outline" },
  3: { label: "Resolved", variant: "default" },
  4: { label: "Failed", variant: "destructive" },
};

export function VerdictStage({ stage, failureReason }: { stage: number; failureReason?: string | null }) {
  const { label, variant } = stageLabels[stage] ?? { label: "Unknown", variant: "secondary" as const };
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant}>{label}</Badge>
      {stage === 4 && failureReason && (
        <span className="text-xs text-muted-foreground">{failureReason}</span>
      )}
    </div>
  );
}

export function VerdictResult({ result }: { result: boolean }) {
  return (
    <Badge variant={result ? "default" : "destructive"}>
      {result ? "YES" : "NO"}
    </Badge>
  );
}

export function BoolBadge({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <Badge variant={value ? "default" : "secondary"}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}
