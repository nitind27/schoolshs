import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, galleryDownloadName } from "@/lib/gallery";
import { galleryFileAbs } from "@/lib/gallery-upload";
import { attachmentDisposition } from "@/lib/content-disposition";
import { buildZipStore, uniqueZipNames } from "@/lib/zip-store";

type RouteParams = { params: Promise<{ titleId: string }> };

export const maxDuration = 120;

const ZIP_MAX_BYTES = 400 * 1024 * 1024;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { titleId } = await params;

    const title = await prisma.galleryTitle.findFirst({
      where: { id: titleId, event: { schoolId: session.schoolId } },
      include: {
        images: {
          orderBy: { createdAt: "asc" },
          select: { filePath: true, originalName: true },
        },
      },
    });
    if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });
    if (!title.images.length) {
      return NextResponse.json({ error: "Nothing to download" }, { status: 400 });
    }

    const names = uniqueZipNames(
      title.images.map((img) => galleryDownloadName(img.originalName, img.filePath)),
    );
    const entries = [];
    let total = 0;
    for (let i = 0; i < title.images.length; i++) {
      const data = await readFile(galleryFileAbs(title.images[i].filePath));
      total += data.length;
      if (total > ZIP_MAX_BYTES) {
        return NextResponse.json(
          { error: "These files are too large to zip together. Download them one by one." },
          { status: 413 },
        );
      }
      entries.push({ name: names[i], data });
    }

    const zip = buildZipStore(entries);
    const zipName = `${galleryDownloadName(title.title, "gallery")}.zip`;

    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachmentDisposition(zipName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery zip]", error);
    return NextResponse.json({ error: "Failed to create ZIP" }, { status: 500 });
  }
}
