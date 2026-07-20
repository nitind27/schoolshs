"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DocumentUploader,
  getDefaultDocuments,
  type DocumentInfo,
  type DocType,
} from "@/components/documents/document-uploader";
import { useT } from "@/i18n/locale-provider";
import { Loader2 } from "lucide-react";

interface Props {
  studentId: string;
}

export function StudentDocumentsSection({ studentId }: Props) {
  const t = useT();
  const [documents, setDocuments] = useState<DocumentInfo[]>(() =>
    getDefaultDocuments(t).map((d) => ({ ...d }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/documents`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("documents.loadFailed"));

      const defaults = getDefaultDocuments(t);
      const byType = new Map((data.documents as { type: DocType; previewUrl?: string; fileName?: string; mimeType?: string; size?: number; dgReady?: boolean }[]).map((d) => [d.type, d]));

      setDocuments(
        defaults.map((base) => {
          const remote = byType.get(base.type);
          if (!remote) return { ...base };
          return {
            ...base,
            previewUrl: remote.previewUrl,
            fileName: remote.fileName,
            mimeType: remote.mimeType,
            size: remote.size ?? null,
            dgReady: remote.dgReady,
          };
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documents.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpdate = (type: DocType, data: Partial<DocumentInfo>) => {
    setDocuments((prev) => prev.map((d) => (d.type === type ? { ...d, ...data } : d)));
  };

  const handleRemove = (type: DocType) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.type === type
          ? {
              ...d,
              previewUrl: null,
              fileName: null,
              mimeType: null,
              size: null,
              originalSize: null,
              filePath: null,
              dgReady: false,
              compressMessage: null,
            }
          : d
      )
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">{t("documents.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <DocumentUploader
      studentId={studentId}
      documents={documents}
      onUpdate={handleUpdate}
      onRemove={handleRemove}
    />
  );
}
