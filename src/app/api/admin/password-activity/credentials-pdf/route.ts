import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireAuth } from "@/lib/auth";
import { getRequestOriginFromHeaders } from "@/lib/email-verification";
import {
  buildMemberCredentialsPdf,
} from "@/lib/admin/member-credentials-pdf";
import {
  loadMembersForCredentialsPdf,
  safeCredentialsFilenamePart,
} from "@/lib/admin/password-activity-credentials";

/** Super Admin — download portal credentials PDF (single or bulk) */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);

    const sp = request.nextUrl.searchParams;
    const userId = sp.get("userId")?.trim() || "";
    const staffId = sp.get("staffId")?.trim() || "";
    const schoolId = sp.get("schoolId")?.trim() || "";
    const role = sp.get("role")?.trim() || "all";
    const q = sp.get("q")?.trim() || "";

    const origin = getRequestOriginFromHeaders(request.headers, request.nextUrl.origin);
    const loginUrl = `${origin.replace(/\/$/, "")}/login`;

    const members = await loadMembersForCredentialsPdf({
      loginUrl,
      userId: userId || undefined,
      staffId: staffId || undefined,
      schoolId: schoolId && schoolId !== "all" ? schoolId : undefined,
      role,
      q,
    });

    if (!members.length) {
      const single = Boolean(userId || staffId);
      return NextResponse.json(
        {
          error: single
            ? "No stored password for this member. Set or generate a password first."
            : "No members with stored passwords match this filter.",
        },
        { status: 400 },
      );
    }

    let title: string | undefined;
    if (members.length > 1) {
      if (schoolId && schoolId !== "all") {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { name: true, code: true },
        });
        title = school ? `${school.name} (${school.code})` : undefined;
      } else {
        title = "All schools — filtered members";
      }
    }

    const bytes = await buildMemberCredentialsPdf({
      members,
      generatedAt: new Date(),
      title,
    });

    let filename: string;
    if (userId || staffId) {
      filename = `Codeat-Credentials-${safeCredentialsFilenamePart(members[0]!.name)}.pdf`;
    } else if (schoolId && schoolId !== "all") {
      const code = members[0]?.schoolCode || "school";
      filename = `Codeat-Credentials-${safeCredentialsFilenamePart(code)}-${members.length}.pdf`;
    } else {
      filename = `Codeat-Credentials-${members.length}-members.pdf`;
    }

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin password-activity credentials-pdf]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
