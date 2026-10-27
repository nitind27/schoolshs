"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
} from "@/components/student-portal/student-portal-ui";
import { StudentDocumentsSection } from "@/components/documents/student-documents-section";
import { FolderOpen, ShieldCheck, Lock } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentDocumentsPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <StudentPageHeader
        icon={FolderOpen}
        title={t("studentPortal.myDocuments") || "Document Vault & Uploads"}
        subtitle={
          t("studentPortal.documentsUploadSubtitle") ||
          "Securely store and manage official certificates, marksheets, and identity proofs"
        }
        backHref="/student"
        backLabel="Back to Dashboard"
      />

      {/* Document Vault Notice */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-200/80 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">
                Government Verified Vault
              </span>
              <h3 className="text-lg font-black text-white">
                Encrypted Student Document Repository
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {t("studentPortal.documentsSelfUploadHint") ||
                  "Upload clear scanned copies of Aadhaar, caste certificate, income certificate, and bank passbook for verification."}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="h-4 w-4" />
              <span>SSL Protected</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Documents Section */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <StudentDocumentsSection
          studentId={String(student.id || "")}
          apiUrl="/api/student-portal/documents"
        />
      </div>
    </div>
  );
}
