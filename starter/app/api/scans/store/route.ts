import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { StoreScanInput } from "@/lib/types";

export async function POST(req: NextRequest | Request): Promise<Response> {
  const api = createApiClient();
  let body: StoreScanInput;
  try {
    body = (await req.json()) as StoreScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const prior = await api.assets.get(body.asset_tag);
    const updated = await api.scans.store(body);
    const warnings: string[] = [];

    if (prior.state === "in_service") {
      try {
        await api.mock.updateFacilities({ tagged_id: body.asset_tag, rack_location: null });
      } catch (e: any) {
        warnings.push(`Facilities sync failed: ${e.message ?? "unknown"}`);
      }
    }

    return NextResponse.json({ ...updated, warnings: warnings.length ? warnings : undefined }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
