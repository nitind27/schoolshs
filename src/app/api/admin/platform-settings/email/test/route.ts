import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildTestEmail } from "@/lib/email-templates";
import { sendMail, verifySmtpConnection } from "@/lib/mail";
import { decryptSecret } from "@/lib/secret-crypto";
import { getPlatformSettings, type SmtpConfig } from "@/lib/platform-settings";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json().catch(() => ({}));
    const session = await getSession();

    const row = await getPlatformSettings();
    const password =
      String(body.smtpPassword || "").trim() || decryptSecret(row.smtpPasswordEnc) || "";

    if (!row.smtpHost || !row.smtpFromEmail || !password) {
      return NextResponse.json(
        { error: "SMTP host, from email, and app password are required" },
        { status: 400 },
      );
    }

    const config: SmtpConfig = {
      emailEnabled: true,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort || 587,
      smtpSecure: row.smtpSecure,
      smtpUser: row.smtpUser || row.smtpFromEmail,
      smtpPassword: password,
      smtpFromName: row.smtpFromName || "SHS Education Portal",
      smtpFromEmail: row.smtpFromEmail,
      smtpReplyTo: row.smtpReplyTo,
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

    await prisma.platformSettings.update({
      where: { id: "platform" },
      data: {
        smtpLastTestAt: new Date(),
        smtpLastTestOk: true,
        smtpLastTestError: null,
      },
    });

    return NextResponse.json({ ok: true, sentTo: to });
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
