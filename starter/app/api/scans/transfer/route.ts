import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { TransferScanInput } from "@/lib/types";

export async function POST(req: NextRequest | Request): Promise<Response> {
  const api = createApiClient();
  let body: TransferScanInput;
  try {
    body = (await req.json()) as TransferScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  try {
    const asset = await api.scans.transfer(body);
    return NextResponse.json(asset, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
