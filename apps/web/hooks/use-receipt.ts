"use client";

import { useQuery } from "@tanstack/react-query";

export type ReceiptData = Record<string, unknown>;

export function useReceipt(requestId: bigint | undefined) {
  return useQuery<ReceiptData | null>({
    queryKey: ["receipt", requestId?.toString()],
    queryFn: async () => {
      if (!requestId) return null;
      // Fetch via our same-origin proxy: it does the two-step lookup (index then
      // the GCS receipt file) server-side, since the GCS files do not send CORS
      // headers and cannot be fetched directly from the browser.
      const res = await fetch(`/api/receipt?requestId=${requestId}`);
      if (!res.ok) return null;
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
