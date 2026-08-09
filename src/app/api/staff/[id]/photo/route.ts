import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  resolveUploadAbsolutePath,
  staffPhotoAbsolutePath,
  staffPhotoPublicUrl,
  staffPhotoRelativePath,
} from "@/lib/staff-photo.server";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_INPUT = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

async function assertCanManagePhoto(
  session: Awaited<ReturnType<typeof requireSchoolAuth>>,
  staffId: string,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, schoolId: session.schoolId },
    select: { id: true, photoPath: true },
  });
  if (!staff) throw new AuthError("Staff not found", 404);

  const isOffice = session.role === "school_admin" || session.role === "clerk";
  const isSelf = Boolean(session.staffId && session.staffId === staffId);
  if (!isOffice && !isSelf) {
    throw new AuthError("You can only update your own photo", 403);
  }
  return staff;
}

async function compressPassport(input: Buffer) {
  let quality = 88;
  let buffer = await sharp(input)
    .rotate()
    .resize(600, 800, { fit: "cover", position: "attention" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (buffer.length > 450 * 1024 && quality > 40) {
    quality -= 8;
    buffer = await sharp(input)
      .rotate()
      .resize(600, 800, { fit: "cover", position: "attention" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  return buffer;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "clerk",
      "teacher",
      "ca",
    ]);
    const { id } = await params;
    const existing = await assertCanManagePhoto(session, id);

    const form = await request.formData();
    const file = form.get("file") || form.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG or WEBP photos are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_INPUT) {
      return NextResponse.json({ error: "Photo must be under 8 MB" }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const compressed = await compressPassport(input);
    const abs = staffPhotoAbsolutePath(id);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, compressed);

    if (!existsSync(abs)) {
      return NextResponse.json({ error: "Failed to store photo file" }, { status: 500 });
    }

    const photoPath = staffPhotoRelativePath(id);
    const updated = await prisma.staff.update({
      where: { id },
      data: { photoPath },
      select: { id: true, photoPath: true },
    });

    if (existing.photoPath && existing.photoPath !== photoPath) {
      const oldAbs = resolveUploadAbsolutePath(existing.photoPath);
      if (oldAbs !== abs) await unlink(oldAbs).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      photoPath: updated.photoPath,
      previewUrl: staffPhotoPublicUrl(updated.photoPath, Date.now()),
      size: compressed.length,
      stored: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/staff/[id]/photo:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "clerk",
      "teacher",
      "ca",
    ]);
    const { id } = await params;
    const existing = await assertCanManagePhoto(session, id);

    await prisma.staff.update({
      where: { id },
      data: { photoPath: null },
    });

    await unlink(staffPhotoAbsolutePath(id)).catch(() => {});
    if (existing.photoPath) {
      await unlink(resolveUploadAbsolutePath(existing.photoPath)).catch(() => {});
    }

    return NextResponse.json({ success: true, photoPath: null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}
