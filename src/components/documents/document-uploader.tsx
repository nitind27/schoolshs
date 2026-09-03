"use client";

import { Spinner } from "@/components/ui/loader";
import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { compressForDigitalGujarat } from "@/lib/compress-document.client";
import { DG_DOC_LIMITS, formatKB, isDGReady } from "@/lib/dg-document-limits";
import { useT } from "@/i18n/locale-provider";
import { Upload, X, FileText, ImageIcon, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, ScanLine } from "lucide-react";
import { DocumentScanner } from "@/components/documents/document-scanner";
import "./document-uploader.css";

import type { DocType } from "@/lib/student-documents";
import { visibleDocTypesForStandard } from "@/lib/student-documents";

export type { DocType };

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
  /** Override upload API (default: /api/students/{id}/documents). Student portal uses /api/student-portal/documents */
  apiUrl?: string;
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

function translateDocError(t: Translator, err: unknown, fallbackKey: string): string {
  if (err instanceof Error && err.message.startsWith("documents.")) {
    return t(err.message);
  }
  return t(fallbackKey);
}

function apiErrorMessage(t: Translator, data: { errorKey?: string; error?: string }, fallbackKey = "documents.uploadFailed"): string {
  if (data.errorKey) return t(data.errorKey);
  return data.error || t(fallbackKey);
}

