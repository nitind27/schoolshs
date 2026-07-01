"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { compressForDigitalGujarat } from "@/lib/compress-document.client";
import { DG_DOC_LIMITS, formatKB, isDGReady } from "@/lib/dg-document-limits";
import { useT } from "@/i18n/locale-provider";
import {
  Upload,
  X,
  FileText,
  ImageIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentScanner } from "@/components/documents/document-scanner";

export type DocType =
  | "photo"
  | "aadhaar"
  | "income"
  | "caste"
  | "marksheet10"
  | "marksheet12"
  | "bankPassbook"
  | "feeReceipt";

export interface DocumentInfo {
  type: DocType;
  label: string;
  description: string;
  accept: string;
  required?: boolean;
  previewUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  originalSize?: number | null;
  filePath?: string | null;
  dgReady?: boolean;
  compressMessage?: string | null;
}

interface DocumentUploaderProps {
  studentId: string;
  documents: DocumentInfo[];
  onUpdate: (type: DocType, data: Partial<DocumentInfo>) => void;
  onRemove: (type: DocType) => void;
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

export function getDefaultDocuments(t: Translator): Omit<DocumentInfo, "previewUrl" | "fileName" | "mimeType" | "size" | "originalSize" | "dgReady" | "compressMessage">[] {
  return [
    { type: "photo", label: t("documents.photo"), description: t("documents.photoDesc"), accept: "image/jpeg,image/jpg,image/png,image/webp", required: true },
    { type: "aadhaar", label: t("documents.aadhaar"), description: t("documents.aadhaarDesc"), accept: "image/jpeg,image/jpg,image/png,image/webp,application/pdf" },
    { type: "income", label: t("documents.income"), description: t("documents.incomeDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "caste", label: t("documents.caste"), description: t("documents.casteDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "marksheet10", label: t("documents.marksheet10"), description: t("documents.marksheet10Desc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "marksheet12", label: t("documents.marksheet12"), description: t("documents.marksheet12Desc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "bankPassbook", label: t("documents.bankPassbook"), description: t("documents.bankPassbookDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "feeReceipt", label: t("documents.feeReceipt"), description: t("documents.feeReceiptDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  ];
}

/** @deprecated Use getDefaultDocuments(t) instead */
export const DEFAULT_DOCUMENTS: Omit<DocumentInfo, "previewUrl" | "fileName" | "mimeType" | "size" | "originalSize" | "dgReady" | "compressMessage">[] = [
  { type: "photo", label: "Passport Photo", description: "Recent passport size photo", accept: "image/jpeg,image/jpg,image/png,image/webp", required: true },
  { type: "aadhaar", label: "Aadhaar Card", description: "Front side scan", accept: "image/jpeg,image/jpg,image/png,image/webp,application/pdf" },
  { type: "income", label: "Income Certificate", description: "Family income proof", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  { type: "caste", label: "Caste Certificate", description: "SC/ST/OBC certificate", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  { type: "marksheet10", label: "10th Marksheet", description: "Standard 10 marksheet", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  { type: "marksheet12", label: "12th Marksheet", description: "Standard 12 marksheet", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  { type: "bankPassbook", label: "Bank Passbook", description: "First page with account details", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  { type: "feeReceipt", label: "Fee Receipt", description: "Current year fee receipt", accept: "image/jpeg,image/jpg,image/png,application/pdf" },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function isImage(mime?: string | null, fileName?: string | null) {
  if (mime?.startsWith("image/")) return true;
  if (fileName) return /\.(jpg|jpeg|png|webp)$/i.test(fileName);
  return false;
}

function DocumentCard({
  doc,
  studentId,
  onUpdate,
  onRemove,
}: {
  doc: DocumentInfo;
  studentId: string;
  onUpdate: (type: DocType, data: Partial<DocumentInfo>) => void;
  onRemove: (type: DocType) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressMsg, setCompressMsg] = useState<string | null>(doc.compressMessage ?? null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const maxKB = DG_DOC_LIMITS[doc.type].maxKB;
  const hasFile = !!(doc.previewUrl || doc.fileName || localPreview);
  const showImage = isImage(doc.mimeType, doc.fileName) && (localPreview || doc.previewUrl);
  const dgReady = doc.dgReady ?? (doc.size ? isDGReady(doc.size, doc.type) : false);

  const uploadFile = useCallback(
    async (rawFile: File) => {
      setError(null);
      setCompressing(true);
      setCompressMsg(null);

      let file = rawFile;
      let originalSize = rawFile.size;

      try {
        const result = await compressForDigitalGujarat(rawFile, doc.type);
        file = result.file;
        originalSize = result.originalSize;
        setCompressMsg(result.message);

        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          setLocalPreview(url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("documents.compressionFailed"));
        setCompressing(false);
        return;
      }

      setCompressing(false);
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", doc.type);
      formData.append("originalSize", String(originalSize));

      try {
        const res = await fetch(`/api/students/${studentId}/documents`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || t("documents.uploadFailed"));
          setLocalPreview(null);
          return;
        }

        setCompressMsg(data.compressMessage || compressMsg);

        onUpdate(doc.type, {
          previewUrl: data.previewUrl,
          fileName: data.fileName,
          mimeType: data.mimeType,
          size: data.size,
          originalSize: data.originalSize,
          filePath: data.filePath,
          dgReady: data.dgReady,
          compressMessage: data.compressMessage,
        });
      } catch {
        setError(t("documents.uploadFailed"));
        setLocalPreview(null);
      } finally {
        setUploading(false);
      }
    },
    [doc.type, studentId, onUpdate, compressMsg, t]
  );

  const handleRemove = async () => {
    setUploading(true);
    try {
      await fetch(`/api/students/${studentId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: doc.type }),
      });
      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setCompressMsg(null);
      setError(null);
      onRemove(doc.type);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const busy = uploading || compressing;

  return (
    <div
      className={cn(
        "group relative rounded-xl border-2 bg-white transition-all overflow-hidden",
        dragOver ? "border-blue-500 bg-blue-50/50 scale-[1.01]" : "border-slate-200 hover:border-slate-300",
        hasFile && dgReady && "border-emerald-300",
        hasFile && !dgReady && "border-amber-300"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {busy && (
          <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center gap-2">
            {compressing ? (
              <>
                <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">{t("documents.autoCompressing")}</span>
                <span className="text-xs text-slate-500">{t("documents.dgLimitNote", { maxKB })}</span>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <span className="text-sm text-slate-600">{t("documents.uploading")}</span>
              </>
            )}
          </div>
        )}

        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localPreview || doc.previewUrl || ""}
            alt={doc.label}
            className="w-full h-full object-contain p-2"
          />
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-2 text-slate-500 p-4">
            <div className="p-4 bg-red-50 rounded-xl">
              <FileText className="h-10 w-10 text-red-500" />
            </div>
            <p className="text-xs font-medium text-center truncate max-w-full px-2">
              {doc.fileName}
            </p>
            {doc.size && <p className="text-xs text-slate-400">{formatSize(doc.size)}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400 p-4">
            <div className="p-4 bg-slate-100 rounded-xl group-hover:bg-blue-50 transition-colors">
              {doc.type === "photo" ? (
                <ImageIcon className="h-10 w-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
              ) : (
                <Upload className="h-10 w-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
            <p className="text-xs text-center">{t("documents.chooseOrScan")}</p>
          </div>
        )}

        {hasFile && !busy && (
          <div className="absolute top-2 right-2">
            {dgReady ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                <ShieldCheck className="h-3 w-3" /> {t("documents.dgReady")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                <AlertCircle className="h-3 w-3" /> {t("documents.overLimit", { maxKB })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {doc.label}
              {doc.required && <span className="text-red-500 ml-0.5">*</span>}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("documents.autoMax", { maxKB, desc: doc.description })}
            </p>
          </div>
          {hasFile && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title={t("documents.remove")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {(compressMsg || doc.compressMessage) && hasFile && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {compressMsg || doc.compressMessage}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={doc.accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant={hasFile ? "outline" : "default"}
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {hasFile ? t("documents.change") : t("documents.chooseFile")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine className="h-3.5 w-3.5" />
            {t("documents.scan")}
          </Button>
        </div>

        <DocumentScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(file) => uploadFile(file)}
          docLabel={doc.label}
          docType={doc.type}
        />

        {hasFile && doc.size != null && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={cn("font-medium", dgReady ? "text-emerald-600" : "text-amber-600")}>
              {formatSize(doc.size)}
            </span>
            {doc.originalSize && doc.originalSize > doc.size && (
              <span className="text-slate-400 line-through">{formatKB(doc.originalSize)}</span>
            )}
            <span className="text-slate-400">/ {maxKB} KB</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentUploader({
  studentId,
  documents,
  onUpdate,
  onRemove,
}: DocumentUploaderProps) {
  const t = useT();
  const uploaded = documents.filter((d) => d.previewUrl || d.fileName).length;
  const dgReadyCount = documents.filter((d) => d.dgReady ?? (d.size ? isDGReady(d.size, d.type) : false)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            {t("documents.autoCompressBanner", { maxKB: DG_DOC_LIMITS.photo.maxKB })}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-blue-700">
            {t("documents.uploadedCount", { uploaded, total: documents.length, ready: dgReadyCount })}
          </span>
          <div className="h-2 w-24 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${uploaded ? (dgReadyCount / documents.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.type}
            doc={doc}
            studentId={studentId}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
