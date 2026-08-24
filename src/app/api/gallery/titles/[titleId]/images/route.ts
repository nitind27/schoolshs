import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import {
  GALLERY_ROLES,
  galleryVideoExt,
  isGalleryImageFile,
  isGalleryVideoFile,
  serializeGalleryMedia,
} from "@/lib/gallery";
import {
  compressGalleryImage,
  GALLERY_MAX_FILES,
  GALLERY_MAX_INPUT,
  GALLERY_MAX_VIDEO,
} from "@/lib/gallery-upload";
import { projectPath } from "@/lib/project-path";

type RouteParams = { params: Promise<{ titleId: string }> };

export const maxDuration = 120;

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
      return NextResponse.json({ error: "Select at least one photo or video" }, { status: 400 });
    }
    if (files.length > GALLERY_MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload up to ${GALLERY_MAX_FILES} files at once` },
        { status: 400 },
      );
    }

    const dir = projectPath("uploads", "gallery", session.schoolId, title.event.id, titleId);
    await mkdir(dir, { recursive: true });

    const created = [];
    for (const file of files) {
      const video = isGalleryVideoFile(file);
      const image = isGalleryImageFile(file);
      if (!video && !image) continue;
      if (video && file.size > GALLERY_MAX_VIDEO) continue;
      if (image && file.size > GALLERY_MAX_INPUT * 3) continue;

      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      try {
        if (video) {
          const ext = galleryVideoExt(file);
          const raw = Buffer.from(await file.arrayBuffer());
          const rel = `gallery/${session.schoolId}/${title.event.id}/${titleId}/${id}${ext}`;
          await writeFile(path.join(dir, `${id}${ext}`), raw);
          const row = await prisma.galleryImage.create({
            data: {
              titleId,
              filePath: rel,
              originalName: file.name || null,
              uploadedById: session.userId,
              uploadedByName: session.name || null,
            },
          });
          created.push(serializeGalleryMedia(row, true));
        } else {
          const jpeg = await compressGalleryImage(Buffer.from(await file.arrayBuffer()));
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
          created.push(serializeGalleryMedia(row, true));
        }
      } catch (err) {
        console.error("[gallery media skip]", file.name, err);
      }
    }

    if (!created.length) {
      return NextResponse.json(
        { error: "No valid files (JPG, PNG, WEBP, GIF under 8 MB, or MP4/WEBM/MOV under 80 MB)" },
        { status: 400 },
      );
    }

    return NextResponse.json({ images: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery images POST]", error);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}
