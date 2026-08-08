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

    const rawUser =
      body.smtpUser !== undefined ? String(body.smtpUser || "").trim().toLowerCase() : undefined;
    const rawFrom =
      body.smtpFromEmail !== undefined
        ? String(body.smtpFromEmail || "").trim().toLowerCase()
        : undefined;

    // Keep username + from email in sync when one is blank
    if (rawUser !== undefined || rawFrom !== undefined) {
      const existing = await getPlatformSettings();
      const nextUser = rawUser !== undefined ? rawUser || null : existing.smtpUser;
      const nextFrom = rawFrom !== undefined ? rawFrom || null : existing.smtpFromEmail;
      const syncedUser = nextUser || nextFrom;
      const syncedFrom = nextFrom || nextUser;
      data.smtpUser = syncedUser;
      data.smtpFromEmail = syncedFrom;
    }

    if (body.smtpFromName !== undefined) {
      data.smtpFromName = String(body.smtpFromName || "").trim() || "Codeat Education";
    }
    if (body.smtpReplyTo !== undefined) {
      data.smtpReplyTo = String(body.smtpReplyTo || "").trim().toLowerCase() || null;
    }

    // Password is stored encrypted in DB permanently.
    // Empty / omitted password never clears the existing value — only a new App Password replaces it.
    const newPassword = String(body.smtpPassword || "").trim().replace(/\s+/g, "");
    if (newPassword) {
      data.smtpPasswordEnc = encryptSecret(newPassword);
    }
    // Explicit wipe only (never used by the settings form)
    if (body.clearSmtpPassword === true) {
      data.smtpPasswordEnc = null;
    }

    // Hard validation when enabling email
    const enableRequested = data.emailEnabled === true;
    if (enableRequested || body.requireComplete === true) {
      const preview = await getPlatformSettings();
      const host = (data.smtpHost as string | null | undefined) ?? preview.smtpHost;
      const from =
        (data.smtpFromEmail as string | null | undefined) ??
        (data.smtpUser as string | null | undefined) ??
        preview.smtpFromEmail ??
        preview.smtpUser;
      const hasPass = Boolean(newPassword || preview.smtpPasswordEnc);
      if (!host) {
        return NextResponse.json({ error: "SMTP host is required" }, { status: 400 });
      }
      if (!from) {
        return NextResponse.json(
          { error: "From email is required (same as Gmail address for Gmail App Password)" },
          { status: 400 },
        );
      }
      if (!hasPass) {
        return NextResponse.json(
          { error: "SMTP App Password is required. Paste the 16-character Google App Password and Save." },
          { status: 400 },
        );
      }
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
