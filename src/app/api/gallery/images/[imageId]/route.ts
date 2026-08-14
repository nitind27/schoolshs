import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, canDeleteGalleryImage } from "@/lib/gallery";

type RouteParams = { params: Promise<{ imageId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { imageId } = await params;

    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, title: { event: { schoolId: session.schoolId } } },
      select: { id: true, filePath: true, uploadedById: true },
    });
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
    if (!canDeleteGalleryImage(session.role, image.uploadedById, session.userId)) {
      return NextResponse.json({ error: "You cannot delete this photo" }, { status: 403 });
    }

    await prisma.galleryImage.delete({ where: { id: imageId } });
    const abs = path.join(process.cwd(), "uploads", image.filePath.replace(/^uploads\//, ""));
    await unlink(abs).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
