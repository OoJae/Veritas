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
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!requestId && requestId > BigInt(0),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
