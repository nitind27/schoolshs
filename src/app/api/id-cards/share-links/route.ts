import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { AuthError, hashPassword, requireSchoolAuth } from "@/lib/auth";
import { buildShareUrl, generateShareSlug } from "@/lib/id-card-share";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const links = await prisma.idCardShareLink.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        username: true,
        label: true,
        classId: true,
        standard: true,
        section: true,
        academicYear: true,
        expiresAt: true,
        isActive: true,
        lastAccessAt: true,
        accessCount: true,
        createdAt: true,
      },
    });

    const origin = request.nextUrl.origin;
    const linksWithUrl = links.map((link) => ({
      ...link,
      shareUrl: buildShareUrl(origin, link.slug),
    }));

    return NextResponse.json({
      links: linksWithUrl,
      appUrl: buildShareUrl(origin, "").replace(/\/m\/id-cards\/$/, ""),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to list links" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const label = body.label ? String(body.label).trim() : null;
    const classId = body.classId ? String(body.classId) : null;
    const standard = body.standard ? String(body.standard) : null;
    const section = body.section ? String(body.section) : null;
    const academicYear = String(body.academicYear || "2025-26");
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const slug = generateShareSlug();
    const link = await prisma.idCardShareLink.create({
      data: {
        schoolId: session.schoolId,
        slug,
        username,
        passwordHash: hashPassword(password),
        label,
        classId,
        standard,
        section,
        academicYear,
        expiresAt,
        createdById: session.userId,
      },
      select: {
        id: true,
        slug: true,
        username: true,
        label: true,
        classId: true,
        standard: true,
        section: true,
        academicYear: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    const shareUrl = buildShareUrl(request.nextUrl.origin, slug);
    return NextResponse.json({ link, shareUrl, message: "Share link created" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("POST share-links error:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
