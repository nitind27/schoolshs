import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import {
  buildSingleMemberCredentialsPdfBuffer,
  credentialsPdfFilename,
  loadMembersForCredentialsPdf,
} from "@/lib/admin/password-activity-credentials";
import {
  ensureMemberPassword,
  resolveOrCreateMember,
} from "@/lib/admin/password-activity-member";
import { buildCredentialsWhatsAppCaption } from "@/lib/whatsapp/credentials-message";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import { whatsappService } from "@/lib/whatsapp/service";
import { decryptUserPassword, generatePortalPassword } from "@/lib/user-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Super Admin — send credentials PDF + message via connected WhatsApp Web */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    if (!whatsappService.isConnected()) {
      return NextResponse.json(
        {
          error:
            "WhatsApp is not connected. Open Password Activity, click Connect WhatsApp, and scan the QR code.",
        },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const forceNew = Boolean(body.generateNew);
    const userId = body.userId ? String(body.userId) : "";
    const staffId = body.staffId ? String(body.staffId) : "";
    const phoneOverride = body.phone ? String(body.phone) : "";

    if (!userId && !staffId) {
      return NextResponse.json({ error: "userId or staffId required" }, { status: 400 });
    }

    let provisional = decryptUserPassword(null);
    let password = generatePortalPassword();

    if (userId && !staffId) {
      const existing = await resolveOrCreateMember({ userId, password });
      provisional = decryptUserPassword(existing.member?.passwordEnc);
      if (!forceNew && provisional) password = provisional;
    } else if (staffId) {
      const existing = await resolveOrCreateMember({ staffId, password });
      provisional = decryptUserPassword(existing.member?.passwordEnc);
      if (!forceNew && provisional) password = provisional;
    }

    const resolved = await resolveOrCreateMember({
      userId: userId || undefined,
      staffId: staffId || undefined,
      password,
    });
    if (!resolved.member) {
      return NextResponse.json(
        { error: resolved.error || "Member not found" },
        { status: resolved.status || 404 },
      );
    }

    const member = resolved.member;
    const phoneDigits =
      normalizeWhatsAppPhone(phoneOverride) || normalizeWhatsAppPhone(member.mobileNumber);
    if (!phoneDigits) {
      return NextResponse.json(
        {
          error:
            "No valid mobile number for this member. Add mobile on staff profile (10-digit Indian number).",
        },
        { status: 400 },
      );
    }

    const { regenerated } = await ensureMemberPassword({ member, forceNew });

    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
    const loginUrl = `${origin.replace(/\/$/, "")}/login`;

    const pdfRows = await loadMembersForCredentialsPdf({
      loginUrl,
      userId: member.userId,
    });
    if (!pdfRows.length) {
      return NextResponse.json(
        { error: "Could not load credentials for PDF. Set password first." },
        { status: 400 },
      );
    }

    const row = pdfRows[0]!;
    const note = member.createdNewUser
      ? "Aapka portal login create ho gaya hai. Neeche details hain."
      : regenerated
        ? "Naya password generate kiya gaya hai."
        : "Aapka current portal password neeche hai.";

    const caption = buildCredentialsWhatsAppCaption(row, { note });
    const pdfBytes = await buildSingleMemberCredentialsPdfBuffer(row);
    const filename = credentialsPdfFilename(row);

    await whatsappService.sendDocument({
      phoneDigits,
      pdf: Buffer.from(pdfBytes),
      filename,
      caption,
    });

    return NextResponse.json({
      ok: true,
      sentTo: phoneDigits,
      memberName: member.name,
      createdNewUser: Boolean(member.createdNewUser),
      regenerated,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin whatsapp send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send WhatsApp message" },
      { status: 500 },
    );
  }
}
