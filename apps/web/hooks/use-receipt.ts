"use client";

import { useQuery } from "@tanstack/react-query";
import { getReceiptUrl } from "@veritas/agent-template";

export type ReceiptData = Record<string, unknown>;

export function useReceipt(requestId: bigint | undefined) {
  return useQuery<ReceiptData | null>({
    queryKey: ["receipt", requestId?.toString()],
    queryFn: async () => {
      if (!requestId) return null;
      const url = getReceiptUrl(requestId);
      const res = await fetch(url);
      // Receipts can take a few seconds to appear, or may be pruned for old
      // requests. The service also returns an HTML error page (not JSON) when a
      // receipt is missing, so guard the parse rather than throwing.
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) return null;
      try {
        return (await res.json()) as ReceiptData;
      } catch {
        return null;
      }
    },
    enabled: !!requestId && requestId > BigInt(0),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
