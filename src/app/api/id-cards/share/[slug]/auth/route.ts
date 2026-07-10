import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import {
  createIdCardShareToken,
  ID_CARD_SHARE_COOKIE,
  shareCookieOptions,
} from "@/lib/id-card-share-token";
import { getShareLinkBySlug, isShareLinkValid } from "@/lib/id-card-share";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const link = await getShareLinkBySlug(slug);

    if (!link || !isShareLinkValid(link)) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }

    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (username !== link.username || !verifyPassword(password, link.passwordHash)) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await prisma.idCardShareLink.update({
      where: { id: link.id },
      data: {
        lastAccessAt: new Date(),
        accessCount: { increment: 1 },
      },
    });

    const token = await createIdCardShareToken({
      linkId: link.id,
      slug: link.slug,
      schoolId: link.schoolId,
    });

    const response = NextResponse.json({
      success: true,
      label: link.label,
      schoolName: (await prisma.schoolSettings.findUnique({ where: { schoolId: link.schoolId } }))?.schoolName,
    });
    response.cookies.set(ID_CARD_SHARE_COOKIE, token, shareCookieOptions());
    return response;
  } catch (error) {
    console.error("Share auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const response = NextResponse.json({ success: true });
  response.cookies.set(ID_CARD_SHARE_COOKIE, "", { ...shareCookieOptions(0), maxAge: 0 });
  return response;
}
