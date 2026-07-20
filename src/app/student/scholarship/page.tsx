"use client";

import { Badge } from "@/components/ui/badge";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentSection,
  StudentField,
  StudentStatusPill,
} from "@/components/student-portal/student-portal-ui";
import { FileCheck, IndianRupee, Building2, CheckCircle2 } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentScholarshipPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const admissionStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("admissionStatus.pending"),
      verified: t("admissionStatus.verified"),
      rejected: t("admissionStatus.rejected"),
    };
    return map[status] || status;
  };

  const scheme = String(student.scholarshipScheme || "");
  const hasScheme = scheme && scheme !== "None";

  return (
    <div className="space-y-6 max-w-3xl">
      <StudentPageHeader
        icon={FileCheck}
        title={t("studentPortal.scholarshipStatus")}
        subtitle={t("studentPortal.scholarshipSubtitle")}
      />

      <div className="student-section text-center py-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--sp-ink,#0c1e2e)] text-white">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <Badge status={student.status as string} />
        <h2 className="text-2xl font-bold text-slate-900 mt-4">
          {hasScheme ? scheme : t("studentPortal.noScholarship")}
        </h2>
        <p className="text-slate-500 mt-2">
          {t("fields.financialYear")}: <span className="font-semibold text-slate-700">{student.financialYear as string}</span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <StudentStatusPill variant={hasScheme ? "success" : "muted"}>
            {hasScheme ? t("studentPortal.schemeActive") : t("studentPortal.schemeNone")}
          </StudentStatusPill>
          <StudentStatusPill variant="default">{student.category as string}</StudentStatusPill>
        </div>
      </div>

      <StudentSection title={t("studentPortal.applicationDetails")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <StudentField label={t("studentPortal.category")} value={student.category as string} />
          <StudentField label={t("fields.course")} value={student.courseName as string} />
          <StudentField
            label={t("studentPortal.annualIncome")}
            value={
              <span className="inline-flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                {Number(student.annualFamilyIncome || 0).toLocaleString("en-IN")}
              </span>
            }
          />
          <StudentField
            label={t("studentPortal.admission")}
            value={admissionStatusLabel(String(student.admissionStatus || ""))}
          />
          <StudentField
            label={t("studentPortal.bank")}
            value={
              student.bankName ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {student.bankName as string} — {student.accountNumber as string}
                </span>
              ) : (
                "—"
              )
            }
            fullWidth
          />
          <StudentField label={t("studentPortal.ifsc")} value={student.ifscCode as string} />
        </div>
      </StudentSection>
    </div>
  );
}
