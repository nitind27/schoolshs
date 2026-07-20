import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";
import {
  ensurePlatformSettings,
  getPlatformSettings,
  toPublicSmtpSettings,
} from "@/lib/platform-settings";

export async function GET() {
  try {
    await requireAuth(["super_admin"]);
    const row = await getPlatformSettings();
    return NextResponse.json(toPublicSmtpSettings(row));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    await ensurePlatformSettings();

    const data: Record<string, unknown> = {};

    if (typeof body.emailEnabled === "boolean") data.emailEnabled = body.emailEnabled;
    if (body.smtpHost !== undefined) data.smtpHost = String(body.smtpHost || "").trim() || null;
    if (body.smtpPort !== undefined) {
      const port = Number(body.smtpPort);
      data.smtpPort = Number.isFinite(port) && port > 0 ? port : 587;
    }
    if (typeof body.smtpSecure === "boolean") data.smtpSecure = body.smtpSecure;
    if (body.smtpUser !== undefined) data.smtpUser = String(body.smtpUser || "").trim() || null;
    if (body.smtpFromName !== undefined) {
      data.smtpFromName = String(body.smtpFromName || "").trim() || "SHS Education Portal";
    }
    if (body.smtpFromEmail !== undefined) {
      data.smtpFromEmail = String(body.smtpFromEmail || "").trim().toLowerCase() || null;
    }
    if (body.smtpReplyTo !== undefined) {
      data.smtpReplyTo = String(body.smtpReplyTo || "").trim().toLowerCase() || null;
    }

    const newPassword = String(body.smtpPassword || "").trim();
    if (newPassword) {
      data.smtpPasswordEnc = encryptSecret(newPassword);
    }

    const row = await prisma.platformSettings.update({
      where: { id: "platform" },
      data,
    });

    return NextResponse.json(toPublicSmtpSettings(row));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
