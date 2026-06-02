"use client";

import { useQuery } from "@tanstack/react-query";
import { getReceiptUrl } from "@veritas/agent-template";

export type ReceiptData = Record<string, unknown>;

async function fetchJson(url: string): Promise<unknown | null> {
  // Receipts can take a few seconds to appear, or may be pruned for old
  // requests. Guard against non-ok and non-JSON (HTML error) responses rather
  // than throwing, so the UI degrades to an empty state.
  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useReceipt(requestId: bigint | undefined) {
  return useQuery<ReceiptData | null>({
    queryKey: ["receipt", requestId?.toString()],
    queryFn: async () => {
      if (!requestId) return null;
      // Step 1: the index endpoint returns { receipts: string[], count }, one
      // file URL per subcommittee member.
      const index = (await fetchJson(getReceiptUrl(requestId))) as
        | { receipts?: string[] }
        | null;
      const fileUrl = index?.receipts?.[0];
      if (!fileUrl) return null;
      // Step 2: fetch the first receipt file, the full execution manifest.
      return (await fetchJson(fileUrl)) as ReceiptData | null;
    },
    enabled: !!requestId && requestId > BigInt(0),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
