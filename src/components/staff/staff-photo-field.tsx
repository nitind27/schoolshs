"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { staffPhotoPublicUrl } from "@/lib/staff-photo";

export function staffPhotoUrl(photoPath?: string | null, cacheBust?: number) {
  return staffPhotoPublicUrl(photoPath, cacheBust) || null;
}

type StaffPhotoFieldProps = {
  /** Existing saved path (staff/{id}/photo.jpg) */
  photoPath?: string | null;
  /** When set, uploads immediately to API */
  staffId?: string | null;
  /** Pending local file for new staff (before id exists) */
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
  onPhotoPathChange?: (photoPath: string | null) => void;
  className?: string;
};

export function StaffPhotoField({
  photoPath,
  staffId,
  pendingFile,
  onPendingFileChange,
  onPhotoPathChange,
  className,
}: StaffPhotoFieldProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bust, setBust] = useState(0);

  useEffect(() => {
    if (!pendingFile) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const preview =
    localUrl || staffPhotoUrl(photoPath, bust || undefined) || null;

  const pickFile = async (file: File | null) => {
    setError(null);
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      setError(t("staffPage.photoInvalidType"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t("staffPage.photoTooLarge"));
      return;
    }

    if (!staffId) {
      onPendingFileChange?.(file);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/staff/${staffId}/photo`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("staffPage.photoUploadFailed"));
      onPendingFileChange?.(null);
      onPhotoPathChange?.(data.photoPath || null);
      setBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffPage.photoUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const clearPhoto = async () => {
    setError(null);
    if (!staffId) {
      onPendingFileChange?.(null);
      onPhotoPathChange?.(null);
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/photo`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("staffPage.photoRemoveFailed"));
      onPendingFileChange?.(null);
      onPhotoPathChange?.(null);
      setBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staffPage.photoRemoveFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn("staff-photo", className)}>
      <div className="staff-photo__frame">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="staff-photo__img" />
        ) : (
          <div className="staff-photo__placeholder">
            <UserRound className="h-10 w-10 text-slate-300" />
            <span>{t("staffPage.photoEmpty")}</span>
          </div>
        )}
        {uploading ? (
          <div className="staff-photo__overlay">
            <Spinner size="sm" />
          </div>
        ) : null}
      </div>

      <div className="staff-photo__meta">
        <p className="staff-photo__label">
          {t("staffPage.photoTitle")}
          <span className="staff-photo__optional">{t("common.optional")}</span>
        </p>
        <p className="staff-photo__hint">{t("staffPage.photoHint")}</p>
        <div className="staff-photo__actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {preview ? <Camera className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {preview ? t("staffPage.photoChange") : t("staffPage.photoUpload")}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => void clearPhoto()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("common.remove")}
            </Button>
          ) : null}
        </div>
        {error ? <p className="staff-photo__error">{error}</p> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          e.target.value = "";
          void pickFile(file);
        }}
      />
    </div>
  );
}

/** Helper used by new-staff page after create */
export async function uploadStaffPhoto(staffId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/staff/${staffId}/photo`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Photo upload failed");
  return data as { photoPath: string; previewUrl: string };
}
