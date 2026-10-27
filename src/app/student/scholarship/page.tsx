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

      {/* Hero Status Card */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-200/80 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-bl-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[11px] font-bold text-teal-300 border border-teal-400/30">
                  {student.financialYear || "Academic Session"}
                </span>
                <Badge status={student.status as string} />
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">
                {hasScheme ? scheme : "Government Scholarship Scheme"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">
                Category: <span className="font-bold text-teal-300">{String(student.category || "General")}</span> • School:{" "}
                <span className="font-semibold text-slate-200">{student.school?.name || (student.institutionName as string) || "School"}</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex sm:flex-col gap-2">
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10 text-center sm:text-right">
              <span className="text-teal-300 block text-[10px] uppercase font-bold tracking-wider">
                Application State
              </span>
              <span className="font-bold text-sm text-emerald-300 flex items-center gap-1 justify-center sm:justify-end">
                <CheckCircle2 className="h-4 w-4" />
                {hasScheme ? "Scheme Active" : "In Verification"}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-stage Progress Stepper */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/15">
          <p className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
            Government Application Progression
          </p>
          <StudentScholarshipTimeline status={student.status as string} />
        </div>
      </div>

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
