import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const form = await request.formData();
    const kind = String(form.get("kind") || "").trim(); // logo | signature
    const file = form.get("file");

    if (kind !== "logo" && kind !== "signature") {
      return NextResponse.json({ error: "kind must be logo or signature" }, { status: 400 });
    }
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    if (mime && !IMAGE_MIME.has(mime)) {
      return NextResponse.json({ error: "Image must be PNG, JPG, or WEBP" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(UPLOAD_ROOT, "schools", session.schoolId);
    await mkdir(dir, { recursive: true });

    const filename =
      kind === "logo"
        ? `logo-${randomBytes(4).toString("hex")}.webp`
        : `signature-${randomBytes(4).toString("hex")}.png`;

    let buffer: Buffer;
    try {
      if (kind === "logo") {
        buffer = await sharp(bytes)
          .rotate()
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();
      } else {
        buffer = await sharp(bytes)
          .rotate()
          .resize(600, 220, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer();
      }
    } catch {
      return NextResponse.json({ error: "Could not process image" }, { status: 400 });
    }

    const rel = `schools/${session.schoolId}/${filename}`;
    await writeFile(path.join(UPLOAD_ROOT, rel), buffer);

    const field = kind === "logo" ? "logoPath" : "signaturePath";
    const settings = await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || "My School",
        [field]: rel,
      },
      update: { [field]: rel },
    });

    return NextResponse.json({
      ok: true,
      path: rel,
      url: `/api/uploads/${rel}`,
      settings,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[school settings asset POST]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
