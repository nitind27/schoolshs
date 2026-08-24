import type { UserRole } from "@/lib/roles";

export const GALLERY_ROLES: UserRole[] = ["school_admin", "clerk", "teacher"];

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function canManageGallery(role: string) {
  return GALLERY_ROLES.includes(role as UserRole);
}

/** Admin / clerk can delete events, titles, and any photo. Teachers can add photos. */
export function canDeleteGallery(role: string) {
  return role === "school_admin" || role === "clerk";
}

export function canDeleteGalleryImage(role: string, uploadedById: string | null, userId: string) {
  if (canDeleteGallery(role)) return true;
  return Boolean(uploadedById && uploadedById === userId);
}

export function galleryImagePublicUrl(filePath: string) {
  return `/api/uploads/${filePath.replace(/^uploads\//, "").replace(/^\/+/, "")}`;
}

export function galleryFileExt(filePath: string) {
  const clean = filePath.split("?")[0];
  const slash = Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\"));
  const base = slash >= 0 ? clean.slice(slash + 1) : clean;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot).toLowerCase() : "";
}

export function galleryMediaKind(filePath: string): "image" | "video" {
  return VIDEO_EXTS.has(galleryFileExt(filePath)) ? "video" : "image";
}

export function isGalleryVideoFile(file: { type?: string; name?: string }) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("video/")) return true;
  return VIDEO_EXTS.has(galleryFileExt(file.name || ""));
}

export function isGalleryImageFile(file: { type?: string; name?: string }) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return IMAGE_EXTS.has(galleryFileExt(file.name || ""));
}

export function galleryVideoExt(file: { type?: string; name?: string }) {
  const fromName = galleryFileExt(file.name || "");
  if (VIDEO_EXTS.has(fromName)) return fromName;
  const type = (file.type || "").toLowerCase();
  if (type === "video/webm") return ".webm";
  if (type === "video/quicktime") return ".mov";
  if (type.includes("m4v")) return ".m4v";
  return ".mp4";
}

export function galleryDownloadName(originalName: string | null | undefined, filePath: string) {
  const fallback = filePath.split(/[/\\]/).pop() || "gallery-file";
  const raw = (originalName || fallback).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
  return raw.slice(0, 150) || fallback;
}

export function serializeGalleryMedia(
  img: {
    id: string;
    filePath: string;
    originalName: string | null;
    uploadedByName: string | null;
    uploadedById: string | null;
    createdAt: Date;
  },
  canDelete: boolean,
) {
  return {
    id: img.id,
    url: galleryImagePublicUrl(img.filePath),
    originalName: img.originalName,
    uploadedByName: img.uploadedByName,
    uploadedById: img.uploadedById,
    createdAt: img.createdAt,
    kind: galleryMediaKind(img.filePath),
    canDelete,
  };
}
