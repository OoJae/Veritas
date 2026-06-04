import { NextRequest, NextResponse } from "next/server";
import { getReceiptUrl } from "@veritas/agent-template";

// Server-side receipts proxy.
//
// The receipts service is a two-step lookup: an index endpoint returns a list of
// receipt file URLs on storage.googleapis.com. Those GCS files do not send CORS
// headers, so the browser cannot fetch them directly. We do both hops here on the
// server (no CORS) and return the full execution manifest to the client.
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId || !/^\d+$/.test(requestId)) {
    return NextResponse.json({ error: "missing or invalid requestId" }, { status: 400 });
  }

  try {
    // Step 1: index endpoint -> { receipts: string[], count }
    const indexRes = await fetch(getReceiptUrl(requestId), {
      next: { revalidate: 300 },
    });
    if (!indexRes.ok) {
      return NextResponse.json({ error: "receipt not found" }, { status: 404 });
    }
    const index = (await indexRes.json()) as { receipts?: string[] };
    const fileUrl = index.receipts?.[0];
    if (!fileUrl) {
      return NextResponse.json({ error: "no receipt available yet" }, { status: 404 });
    }

    // Step 2: fetch the first receipt file, the full execution manifest.
    const fileRes = await fetch(fileUrl, { next: { revalidate: 300 } });
    if (!fileRes.ok) {
      return NextResponse.json({ error: "receipt file unavailable" }, { status: 404 });
    }
    const manifest = await fileRes.json();
    return NextResponse.json(manifest, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch {
    return NextResponse.json({ error: "failed to fetch receipt" }, { status: 502 });
  }
}
