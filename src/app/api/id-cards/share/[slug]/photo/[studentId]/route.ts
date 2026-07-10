import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { parseIdCardShareToken, ID_CARD_SHARE_COOKIE } from "@/lib/id-card-share-token";
import { getShareLinkBySlug, isShareLinkValid, normalizeUploadPath } from "@/lib/id-card-share";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function requireShareAccess(request: NextRequest, slug: string) {
  const token = request.cookies.get(ID_CARD_SHARE_COOKIE)?.value;
  if (!token) return null;
  const session = await parseIdCardShareToken(token);
  if (!session || session.slug !== slug) return null;
  const link = await getShareLinkBySlug(slug);
  if (!link || !isShareLinkValid(link)) return null;
  if (session.linkId !== link.id || session.schoolId !== link.schoolId) return null;
  return { link };
}

async function serveFile(relativePath: string) {
  const uploadRoot = path.join(process.cwd(), "uploads");
  const filePath = path.join(uploadRoot, ...relativePath.split("/"));
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(path.resolve(uploadRoot))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!existsSync(resolved)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const buffer = await readFile(resolved);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; studentId: string }> }
) {
  try {
    const { slug, studentId } = await params;
    const access = await requireShareAccess(request, slug);
    if (!access) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: access.link.schoolId },
      select: { idPhotoProcessedPath: true, photoPath: true },
    });
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rel = normalizeUploadPath(student.idPhotoProcessedPath || student.photoPath);
    if (!rel) return NextResponse.json({ error: "No photo" }, { status: 404 });

    return serveFile(rel);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
