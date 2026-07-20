"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  label: string;
  accept?: string;
  hint?: string;
  previewUrl?: string;
  isImage?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
  className?: string;
}

export function FileUploadField({
  label,
  accept = "image/*",
  hint,
  previewUrl,
  isImage = true,
  uploading,
  onFile,
  className,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview = localPreview || previewUrl;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed p-4 transition-colors",
          uploading ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30"
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
            if (isImage) setLocalPreview(URL.createObjectURL(f));
            onFile(f);
          }}
        />
        <div className="flex items-center gap-4">
          {preview && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
          ) : preview && !isImage ? (
            <div className="h-16 w-16 rounded-xl bg-violet-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-violet-600" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center">
              {isImage ? <ImageIcon className="h-7 w-7 text-slate-400" /> : <FileText className="h-7 w-7 text-slate-400" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Uploading..." : "Choose File"}
            </button>
            {hint && <p className="text-[11px] text-slate-500 mt-1.5">{hint}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
