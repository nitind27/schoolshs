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

      <section className="student-subhero">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#f3d89a]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <span className="student-subhero-kicker">Verified Vault</span>
              <h3 className="mt-1.5 text-lg font-extrabold text-white">
                Encrypted Student Document Repository
              </h3>
              <p className="mt-0.5 text-xs text-teal-100/80">
                {t("studentPortal.documentsSelfUploadHint") ||
                  "Upload clear scanned copies of Aadhaar, caste certificate, income certificate, and bank passbook for verification."}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            SSL Protected
          </span>
        </div>
      </section>

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
