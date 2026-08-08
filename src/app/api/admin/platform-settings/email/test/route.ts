import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTestEmail } from "@/lib/email-templates";
import { sendMail, verifySmtpConnection } from "@/lib/mail";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { getPlatformSettings, type SmtpConfig } from "@/lib/platform-settings";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json().catch(() => ({}));
    const session = await getSession();
    const row = await getPlatformSettings();

    // Prefer live form values (so unsaved fields still test), fall back to DB
    const host = String(body.smtpHost || row.smtpHost || "").trim();
    const portRaw = Number(body.smtpPort ?? row.smtpPort ?? 587);
    const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 587;
    const secure =
      typeof body.smtpSecure === "boolean" ? body.smtpSecure : Boolean(row.smtpSecure);
    const fromEmail = String(body.smtpFromEmail || row.smtpFromEmail || body.smtpUser || row.smtpUser || "")
      .trim()
      .toLowerCase();
    const smtpUser = String(body.smtpUser || row.smtpUser || fromEmail || "")
      .trim()
      .toLowerCase();
    const fromName = String(body.smtpFromName || row.smtpFromName || "Codeat Education").trim();
    const replyTo = String(body.smtpReplyTo || row.smtpReplyTo || "").trim().toLowerCase() || null;

    const password =
      String(body.smtpPassword || "")
        .trim()
        .replace(/\s+/g, "") ||
      decryptSecret(row.smtpPasswordEnc) ||
      "";

    if (!host || !fromEmail || !password) {
      return NextResponse.json(
        {
          error:
            "SMTP host, From email, and App Password are required. Fill them, click Save, then Send Test.",
        },
        { status: 400 },
      );
    }

    const config: SmtpConfig = {
      emailEnabled: true,
      smtpHost: host,
      smtpPort: port,
      smtpSecure: secure,
      smtpUser: smtpUser || fromEmail,
      smtpPassword: password,
      smtpFromName: fromName,
      smtpFromEmail: fromEmail,
      smtpReplyTo: replyTo,
    };

    await verifySmtpConnection(config);

    const to = String(body.to || session?.email || "").trim().toLowerCase();
    if (!to) {
      return NextResponse.json({ error: "Test recipient email required" }, { status: 400 });
    }

    const template = buildTestEmail({ toName: session?.name || "Super Admin" });
    await sendMail(
      {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
      config,
    );

    // Persist working credentials so OTP keeps working without re-entry
    const persistPassword = String(body.smtpPassword || "")
      .trim()
      .replace(/\s+/g, "");
    await prisma.platformSettings.update({
      where: { id: "platform" },
      data: {
        emailEnabled: true,
        smtpHost: host,
        smtpPort: port,
        smtpSecure: secure,
        smtpUser: smtpUser || fromEmail,
        smtpFromEmail: fromEmail,
        smtpFromName: fromName,
        smtpReplyTo: replyTo,
        ...(persistPassword ? { smtpPasswordEnc: encryptSecret(persistPassword) } : {}),
        smtpLastTestAt: new Date(),
        smtpLastTestOk: true,
        smtpLastTestError: null,
      },
    });

    return NextResponse.json({ ok: true, sentTo: to, persisted: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "SMTP test failed";
    try {
      await prisma.platformSettings.update({
        where: { id: "platform" },
        data: {
          smtpLastTestAt: new Date(),
          smtpLastTestOk: false,
          smtpLastTestError: message,
        },
      });
    } catch {
      /* ignore */
    }
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
