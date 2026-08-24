import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, galleryDownloadName } from "@/lib/gallery";
import { galleryFileAbs } from "@/lib/gallery-upload";
import { attachmentDisposition } from "@/lib/content-disposition";

type RouteParams = { params: Promise<{ imageId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { imageId } = await params;

    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, title: { event: { schoolId: session.schoolId } } },
      select: { filePath: true, originalName: true },
    });
    if (!image) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const abs = galleryFileAbs(image.filePath);
    const buffer = await readFile(abs);
    const filename = galleryDownloadName(image.originalName, image.filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentDisposition(filename),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