export function getDefaultDocuments(
  t: Translator,
  standard?: string | null,
): Omit<DocumentInfo, "previewUrl" | "fileName" | "mimeType" | "size" | "originalSize" | "dgReady" | "compressMessage">[] {
  const all = [
    { type: "photo" as const, label: t("documents.photo"), description: t("documents.photoDesc"), accept: "image/jpeg,image/jpg,image/png,image/webp", required: true },
    { type: "aadhaar" as const, label: t("documents.aadhaar"), description: t("documents.aadhaarDesc"), accept: "image/jpeg,image/jpg,image/png,image/webp,application/pdf" },
    { type: "income" as const, label: t("documents.income"), description: t("documents.incomeDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "caste" as const, label: t("documents.caste"), description: t("documents.casteDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "marksheet10" as const, label: t("documents.marksheet10"), description: t("documents.marksheet10Desc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "marksheet12" as const, label: t("documents.marksheet12"), description: t("documents.marksheet12Desc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "bankPassbook" as const, label: t("documents.bankPassbook"), description: t("documents.bankPassbookDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
    { type: "feeReceipt" as const, label: t("documents.feeReceipt"), description: t("documents.feeReceiptDesc"), accept: "image/jpeg,image/jpg,image/png,application/pdf" },
  ];
  if (standard === undefined) return all;
  const allowed = new Set(visibleDocTypesForStandard(standard));
  return all.filter((d) => allowed.has(d.type));
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
  studentId: _studentId,
  apiUrl,
  onUpdate,
  onRemove,
}: {
  doc: DocumentInfo;
  studentId: string;
  apiUrl: string;
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
        setError(translateDocError(t, err, "documents.compressionFailed"));
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
        const res = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(apiErrorMessage(t, data));
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
    [doc.type, apiUrl, onUpdate, compressMsg, t]
  );

  const handleRemove = async () => {
    setUploading(true);
    try {
      await fetch(apiUrl, {
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
  const cardState = !hasFile ? "empty" : dgReady ? "ready" : "warn";

  return (
    <div
      className="doc-card"
      data-drag={dragOver ? "true" : "false"}
      data-state={cardState}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="doc-card__preview">
        {busy && (
          <div className="doc-card__busy">
            {compressing ? (
              <>
                <Sparkles className="h-8 w-8 text-teal-600 animate-pulse" />
                <span className="doc-card__busy-title">{t("documents.autoCompressing")}</span>
                <span className="doc-card__busy-sub">
                  {t("documents.dgLimitNote", { maxKB })}
                </span>
              </>
            ) : (
              <>
                <Spinner size="lg" />
                <span className="doc-card__busy-title">{t("documents.uploading")}</span>
              </>
            )}
          </div>
        )}

        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={localPreview || doc.previewUrl || ""}
            alt={doc.label}
            className="doc-card__img"
          />
        ) : hasFile ? (
          <div className="doc-card__file">
            <div className="doc-card__file-ico">
              <FileText className="h-9 w-9 text-rose-500" />
            </div>
            <p className="doc-card__file-name">{doc.fileName}</p>
            {doc.size != null && (
              <p className="text-xs text-slate-400">{formatSize(doc.size)}</p>
            )}
          </div>
        ) : (
          <div className="doc-card__empty">
            <div className="doc-card__empty-ico">
              {doc.type === "photo" ? (
                <ImageIcon className="h-9 w-9" />
              ) : (
                <Upload className="h-9 w-9" />
              )}
            </div>
            <p className="doc-card__empty-text">{t("documents.chooseOrScan")}</p>
          </div>
        )}

        {hasFile && !busy && (
          <span
            className="doc-card__badge"
            data-tone={dgReady ? "ok" : "warn"}
          >
            {dgReady ? (
              <>
                <ShieldCheck className="h-3 w-3" /> {t("documents.dgReady")}
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />{" "}
                {t("documents.overLimit", { maxKB })}
              </>
            )}
          </span>
        )}
      </div>

      <div className="doc-card__body">
        <div className="doc-card__head">
          <div className="min-w-0">
            <p className="doc-card__title">
              {doc.label}
              {doc.required ? <span className="doc-card__req">*</span> : null}
            </p>
            <p className="doc-card__desc">
              {t("documents.autoMax", { maxKB, desc: doc.description })}
            </p>
          </div>
          {hasFile && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="doc-card__remove"
              title={t("documents.remove")}
              aria-label={t("documents.remove")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {(compressMsg || doc.compressMessage) && hasFile && (
          <div className="doc-card__msg" data-tone="ok">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{compressMsg || doc.compressMessage}</span>
          </div>
        )}

        {error && (
          <div className="doc-card__msg" data-tone="err">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
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

        <div className="doc-card__actions">
          <button
            type="button"
            className={cn(
              "doc-card__btn",
              hasFile ? "doc-card__btn--outline" : "doc-card__btn--primary",
            )}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {hasFile ? t("documents.change") : t("documents.chooseFile")}
          </button>
          <button
            type="button"
            className="doc-card__btn doc-card__btn--scan"
            disabled={busy}
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine className="h-4 w-4" />
            {t("documents.scan")}
          </button>
        </div>

        <DocumentScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(file) => uploadFile(file)}
          docLabel={doc.label}
          docType={doc.type}
        />

        {hasFile && doc.size != null && (
          <div className="doc-card__meta">
            <span
              className="doc-card__meta-size"
              data-tone={dgReady ? "ok" : "warn"}
            >
              {formatSize(doc.size)}
            </span>
            {doc.originalSize && doc.originalSize > doc.size ? (
              <span className="doc-card__meta-old">
                {formatKB(doc.originalSize)}
              </span>
            ) : null}
            <span className="doc-card__meta-max">/ {maxKB} KB</span>
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
  apiUrl,
}: DocumentUploaderProps) {
  const t = useT();
  const endpoint = apiUrl || `/api/students/${studentId}/documents`;
  const uploaded = documents.filter((d) => d.previewUrl || d.fileName).length;
  const dgReadyCount = documents.filter((d) => d.dgReady ?? (d.size ? isDGReady(d.size, d.type) : false)).length;

  return (
    <div className="doc-up">
      <div className="doc-up__banner">
        <div className="doc-up__banner-copy">
          <span className="doc-up__banner-ico" aria-hidden>
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            {t("documents.autoCompressBanner", {
              maxKB: DG_DOC_LIMITS.photo.maxKB,
            })}
          </span>
        </div>
        <div className="doc-up__progress">
          <span className="doc-up__progress-label">
            {t("documents.uploadedCount", {
              uploaded,
              total: documents.length,
              ready: dgReadyCount,
            })}
          </span>
          <div className="doc-up__progress-track" aria-hidden>
            <div
              className="doc-up__progress-fill"
              style={{
                width: `${uploaded ? (dgReadyCount / documents.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="doc-up__grid">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.type}
            doc={doc}
            studentId={studentId}
            apiUrl={endpoint}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
