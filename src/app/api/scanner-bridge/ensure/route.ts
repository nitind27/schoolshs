import { NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { pingScannerBridge, spawnScannerBridge } from "@/lib/ensure-scanner-bridge";

export async function POST() {
  try {
    await requireSchoolAuth();
    if (await pingScannerBridge()) {
      return NextResponse.json({ ok: true, running: true, started: false });
    }
    const result = await spawnScannerBridge();
    return NextResponse.json({
      ok: result.started,
      running: result.started,
      started: result.started,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not start scanner helper" }, { status: 500 });
  }
}
