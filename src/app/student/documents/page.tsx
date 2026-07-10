"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentEmptyState,
  StudentStatusPill,
} from "@/components/student-portal/student-portal-ui";
import {
  FileText,
  Image,
  CreditCard,
  FileBadge,
  GraduationCap,
  Receipt,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

const DOC_CONFIG: { key: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "photoPath", labelKey: "documents.photo", icon: Image },
  { key: "aadhaarDocPath", labelKey: "documents.aadhaar", icon: CreditCard },
  { key: "incomeCertPath", labelKey: "documents.income", icon: FileBadge },
  { key: "casteCertPath", labelKey: "documents.caste", icon: FileText },
  { key: "marksheet10Path", labelKey: "documents.marksheet10", icon: GraduationCap },
  { key: "marksheet12Path", labelKey: "documents.marksheet12", icon: GraduationCap },
  { key: "bankPassbookPath", labelKey: "documents.bankPassbook", icon: CreditCard },
  { key: "feeReceiptPath", labelKey: "documents.feeReceipt", icon: Receipt },
];

export default function StudentDocumentsPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const uploaded = DOC_CONFIG.filter((d) => student[d.key]);
  const missing = DOC_CONFIG.length - uploaded.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <StudentPageHeader
        icon={FolderOpen}
        title={t("studentPortal.myDocuments")}
        subtitle={t("studentPortal.documentsSubtitle")}
      />

      <div className="flex flex-wrap gap-3">
        <StudentStatusPill variant="success">
          {t("studentPortal.documentsUploaded", { count: uploaded.length })}
        </StudentStatusPill>
        {missing > 0 && (
          <StudentStatusPill variant="warning">
            {t("studentPortal.documentsPending", { count: missing })}
          </StudentStatusPill>
        )}
      </div>

      {uploaded.length ? (
        <div className="grid gap-3">
          {uploaded.map(({ key, labelKey, icon: Icon }) => (
            <div key={key} className="student-doc-card">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t(labelKey)}</p>
                  <p className="text-xs text-slate-500 truncate">{t("studentPortal.documentReady")}</p>
                </div>
              </div>
              <a
                href={student[key] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {t("common.view")}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <StudentEmptyState
          icon={FileText}
          title={t("studentPortal.noDocuments")}
          description={t("studentPortal.noDocumentsHint")}
        />
      )}
    </div>
  );
}
