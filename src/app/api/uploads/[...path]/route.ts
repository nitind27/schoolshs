import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments?.length || segments[0] !== "students") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const uploadRoot = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadRoot, ...segments);
    const resolved = path.resolve(filePath);

    if (!resolved.startsWith(path.resolve(uploadRoot))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!existsSync(resolved)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const buffer = await readFile(resolved);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
