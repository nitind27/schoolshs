import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { projectPath } from "@/lib/project-path";
import {
  isLetterheadDocumentState,
  type LetterheadDocumentState,
  type LetterheadStamp,
} from "@/lib/letterhead/defaults";

const UPLOAD_ROOT = projectPath("uploads");
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const MAX_STAMPS = 12;
const MAX_BYTES = 8 * 1024 * 1024;

function stampUrl(rel: string): string {
  return `/api/uploads/${rel}`;
}

async function loadLibrary(schoolId: string): Promise<{
  doc: LetterheadDocumentState | null;
  library: LetterheadStamp[];
}> {
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId },
    select: { letterheadJson: true },
  });
  const doc = isLetterheadDocumentState(settings?.letterheadJson)
    ? (settings!.letterheadJson as LetterheadDocumentState)
    : null;
  const library = Array.isArray(doc?.stampLibrary)
    ? doc!.stampLibrary.filter((s): s is LetterheadStamp => Boolean(s && s.id && s.path))
    : [];
  return { doc, library };
}

async function saveLibrary(
  schoolId: string,
  schoolName: string,
  doc: LetterheadDocumentState | null,
  library: LetterheadStamp[],
) {
  const next = { ...(doc || {}), stampLibrary: library } as object;
  await prisma.schoolSettings.upsert({
    where: { schoolId },
    create: { schoolId, schoolName: schoolName || "My School", letterheadJson: next },
    update: { letterheadJson: next },
  });
}

function toResponse(library: LetterheadStamp[]) {
  return library.map((s) => ({ id: s.id, label: s.label, url: stampUrl(s.path) }));
}

function handleError(error: unknown, label: string) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Stamp request failed" }, { status: 500 });
}

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const { library } = await loadLibrary(session.schoolId);
    return NextResponse.json({ stamps: toResponse(library) });
  } catch (error) {
    return handleError(error, "GET /api/school/letterhead/stamps");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const form = await request.formData();
    const file = form.get("file");
    const label = String(form.get("label") || "").trim().slice(0, 40);

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Stamp image required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 413 });
    }
    const mime = (file.type || "").toLowerCase();
    if (mime && !IMAGE_MIME.has(mime)) {
      return NextResponse.json({ error: "Stamp must be PNG, JPG or WEBP" }, { status: 400 });
    }

    const { doc, library } = await loadLibrary(session.schoolId);
    if (library.length >= MAX_STAMPS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_STAMPS} stamps — remove one first` },
        { status: 400 },
      );
    }

    let buffer: Buffer;
    try {
      buffer = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize(600, 600, { fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } catch {
      return NextResponse.json({ error: "Could not process image" }, { status: 400 });
    }

    const id = `st-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
    const rel = `schools/${session.schoolId}/letterhead-stamps/${id}.png`;
    await mkdir(path.join(UPLOAD_ROOT, "schools", session.schoolId, "letterhead-stamps"), {
      recursive: true,
    });
    await writeFile(path.join(UPLOAD_ROOT, rel), buffer);

    const next = [
      ...library,
      { id, label: label || `Stamp ${library.length + 1}`, path: rel, createdAt: new Date().toISOString() },
    ];
    await saveLibrary(session.schoolId, session.schoolName || "", doc, next);

    return NextResponse.json({ ok: true, stamps: toResponse(next) });
  } catch (error) {
    return handleError(error, "POST /api/school/letterhead/stamps");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const id = new URL(request.url).searchParams.get("id") || "";
    const { doc, library } = await loadLibrary(session.schoolId);
    const target = library.find((s) => s.id === id);
    if (!target) {
      return NextResponse.json({ error: "Stamp not found" }, { status: 404 });
    }

    const next = library.filter((s) => s.id !== id);
    await saveLibrary(session.schoolId, session.schoolName || "", doc, next);

    const expectedPrefix = `schools/${session.schoolId}/letterhead-stamps/`;
    if (target.path.startsWith(expectedPrefix)) {
      await unlink(path.join(UPLOAD_ROOT, target.path)).catch(() => {});
    }

    return NextResponse.json({ ok: true, stamps: toResponse(next) });
  } catch (error) {
    return handleError(error, "DELETE /api/school/letterhead/stamps");
  }
}
