import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, canDeleteGallery } from "@/lib/gallery";
import { removeGalleryFolder, unlinkGalleryFile } from "@/lib/gallery-upload";

type RouteParams = { params: Promise<{ titleId: string }> };

async function loadOwnedTitle(schoolId: string, titleId: string) {
  return prisma.galleryTitle.findFirst({
    where: { id: titleId, event: { schoolId } },
    include: {
      event: { select: { id: true, schoolId: true } },
      images: { select: { id: true, filePath: true } },
    },
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

    const filePaths = existing.images.map((img) => img.filePath);

    await prisma.$transaction([
      prisma.galleryImage.deleteMany({ where: { titleId } }),
      prisma.galleryTitle.delete({ where: { id: titleId } }),
    ]);

    await Promise.all(filePaths.map((fp) => unlinkGalleryFile(fp)));
    await removeGalleryFolder(session.schoolId, existing.event.id, titleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery title DELETE]", error);
    return NextResponse.json({ error: "Failed to delete title" }, { status: 500 });
  }
}
