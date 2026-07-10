import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { parseIdCardShareToken, ID_CARD_SHARE_COOKIE } from "@/lib/id-card-share-token";
import { getSchoolSettingsForShare, getShareLinkBySlug, isShareLinkValid, normalizeUploadPath } from "@/lib/id-card-share";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const token = request.cookies.get(ID_CARD_SHARE_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const session = await parseIdCardShareToken(token);
    if (!session || session.slug !== slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const link = await getShareLinkBySlug(slug);
    if (!link || !isShareLinkValid(link) || session.linkId !== link.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSchoolSettingsForShare(link.schoolId);
    const rel = normalizeUploadPath(settings.logoPath);
    if (!rel) return NextResponse.json({ error: "No logo" }, { status: 404 });

    const uploadRoot = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadRoot, ...rel.split("/"));
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadRoot)) || !existsSync(resolved)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const buffer = await readFile(resolved);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
