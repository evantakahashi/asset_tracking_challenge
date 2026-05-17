import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import { serializeLocation } from "@/lib/location";
import type { DeployScanInput } from "@/lib/types";

export async function POST(req: NextRequest | Request): Promise<Response> {
  const api = createApiClient();
  let body: DeployScanInput;
  try {
    body = (await req.json()) as DeployScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const updated = await api.scans.deploy(body);
    const warnings: string[] = [];

    try {
      await api.mock.updateFacilities({
        tagged_id: body.asset_tag,
        rack_location: serializeLocation(body.location),
      });
    } catch (e: any) {
      warnings.push(`Facilities sync failed: ${e.message ?? "unknown"}`);
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.mock.updateFinance({
        tag: body.asset_tag,
        site: body.location.site,
        status: "capitalized",
        capitalized_on: today,
      });
    } catch (e: any) {
      warnings.push(`Finance sync failed: ${e.message ?? "unknown"}`);
    }

    return NextResponse.json({ ...updated, warnings: warnings.length ? warnings : undefined }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
