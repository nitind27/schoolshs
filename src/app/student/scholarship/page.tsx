"use client";

import { Badge } from "@/components/ui/badge";
import {
  useStudentData,
  StudentLoading,
  StudentError,
  StudentPageHeader,
  StudentSection,
  StudentField,
  StudentScholarshipTimeline,
} from "@/components/student-portal/student-portal-ui";
import {
  FileCheck,
  IndianRupee,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Landmark,
  HelpCircle,
  FileText,
  Sparkles,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export default function StudentScholarshipPage() {
  const t = useT();
  const { student, loading, error } = useStudentData();

  if (loading) return <StudentLoading />;
  if (error || !student) return <StudentError message={error || t("studentPortal.loadError")} />;

  const admissionStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("admissionStatus.pending") || "Pending",
      verified: t("admissionStatus.verified") || "Verified",
      rejected: t("admissionStatus.rejected") || "Rejected",
    };
    return map[status] || status;
  };

  const scheme = String(student.scholarshipScheme || "").trim();
  const hasScheme = scheme && scheme !== "None" && scheme !== "—";

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <StudentPageHeader
        icon={FileCheck}
        title={t("studentPortal.scholarshipStatus") || "Scholarship & DBT Status"}
        subtitle={
          t("studentPortal.scholarshipSubtitle") ||
          "Direct Benefit Transfer & Government Scheme Application Tracker"
        }
        backHref="/student"
        backLabel="Back to Dashboard"
      />

      <section className="student-subhero">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-[#f3d89a]">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="student-subhero-kicker">
                  {student.financialYear || "Academic Session"}
                </span>
                <Badge status={student.status as string} />
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">
                {hasScheme ? scheme : "Government Scholarship Scheme"}
              </h2>
              <p className="mt-1 text-xs text-teal-100/85 sm:text-sm">
                Category: <span className="font-bold text-[#f3d89a]">{String(student.category || "General")}</span> • School:{" "}
                <span className="font-semibold">{student.school?.name || (student.institutionName as string) || "School"}</span>
              </p>
            </div>
          </div>

          <div className="student-hero-chip sm:min-w-[180px]">
            <span>Application State</span>
            <strong className="flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {hasScheme ? "Scheme Active" : "In Verification"}
            </strong>
          </div>
        </div>

        <div className="relative z-10 mt-6 border-t border-white/15 pt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f3d89a]">
            Government Application Progression
          </p>
          <StudentScholarshipTimeline status={student.status as string} />
        </div>
      </section>

      {/* Direct Benefit Transfer (DBT) & Bank Verification */}
      <StudentSection
        title="Direct Benefit Transfer (DBT) Bank Account"
        description="Aadhaar-linked bank account for scholarship disbursements"
        icon={Landmark}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            <div className="flex items-center gap-2.5 text-teal-800 font-bold text-sm">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>{student.bankName ? (student.bankName as string) : "Aadhaar Enabled Account"}</span>
            </div>
            <p className="mt-2 font-mono text-base font-extrabold text-slate-900">
              {student.accountNumber
                ? `•••• •••• ${String(student.accountNumber).slice(-4)}`
                : "Linked via Aadhaar (APBS)"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              IFSC Code: <span className="font-mono font-semibold text-slate-700">{student.ifscCode ? String(student.ifscCode) : "Verified"}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Aadhaar Seeding Status</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-emerald-900">
              Active for DBT Payments
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Scholarship aid will be disbursed directly into student&apos;s verified bank account via NPCI mapper.
            </p>
          </div>
        </div>
      </StudentSection>

      {/* Application Details */}
      <StudentSection
        title={t("studentPortal.applicationDetails") || "Scheme & Eligibility Parameters"}
        description="Parameters verified against government scholarship criteria"
        icon={FileText}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentField label={t("studentPortal.category")} value={student.category as string} />
          <StudentField label={t("fields.course")} value={student.courseName as string} />
          <StudentField
            label={t("studentPortal.annualIncome")}
            value={
              <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                {Number(student.annualFamilyIncome || 0).toLocaleString("en-IN")}
              </span>
            }
          />
          <StudentField
            label={t("studentPortal.admission")}
            value={admissionStatusLabel(String(student.admissionStatus || ""))}
          />
          <StudentField
            label="Enrolled Class"
            value={`${student.standard || "—"} - ${student.section || "—"}`}
          />
          <StudentField
            label="General Register (GR) Number"
            value={student.grNumber as string}
            copyable
          />
          <StudentField
            label="Institution UDISE Code"
            value={student.school?.udiseCode || student.school?.code || "Verified"}
          />
          <StudentField
            label="Financial Cycle"
            value={student.financialYear as string}
          />
        </div>
      </StudentSection>

      {/* Important Guidelines for Students */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-teal-600" />
          Important Instructions for Scholarship Beneficiaries
        </h4>
        <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 list-disc list-inside">
          <li>Ensure your linked bank account has active KYC and no transaction limits.</li>
          <li>Aadhaar number must remain linked with your mobile number for OTP alerts.</li>
          <li>For any changes in parent income certificate or caste certificate, contact the school office.</li>
        </ul>
      </div>
    </div>
  );
}
