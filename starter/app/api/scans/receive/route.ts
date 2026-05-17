import { NextRequest, NextResponse } from "next/server";
import { ApiError, createApiClient } from "@/lib/api-client";
import type { ReceiveScanInput } from "@/lib/types";

export async function POST(req: NextRequest | Request): Promise<Response> {
  const api = createApiClient();
  let body: ReceiveScanInput;
  try {
    body = (await req.json()) as ReceiveScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  let preExisting = false;
  try {
    await api.assets.get(body.asset_tag);
    preExisting = true;
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== "unknown_asset") {
      return NextResponse.json(
        { error: { code: (e as ApiError).code ?? "upstream_error", message: (e as Error).message } },
        { status: (e as ApiError).status ?? 500 },
      );
    }
  }
  try {
    const asset = await api.scans.receive(body);
    return NextResponse.json(asset, { status: preExisting ? 200 : 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
