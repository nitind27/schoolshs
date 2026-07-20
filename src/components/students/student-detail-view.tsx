"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  User,
  Users,
  GraduationCap,
  Landmark,
  MapPin,
  FolderOpen,
  Edit,
  Play,
  CreditCard,
  Phone,
  Hash,
  Calendar,
  AlertCircle,
  LayoutGrid,
  BookOpen,
} from "lucide-react";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSection, MetricCard } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { StudentDocumentsSection } from "@/components/documents/student-documents-section";
import { StudentGrTab } from "@/components/students/student-gr-tab";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import type { Student } from "@/generated/prisma/client";

type TabId = "overview" | "personal" | "family" | "academic" | "bank" | "address" | "documents" | "gr";

function formatValue(
  value: string | number | boolean | null | undefined,
  yes: string,
  no: string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? yes : no;
  return String(value);
}

function InfoField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  mono?: boolean;
  className?: string;
}) {
  const t = useT();
  const display = formatValue(value, t("common.yes"), t("common.no"));

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-white",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-sm font-medium text-slate-900 break-words", mono && "font-mono text-[13px]")}>
        {display}
      </p>
    </div>
  );
}

function StudentAvatar({ student }: { student: Student }) {
  const path = student.idPhotoProcessedPath || student.photoPath;
  const photoUrl = path ? `/api/uploads/${path}` : null;
  const initials = [student.firstName?.[0], student.surname?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white/90 bg-white shadow-lg sm:h-28 sm:w-28">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
          {initials}
        </div>
      )}
    </div>
  );
}

