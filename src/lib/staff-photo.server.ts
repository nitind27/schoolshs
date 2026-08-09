import { existsSync } from "fs";
import path from "path";
import { staffPhotoRelativePath } from "@/lib/staff-photo";

export { staffPhotoRelativePath, staffPhotoPublicUrl } from "@/lib/staff-photo";

export function staffPhotoAbsolutePath(staffId: string) {
  return path.join(process.cwd(), "uploads", "staff", staffId, "photo.jpg");
}

/** Resolve any stored relative path under uploads/ */
export function resolveUploadAbsolutePath(relativePath: string) {
  const clean = relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const parts = clean.split("/").filter(Boolean);
  return path.join(process.cwd(), "uploads", ...parts);
}

export function staffPhotoFileExists(photoPath?: string | null): boolean {
  if (!photoPath?.trim()) return false;
  try {
    return existsSync(resolveUploadAbsolutePath(photoPath.trim()));
  } catch {
    return false;
  }
}
