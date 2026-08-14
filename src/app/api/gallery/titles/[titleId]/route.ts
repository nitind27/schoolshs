import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, canDeleteGallery } from "@/lib/gallery";

type RouteParams = { params: Promise<{ titleId: string }> };

async function loadOwnedTitle(schoolId: string, titleId: string) {
  return prisma.galleryTitle.findFirst({
    where: { id: titleId, event: { schoolId } },
    include: { event: { select: { id: true, schoolId: true } } },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { titleId } = await params;
    const existing = await loadOwnedTitle(session.schoolId, titleId);
    if (!existing) return NextResponse.json({ error: "Title not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const updated = await prisma.galleryTitle.update({
      where: { id: titleId },
      data: { title },
    });
    return NextResponse.json({ title: { id: updated.id, title: updated.title } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to rename title" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    if (!canDeleteGallery(session.role)) {
      return NextResponse.json({ error: "You cannot delete this title" }, { status: 403 });
    }
    const { titleId } = await params;
    const existing = await loadOwnedTitle(session.schoolId, titleId);
    if (!existing) return NextResponse.json({ error: "Title not found" }, { status: 404 });

    await prisma.galleryTitle.delete({ where: { id: titleId } });
    const dir = path.join(
      process.cwd(),
      "uploads",
      "gallery",
      session.schoolId,
      existing.event.id,
      titleId,
    );
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete title" }, { status: 500 });
  }
}
