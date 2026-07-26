import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const LOGO_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const CONTRACT_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);

export async function saveAdminSchoolFile(
  schoolId: string,
  file: File,
  kind: "logo" | "contract",
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length) throw new Error("Empty file");

  const dir = path.join(UPLOAD_ROOT, "schools", schoolId);
  await mkdir(dir, { recursive: true });

  let filename: string;
  let buffer: Buffer;

  if (kind === "logo") {
    const mime = (file.type || "").toLowerCase();
    if (mime && !LOGO_MIME.has(mime)) {
      throw new Error("Logo must be PNG, JPG, or WEBP");
    }
    try {
      filename = `logo-${randomBytes(4).toString("hex")}.webp`;
      buffer = await sharp(bytes)
        .rotate()
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new Error("Could not process logo image. Use a clear PNG or JPG.");
    }
  } else {
    const ext = path.extname(file.name || "").toLowerCase() || ".pdf";
    const safeExt = CONTRACT_EXT.has(ext) ? ext : ".pdf";
    if (file.type === "application/pdf" || safeExt === ".pdf" || CONTRACT_EXT.has(ext)) {
      filename = `contract-${randomBytes(4).toString("hex")}${safeExt}`;
      buffer = bytes;
    } else {
      throw new Error("Contract must be PDF or image (PNG/JPG)");
    }
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
