/** Canonical DB path: staff/{staffId}/photo.jpg — safe for client + server */
export function staffPhotoRelativePath(staffId: string) {
  return `staff/${staffId}/photo.jpg`;
}

export function staffPhotoPublicUrl(
  photoPath?: string | null,
  cacheBust?: number | string,
) {
  if (!photoPath?.trim()) return null;
  const base = `/api/uploads/${photoPath.trim().replace(/^[/\\]+/, "")}`;
  return cacheBust != null ? `${base}?t=${cacheBust}` : base;
}
