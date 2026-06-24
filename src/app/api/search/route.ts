import { NextResponse } from "next/server";
import { buildMockResult } from "@/lib/mock";

// Server-side aggregation endpoint. API keys (APIFY_TOKEN) will live here and
// never reach the client. Phase 1 returns mock data; phase 3 swaps in the real
// Apify run + normalize → score → bucket → tag pipeline.
//
// GET /api/search?q=<business>&loc=<city or "lat,lng">
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const location = searchParams.get("loc")?.trim() ?? undefined;

  if (!query) {
    return NextResponse.json(
      { error: "Missing required query parameter: q" },
      { status: 400 },
    );
  }

  // Simulate real-time scraping latency so loading states are exercised.
  await new Promise((resolve) => setTimeout(resolve, 600));

  const result = buildMockResult(query, location);
  return NextResponse.json(result);
}
