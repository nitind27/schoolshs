import "server-only";

import { rm, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { projectResolve } from "@/lib/project-path";

export const GALLERY_MAX_INPUT = 8 * 1024 * 1024;
export const GALLERY_MAX_VIDEO = 80 * 1024 * 1024;
export const GALLERY_MAX_FILES = 20;
export const GALLERY_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const GALLERY_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-matroska",
]);

export async function compressGalleryImage(input: Buffer) {
  let quality = 84;
  let buffer = await sharp(input)
    .rotate()
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (buffer.length > 900 * 1024 && quality > 52) {
    quality -= 8;
    buffer = await sharp(input)
      .rotate()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  return buffer;
}

function uploadsRoot() {
  return projectResolve("uploads");
}

/** Absolute path under /uploads for a stored gallery filePath. */
export function galleryFileAbs(filePath: string) {
  const rel = filePath.replace(/^uploads[/\\]/, "").replace(/^[/\\]+/, "");
  const abs = path.resolve(uploadsRoot(), ...rel.split(/[/\\]+/).filter(Boolean));
  const root = uploadsRoot();
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error("Invalid gallery path");
  }
  return abs;
}

export async function unlinkGalleryFile(filePath: string) {
  try {
    await unlink(galleryFileAbs(filePath));
  } catch {
    /* already gone */
  }
}

export async function removeGalleryFolder(...parts: string[]) {
  const root = path.resolve(uploadsRoot(), "gallery");
  const abs = path.resolve(root, ...parts.filter(Boolean));
  if (abs !== root && !abs.startsWith(root + path.sep)) return;
  await rm(abs, { recursive: true, force: true }).catch(() => undefined);
}
