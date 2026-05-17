import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/api-client";
import type { ReceiveScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<Response> {
  const api = createApiClient();
  let body: ReceiveScanInput;
  try {
    body = (await req.json()) as ReceiveScanInput;
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  try {
    const asset = await api.scans.receive(body);
    return NextResponse.json(asset, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: e.code ?? "upstream_error", message: e.message, details: e.details } },
      { status: e.status ?? 500 },
    );
  }
}
