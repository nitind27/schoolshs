import { existsSync } from "fs";
import { staffPhotoRelativePath } from "@/lib/staff-photo";
import { projectPath } from "@/lib/project-path";

export { staffPhotoRelativePath, staffPhotoPublicUrl } from "@/lib/staff-photo";

export function staffPhotoAbsolutePath(staffId: string) {
  return projectPath("uploads", "staff", staffId, "photo.jpg");
}

/** Resolve any stored relative path under uploads/ */
export function resolveUploadAbsolutePath(relativePath: string) {
  const clean = relativePath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const parts = clean.split("/").filter(Boolean);
  return projectPath("uploads", ...parts);
}

export function staffPhotoFileExists(photoPath?: string | null): boolean {
  if (!photoPath?.trim()) return false;
  try {
    return existsSync(resolveUploadAbsolutePath(photoPath.trim()));
  } catch {
    return false;
  }
}
