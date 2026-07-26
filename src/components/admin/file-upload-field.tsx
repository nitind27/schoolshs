"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useRef, useState } from "react";
import { Upload, FileText, ImageIcon, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  hint?: string;
  /** Bullet list of what to upload / requirements */
  requirements?: string[];
  previewUrl?: string;
  /** Existing uploaded file name to show when no new selection */
  existingFileName?: string;
  isImage?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
  onClear?: () => void;
  className?: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  label,
  accept = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp",
  hint,
  requirements,
  previewUrl,
  existingFileName,
  isImage = true,
  uploading,
  onFile,
  onClear,
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const preview = localPreview || previewUrl;
  const displayName = selected?.name || existingFileName;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {requirements && requirements.length > 0 && (
        <ul className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 space-y-1">
          {requirements.map((r) => (
            <li key={r} className="flex items-start gap-2 text-[11px] text-sky-900 leading-snug">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sky-600" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-4 transition-colors",
          uploading
            ? "border-sky-300 bg-sky-50"
            : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (localPreview) URL.revokeObjectURL(localPreview);
            if (isImage) setLocalPreview(URL.createObjectURL(f));
            else setLocalPreview(null);
            setSelected({ name: f.name, size: f.size });
            onFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-4">
          {preview && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-16 w-16 rounded-xl object-cover border border-slate-200 bg-white"
            />
          ) : displayName || preview ? (
            <div className="h-16 w-16 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
              <FileText className="h-8 w-8 text-sky-700" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              {isImage ? (
                <ImageIcon className="h-7 w-7 text-slate-400" />
              ) : (
                <FileText className="h-7 w-7 text-slate-400" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60 cursor-pointer"
              >
                {uploading ? <Spinner size="sm" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading..." : displayName ? "Replace file" : "Choose File"}
              </button>
              {previewUrl && !isImage && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View current
                </a>
              )}
              {selected && onClear && (
                <button
                  type="button"
                  onClick={() => {
                    if (localPreview) URL.revokeObjectURL(localPreview);
                    setLocalPreview(null);
                    setSelected(null);
                    onClear();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
            {displayName && (
              <p className="text-xs font-medium text-slate-800 truncate" title={displayName}>
                {displayName}
                {selected ? (
                  <span className="text-slate-400 font-normal"> · {formatBytes(selected.size)}</span>
                ) : existingFileName ? (
                  <span className="text-emerald-600 font-normal"> · uploaded</span>
                ) : null}
              </p>
            )}
            {hint && <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
