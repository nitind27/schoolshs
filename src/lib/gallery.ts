import type { UserRole } from "@/lib/roles";

export const GALLERY_ROLES: UserRole[] = ["school_admin", "clerk", "teacher"];

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
