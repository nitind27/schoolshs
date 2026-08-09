"use client";

import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
} from "@/components/student-portal/student-portal-ui";
import { StudentDocumentsSection } from "@/components/documents/student-documents-section";
import { FolderOpen } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentDocumentsPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  return (
    <div className="space-y-6 max-w-5xl">
      <StudentPageHeader
        icon={FolderOpen}
        title={t("studentPortal.myDocuments")}
        subtitle={t("studentPortal.documentsUploadSubtitle")}
      />

      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
        {t("studentPortal.documentsSelfUploadHint")}
      </div>

      <StudentDocumentsSection
        studentId={String(student.id || "")}
        apiUrl="/api/student-portal/documents"
      />
    </div>
  );
}
