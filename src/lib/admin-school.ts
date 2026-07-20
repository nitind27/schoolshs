import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function saveAdminSchoolFile(
  schoolId: string,
  file: File,
  kind: "logo" | "contract"
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = kind === "logo" ? "webp" : path.extname(file.name || "").toLowerCase() || ".pdf";
  const dir = path.join(UPLOAD_ROOT, "schools", schoolId);
  await mkdir(dir, { recursive: true });

  let filename: string;
  let buffer: Buffer;

  if (kind === "logo") {
    filename = `logo-${randomBytes(4).toString("hex")}.webp`;
    buffer = await sharp(bytes)
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } else {
    const safeExt = [".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".pdf";
    filename = `contract-${randomBytes(4).toString("hex")}${safeExt}`;
    buffer = bytes;
  }

  const rel = `schools/${schoolId}/${filename}`;
  await writeFile(path.join(UPLOAD_ROOT, rel), buffer);
  return rel;
}

export async function deleteAdminSchoolFile(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  const normalized = relativePath.replace(/^uploads[/\\]/, "").replace(/\\/g, "/");
  const full = path.join(UPLOAD_ROOT, normalized);
  if (!full.startsWith(UPLOAD_ROOT)) return;
  try {
    await unlink(full);
  } catch {
    // file may already be removed
  }
}

export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
