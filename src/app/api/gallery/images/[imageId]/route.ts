import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, canDeleteGalleryImage, galleryMediaKind, galleryImagePublicUrl, isGalleryImageFile } from "@/lib/gallery";
import {
  compressGalleryImage,
  GALLERY_MAX_INPUT,
  galleryFileAbs,
  unlinkGalleryFile,
} from "@/lib/gallery-upload";

type RouteParams = { params: Promise<{ imageId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { imageId } = await params;

    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, title: { event: { schoolId: session.schoolId } } },
      select: { id: true, filePath: true, uploadedById: true, originalName: true },
    });
    if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });

    if (galleryMediaKind(image.filePath) === "video") {
      return NextResponse.json({ error: "Videos cannot be edited" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file") || form.get("files");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Select an image" }, { status: 400 });
    }
    if (!isGalleryImageFile(file) || (file.type && file.type.startsWith("video/"))) {
      return NextResponse.json({ error: "Use JPG, PNG or WEBP" }, { status: 400 });
    }
    if (file.size > GALLERY_MAX_INPUT * 3) {
      return NextResponse.json({ error: "Image is too large" }, { status: 400 });
    }

    const jpeg = await compressGalleryImage(Buffer.from(await file.arrayBuffer()));
    const abs = galleryFileAbs(image.filePath);
    await writeFile(abs, jpeg);

    const updated = await prisma.galleryImage.update({
      where: { id: imageId },
      data: { originalName: file.name || image.originalName },
    });

    return NextResponse.json({
      image: {
        id: updated.id,
        url: `${galleryImagePublicUrl(updated.filePath)}?v=${Date.now()}`,
        originalName: updated.originalName,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery image PATCH]", error);
    return NextResponse.json({ error: "Failed to save edited image" }, { status: 500 });
  }
}

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
    await unlinkGalleryFile(image.filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