export function StudentDetailView({ student, id }: { student: Student; id: string }) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("overview");

  const englishName = [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");
  const gujaratiName = studentFullNameGu(student);
  const classLabel =
    student.standard && student.section
      ? t("students.classLabel", { standard: student.standard, section: student.section })
      : student.standard || student.section || "—";

  const validationIssues = useMemo(() => {
    if (!student.validationErrors) return [];
    try {
      const parsed = JSON.parse(student.validationErrors) as { message?: string }[];
      return Array.isArray(parsed) ? parsed.map((e) => e.message).filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [student.validationErrors]);

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "overview", label: t("students.detailOverview"), icon: LayoutGrid },
    { id: "personal", label: t("students.personalDetails"), icon: User },
    { id: "family", label: t("students.familyDetails"), icon: Users },
    { id: "academic", label: t("students.academicDetails"), icon: GraduationCap },
    { id: "bank", label: t("students.bankDetails"), icon: Landmark },
    { id: "address", label: t("common.address"), icon: MapPin },
    { id: "documents", label: t("students.documents"), icon: FolderOpen },
    { id: "gr", label: t("students.grTab"), icon: BookOpen },
  ];

  const lastUpdated = student.updatedAt
    ? new Date(student.updatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <PageShell
      title={t("students.studentDetails")}
      subtitle={gujaratiName || englishName}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.students"), href: "/students" },
        { label: englishName },
      ]}
      icon={<User className="h-5 w-5" />}
      actions={
        <>
          <Link href={`/id-cards?classId=${student.classId || ""}`}>
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4" />
              {t("students.idCard")}
            </Button>
          </Link>
          <Link href={`/students/${id}/auto-submit`}>
            <Button variant="success" size="sm">
              <Play className="h-4 w-4" />
              {t("students.directAutoFill")}
            </Button>
          </Link>
          <Link href={`/students/${id}/edit`}>
            <Button size="sm">
              <Edit className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </Link>
        </>
      }
    >
      {/* Profile hero */}
      <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg">
        <div className="relative p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <StudentAvatar student={student} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{englishName}</h2>
              {gujaratiName && gujaratiName !== englishName && (
                <p className="mt-0.5 text-base text-blue-100 font-gujarati">{gujaratiName}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge status={student.status} />
                <CategoryBadge category={student.category} />
                {student.scholarshipScheme && (
                  <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    {student.scholarshipScheme}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-100">
                {student.grNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 opacity-80" />
                    GR {student.grNumber}
                  </span>
                )}
                {student.rollNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 opacity-80" />
                    Roll {student.rollNumber}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 opacity-80" />
                  {classLabel}
                </span>
                {student.mobileNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 opacity-80" />
                    {student.mobileNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label={t("fields.grNumber")}
          value={student.grNumber || "—"}
          accent="blue"
          icon={<Hash className="h-5 w-5" />}
        />
        <MetricCard
          label={t("fields.rollNumber")}
          value={student.rollNumber || "—"}
          accent="indigo"
          icon={<Hash className="h-5 w-5" />}
        />
        <MetricCard
          label={t("fields.currentYear")}
          value={student.currentYear || "—"}
          sub={classLabel !== "—" ? classLabel : undefined}
          accent="violet"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <MetricCard
          label={t("fields.financialYear")}
          value={student.financialYear || "—"}
          sub={student.scholarshipScheme || undefined}
          accent="emerald"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {validationIssues.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">{t("students.profileIncomplete")}</p>
            <p className="mt-1 text-xs text-amber-800">
              {t("students.validationIssueCount", { count: validationIssues.length })}
            </p>
            <Link href={`/students/${id}/edit`} className="mt-2 inline-block text-xs font-semibold text-amber-700 hover:underline">
              {t("students.completeProfile")} →
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1 scrollbar-thin">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap",
              tab === tabId
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <DashboardSection
            icon={<LayoutGrid className="h-5 w-5" />}
            title={t("students.keyDetails")}
            description={lastUpdated ? t("students.lastUpdated", { date: lastUpdated }) : undefined}
            iconClassName="bg-blue-600 shadow-blue-600/20"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label={t("fields.aadhaarName")} value={student.aadhaarName} />
              <InfoField label={t("fields.aadhaarNumber")} value={student.aadhaarNumber} mono />
              <InfoField label={t("fields.dateOfBirth")} value={student.dateOfBirth} />
              <InfoField label={t("fields.gender")} value={student.gender} />
              <InfoField label={t("fields.mobileNumber")} value={student.mobileNumber} />
              <InfoField label={t("fields.email")} value={student.email} />
              <InfoField label={t("fields.fatherName")} value={student.fatherName} />
              <InfoField label={t("fields.motherName")} value={student.motherName} />
              <InfoField label={t("common.scholarship")} value={student.scholarshipScheme} />
              <InfoField label={t("fields.institutionName")} value={student.institutionName} className="sm:col-span-2 lg:col-span-3" />
              <InfoField label={t("fields.bankName")} value={student.bankName} />
              <InfoField label={t("fields.accountNumber")} value={student.accountNumber} mono />
              <InfoField label={t("common.address")} value={student.currentAddress} className="sm:col-span-2 lg:col-span-3" />
            </div>
          </DashboardSection>
        </div>
      )}

      {tab === "personal" && (
        <DashboardSection
          icon={<User className="h-5 w-5" />}
          title={t("students.personalDetails")}
          iconClassName="bg-sky-600 shadow-sky-600/20"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label={t("students.englishName")} value={englishName} />
            <InfoField label={t("students.gujaratiName")} value={gujaratiName} />
            <InfoField label={t("fields.aadhaarName")} value={student.aadhaarName} />
            <InfoField label={t("fields.aadhaarNumber")} value={student.aadhaarNumber} mono />
            <InfoField label={t("fields.dateOfBirth")} value={student.dateOfBirth} />
            <InfoField label={t("fields.gender")} value={student.gender} />
            <InfoField label={t("fields.mobileNumber")} value={student.mobileNumber} />
            <InfoField label={t("fields.email")} value={student.email} />
            <InfoField label={t("fields.religion")} value={student.religion} />
            <InfoField label={t("fields.maritalStatus")} value={student.maritalStatus} />
            <InfoField label={t("fields.bloodGroup")} value={student.bloodGroup} />
            <InfoField label={t("fields.rationCardNumber")} value={student.rationCardNumber} mono />
          </div>
        </DashboardSection>
      )}

      {tab === "family" && (
        <DashboardSection
          icon={<Users className="h-5 w-5" />}
          title={t("students.familyDetails")}
          iconClassName="bg-violet-600 shadow-violet-600/20"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label={t("fields.fatherName")} value={student.fatherName} />
            <InfoField label={t("fields.motherName")} value={student.motherName} />
            <InfoField label={t("fields.guardianName")} value={student.guardianName} />
            <InfoField label={t("students.occupation")} value={student.parentOccupation} />
            <InfoField
              label={t("students.familyIncome")}
              value={student.annualFamilyIncome ? `₹${student.annualFamilyIncome.toLocaleString("en-IN")}` : null}
            />
            <InfoField label={t("fields.familySize")} value={student.familySize} />
            <InfoField label={t("fields.isOrphan")} value={student.isOrphan} />
            <InfoField label={t("fields.caste")} value={student.caste} />
            <InfoField label={t("fields.category")} value={student.category} />
          </div>
        </DashboardSection>
      )}

      {tab === "academic" && (
        <DashboardSection
          icon={<GraduationCap className="h-5 w-5" />}
          title={t("students.academicDetails")}
          iconClassName="bg-emerald-600 shadow-emerald-600/20"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label={t("common.scholarship")} value={student.scholarshipScheme} />
            <InfoField label={t("fields.financialYear")} value={student.financialYear} />
            <InfoField label={t("fields.courseName")} value={student.courseName} />
            <InfoField label={t("fields.courseType")} value={student.courseType} />
            <InfoField label={t("fields.institutionName")} value={student.institutionName} className="sm:col-span-2" />
            <InfoField label={t("fields.institutionDistrict")} value={student.institutionDistrict} />
            <InfoField label={t("fields.currentYear")} value={student.currentYear} />
            <InfoField label={t("fields.board10th")} value={student.board10th} />
            <InfoField label={t("students.percentage10th")} value={student.percentage10th ? `${student.percentage10th}%` : null} />
            <InfoField label={t("fields.board12th")} value={student.board12th} />
            <InfoField label={t("students.percentage12th")} value={student.percentage12th ? `${student.percentage12th}%` : null} />
            <InfoField label={t("fields.grNumber")} value={student.grNumber} mono />
            <InfoField label={t("fields.rollNumber")} value={student.rollNumber} />
          </div>
        </DashboardSection>
      )}

      {tab === "bank" && (
        <DashboardSection
          icon={<Landmark className="h-5 w-5" />}
          title={t("students.bankDetails")}
          iconClassName="bg-amber-500 shadow-amber-500/20"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label={t("fields.bankName")} value={student.bankName} />
            <InfoField label={t("fields.branchName")} value={student.branchName} />
            <InfoField label={t("fields.accountNumber")} value={student.accountNumber} mono />
            <InfoField label={t("fields.ifscCode")} value={student.ifscCode} mono />
            <InfoField label={t("fields.accountHolderName")} value={student.accountHolderName} className="sm:col-span-2" />
          </div>
        </DashboardSection>
      )}

      {tab === "address" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <DashboardSection
            icon={<MapPin className="h-5 w-5" />}
            title={t("students.currentAddressTitle")}
            iconClassName="bg-blue-600 shadow-blue-600/20"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label={t("common.address")} value={student.currentAddress} className="sm:col-span-2" />
              <InfoField label={t("fields.currentCity")} value={student.currentCity} />
              <InfoField label={t("common.district")} value={student.currentDistrict} />
              <InfoField label={t("fields.currentPincode")} value={student.currentPincode} mono />
            </div>
          </DashboardSection>
          <DashboardSection
            icon={<MapPin className="h-5 w-5" />}
            title={t("students.permanentAddressTitle")}
            iconClassName="bg-indigo-600 shadow-indigo-600/20"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label={t("common.address")} value={student.permanentAddress} className="sm:col-span-2" />
              <InfoField label={t("fields.permanentCity")} value={student.permanentCity} />
              <InfoField label={t("common.district")} value={student.permanentDistrict} />
              <InfoField label={t("fields.permanentPincode")} value={student.permanentPincode} mono />
            </div>
          </DashboardSection>
        </div>
      )}

      {tab === "documents" && (
        <DashboardSection
          icon={<FolderOpen className="h-5 w-5" />}
          title={t("studentForm.documentsTitle")}
          description={t("studentForm.documentsDesc")}
          iconClassName="bg-rose-600 shadow-rose-600/20"
          action={
            <Link href={`/students/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
                {t("common.edit")}
              </Button>
            </Link>
          }
        >
          <StudentDocumentsSection studentId={id} />
        </DashboardSection>
      )}

      {tab === "gr" && <StudentGrTab studentId={id} student={student} />}
    </PageShell>
  );
}
