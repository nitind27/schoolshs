import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, galleryImagePublicUrl } from "@/lib/gallery";
import {
  compressGalleryImage,
  GALLERY_ALLOWED_TYPES,
  GALLERY_MAX_FILES,
  GALLERY_MAX_INPUT,
} from "@/lib/gallery-upload";

type RouteParams = { params: Promise<{ titleId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { titleId } = await params;

    const title = await prisma.galleryTitle.findFirst({
      where: { id: titleId, event: { schoolId: session.schoolId } },
      include: { event: { select: { id: true } } },
    });
    if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });

    const form = await request.formData();
    const files = form
      .getAll("files")
      .concat(form.getAll("file"))
      .filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
    }
    if (files.length > GALLERY_MAX_FILES) {
      return NextResponse.json({ error: `You can upload up to ${GALLERY_MAX_FILES} images at once` }, { status: 400 });
    }

    const dir = path.join(
      process.cwd(),
      "uploads",
      "gallery",
      session.schoolId,
      title.event.id,
      titleId,
    );
    await mkdir(dir, { recursive: true });

    const created = [];
    for (const file of files) {
      if (file.type && !GALLERY_ALLOWED_TYPES.has(file.type)) continue;
      if (file.size > GALLERY_MAX_INPUT * 3) continue;
      const raw = Buffer.from(await file.arrayBuffer());
      const jpeg = await compressGalleryImage(raw);
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const rel = `gallery/${session.schoolId}/${title.event.id}/${titleId}/${id}.jpg`;
      await writeFile(path.join(dir, `${id}.jpg`), jpeg);
      const row = await prisma.galleryImage.create({
        data: {
          titleId,
          filePath: rel,
          originalName: file.name || null,
          uploadedById: session.userId,
          uploadedByName: session.name || null,
        },
      });
      created.push({
        id: row.id,
        url: galleryImagePublicUrl(row.filePath),
        originalName: row.originalName,
        uploadedByName: row.uploadedByName,
        uploadedById: row.uploadedById,
        createdAt: row.createdAt,
        canDelete: true,
      });
    }

    if (!created.length) {
      return NextResponse.json({ error: "No valid images (JPG, PNG or WEBP, under 8 MB)" }, { status: 400 });
    }

    return NextResponse.json({ images: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery images POST]", error);
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }
}
