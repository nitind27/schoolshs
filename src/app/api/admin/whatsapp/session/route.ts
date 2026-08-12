import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { whatsappService } from "@/lib/whatsapp/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Super Admin — WhatsApp Web session status / QR */
export async function GET() {
  try {
    await requireAuth(["super_admin"]);
    return NextResponse.json(whatsappService.getSnapshot());
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin whatsapp session GET]", e);
    return NextResponse.json({ error: "Failed to read WhatsApp status" }, { status: 500 });
  }
}

/** Super Admin — start WhatsApp Web connection (shows QR) */
export async function POST() {
  try {
    await requireAuth(["super_admin"]);
    const snapshot = await whatsappService.start();
    return NextResponse.json(snapshot);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin whatsapp session POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to connect WhatsApp" },
      { status: 500 },
    );
  }
}

/** Super Admin — disconnect / logout WhatsApp Web */
export async function DELETE() {
  try {
    await requireAuth(["super_admin"]);
    const snapshot = await whatsappService.logout();
    return NextResponse.json(snapshot);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin whatsapp session DELETE]", e);
    return NextResponse.json({ error: "Failed to disconnect WhatsApp" }, { status: 500 });
  }
}
