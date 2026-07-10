import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getRemoteBrowserConfig } from "@/lib/remote-browser";

async function checkWebsockifyHealth(): Promise<{ ok: boolean; detail: string }> {
  const internal = process.env.REMOTE_BROWSER_INTERNAL_URL || "http://127.0.0.1:6080";
  try {
    const res = await fetch(`${internal}/`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const wsRes = await fetch(`${internal}/websockify`, { signal: AbortSignal.timeout(3000) });
    // websockify may return 400/426 without upgrade — that still means service is up
    if (wsRes.status === 404) return { ok: false, detail: "websockify path missing (service down or wrong nginx)" };
    return { ok: true, detail: "websockify reachable" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "unreachable" };
  }
}

export async function GET() {
  try {
    await requireSchoolAuth();
    const config = getRemoteBrowserConfig();
    const health = config.enabled ? await checkWebsockifyHealth() : { ok: false, detail: "not configured" };
    return NextResponse.json({ ...config, health });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load remote browser config" }, { status: 500 });
  }
}
