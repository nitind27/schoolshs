"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Eye,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  Phone,
  Hash,
  User,
  ChevronDown,
  CalendarDays,
  MapPin,
  Landmark,
  GraduationCap,
  FileCheck,
  FileX,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/badge";
import {
  ProgressRing,
  StudentAvatar,
} from "@/components/admissions/admission-ui-parts";
import {
  classLabel,
  formatAdmissionDate,
  type AdmissionCompleteness,
} from "@/lib/admissions";
import { cn } from "@/lib/utils";

export type AdmissionCardStudent = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  aadhaarName?: string | null;
  dateOfBirth?: string | null;
  fatherName: string;
  motherName?: string | null;
  guardianName?: string | null;
  parentOccupation?: string | null;
  annualFamilyIncome?: number | null;
  standard: string | null;
  section: string | null;
  rollNumber: string | null;
  grNumber: string | null;
  category: string;
  caste?: string | null;
  religion?: string | null;
  mobileNumber: string;
  email?: string | null;
  gender?: string | null;
  aadhaarNumber?: string | null;
  apaarId?: string | null;
  currentAddress?: string | null;
  currentCity?: string | null;
  currentDistrict?: string | null;
  currentPincode?: string | null;
  permanentAddress?: string | null;
  permanentCity?: string | null;
  permanentDistrict?: string | null;
  permanentPincode?: string | null;
  scholarshipScheme?: string | null;
  financialYear?: string | null;
  courseName?: string | null;
  institutionName?: string | null;
  admissionType?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName?: string | null;
  documents?: Record<string, boolean>;
  admissionStatus: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  startDate: string | null;
  completeness: AdmissionCompleteness;
};

function DetailItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="adm-detail-item">
      <span className="adm-detail-label">
        {icon}
        {label}
      </span>
      <span className="adm-detail-value">{value || "—"}</span>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="adm-detail-section">
      <h4>
        {icon}
        {title}
      </h4>
      <div className="adm-detail-grid">{children}</div>
    </section>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: (k: string) => string;
}) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200",
    verified: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    rejected: "bg-red-100 text-red-800 ring-red-200",
  };
  const label = t(`admissionStatus.${status}`);
  return (
    <span
      className={cn(
        "inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ring-1",
        styles[status] || styles.pending,
      )}
    >
      {label === `admissionStatus.${status}` ? status : label}
    </span>
  );
}

export function AdmissionStudentCard({
  student: s,
  statusTab,
  selected,
  onToggleSelect,
  onAction,
  t,
}: {
  student: AdmissionCardStudent;
  statusTab: string;
  selected: boolean;
  onToggleSelect?: () => void;
  onAction: (action: "verified" | "rejected" | "pending") => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const fullName = [s.firstName, s.middleName, s.surname]
    .filter(Boolean)
    .join(" ");
  const levelStyle = {
    complete: "text-emerald-700",
    partial: "text-amber-700",
    incomplete: "text-red-700",
  }[s.completeness.level];

  return (
    <div className={cn("adm-student-card", selected && "selected")}>
      <div className="flex items-start gap-3">
        {statusTab === "pending" && onToggleSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className="mt-1 text-slate-300 hover:text-blue-600 transition-colors"
          >
            {selected ? (
              <CheckSquare className="h-5 w-5 text-blue-600" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </button>
        )}

        <StudentAvatar name={fullName} standard={s.standard} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">
                {fullName}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" />
                {s.fatherName}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="rounded-lg bg-blue-600 text-white px-2 py-0.5 text-xs font-bold shadow-sm">
                {classLabel(s.standard, s.section)}
              </span>
              <StatusBadge status={s.admissionStatus} t={t} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-slate-400" />
              GR:{" "}
              <strong
                className={s.grNumber ? "text-slate-800" : "text-red-500"}
              >
                {s.grNumber || "—"}
              </strong>
            </span>
            {s.rollNumber && (
              <span>
                Roll: <strong>{s.rollNumber}</strong>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" />
              {s.mobileNumber}
            </span>
            <CategoryBadge category={s.category} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <ProgressRing
                percent={s.completeness.percent}
                level={s.completeness.level}
              />
              <div>
                <p className={cn("text-xs font-bold", levelStyle)}>
                  {t(`admissions.dataLevel.${s.completeness.level}`)}
                </p>
                {s.completeness.missing.length > 0 ? (
                  <p className="text-[10px] text-slate-500">
                    {t("admissions.missingCount", {
                      count: s.completeness.missing.length,
                    })}
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {t("admissions.readyToVerify")}
                  </p>
                )}
              </div>
              {s.completeness.level !== "complete" &&
                statusTab === "pending" && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("admissions.incompleteWarning")}
                  </span>
                )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 mr-1 hidden md:inline">
                {formatAdmissionDate(s.startDate || s.createdAt)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-lg px-2 text-xs"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded
                  ? t("admissions.hideDetails")
                  : t("admissions.reviewDetails")}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </Button>
              <Link href={`/students/${s.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  title={t("admissions.viewProfile")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              {statusTab === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="h-8 gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs px-2.5"
                    onClick={() => onAction("verified")}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {t("admissions.verify")}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg border-red-200 hover:bg-red-50"
                    onClick={() => onAction("rejected")}
                    title={t("admissions.reject")}
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </>
              )}
              {(statusTab === "rejected" || statusTab === "verified") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 rounded-lg text-xs px-2.5"
                  onClick={() => onAction("pending")}
                  title={t("admissions.reopen")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("admissions.reopen")}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {expanded && (
            <div className="adm-review-panel">
              {s.completeness.missing.length > 0 && (
                <div className="adm-missing-panel">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <strong>{t("admissions.missingFields")}</strong>
                    <div className="adm-missing-list">
                      {s.completeness.missing.map((key) => (
                        <span key={key}>{t(`admissions.missing.${key}`)}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="adm-detail-sections">
                <DetailSection
                  title={t("admissions.personalDetails")}
                  icon={<User className="h-4 w-4" />}
                >
                  <DetailItem label={t("admissions.name")} value={fullName} />
                  <DetailItem
                    label={t("admissions.aadhaarName")}
                    value={s.aadhaarName}
                  />
                  <DetailItem
                    label={t("admissions.dob")}
                    value={formatAdmissionDate(s.dateOfBirth)}
                    icon={<CalendarDays className="h-3 w-3" />}
                  />
                  <DetailItem label={t("admissions.gender")} value={s.gender} />
                  <DetailItem
                    label={t("admissions.aadhaar")}
                    value={s.aadhaarNumber}
                  />
                  <DetailItem
                    label={t("admissions.apaarId")}
                    value={s.apaarId}
                  />
                  <DetailItem
                    label={t("admissions.mobile")}
                    value={s.mobileNumber}
                    icon={<Phone className="h-3 w-3" />}
                  />
                  <DetailItem
                    label={t("admissions.email")}
                    value={s.email}
                    icon={<Mail className="h-3 w-3" />}
                  />
                </DetailSection>

                <DetailSection
                  title={t("admissions.familyDetails")}
                  icon={<Users className="h-4 w-4" />}
                >
                  <DetailItem
                    label={t("admissions.fatherName")}
                    value={s.fatherName}
                  />
                  <DetailItem
                    label={t("admissions.motherName")}
                    value={s.motherName}
                  />
                  <DetailItem
                    label={t("admissions.guardianName")}
                    value={s.guardianName}
                  />
                  <DetailItem
                    label={t("admissions.parentOccupation")}
                    value={s.parentOccupation}
                  />
                  <DetailItem
                    label={t("admissions.familyIncome")}
                    value={
                      s.annualFamilyIncome != null
                        ? `₹${Number(s.annualFamilyIncome).toLocaleString("en-IN")}`
                        : null
                    }
                  />
                  <DetailItem
                    label={t("admissions.religionCategory")}
                    value={[s.religion, s.category, s.caste]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </DetailSection>

                <DetailSection
                  title={t("admissions.academicDetails")}
                  icon={<GraduationCap className="h-4 w-4" />}
                >
                  <DetailItem
                    label={t("admissions.class")}
                    value={classLabel(s.standard, s.section)}
                  />
                  <DetailItem label={t("admissions.grNo")} value={s.grNumber} />
                  <DetailItem
                    label={t("admissions.rollNo")}
                    value={s.rollNumber}
                  />
                  <DetailItem
                    label={t("admissions.admissionType")}
                    value={s.admissionType}
                  />
                  <DetailItem
                    label={t("admissions.date")}
                    value={formatAdmissionDate(s.startDate || s.createdAt)}
                  />
                  <DetailItem
                    label={t("admissions.course")}
                    value={s.courseName}
                  />
                  <DetailItem
                    label={t("admissions.institution")}
                    value={s.institutionName}
                  />
                  <DetailItem
                    label={t("admissions.financialYear")}
                    value={s.financialYear}
                  />
                  <DetailItem
                    label={t("admissions.scheme")}
                    value={s.scholarshipScheme}
                  />
                </DetailSection>

                <DetailSection
                  title={t("admissions.addressDetails")}
                  icon={<MapPin className="h-4 w-4" />}
                >
                  <DetailItem
                    label={t("admissions.currentAddress")}
                    value={[
                      s.currentAddress,
                      s.currentCity,
                      s.currentDistrict,
                      s.currentPincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <DetailItem
                    label={t("admissions.permanentAddress")}
                    value={[
                      s.permanentAddress,
                      s.permanentCity,
                      s.permanentDistrict,
                      s.permanentPincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                </DetailSection>

                <DetailSection
                  title={t("admissions.bankDetails")}
                  icon={<Landmark className="h-4 w-4" />}
                >
                  <DetailItem
                    label={t("admissions.accountHolder")}
                    value={s.accountHolderName}
                  />
                  <DetailItem label={t("admissions.bank")} value={s.bankName} />
                  <DetailItem
                    label={t("admissions.branch")}
                    value={s.branchName}
                  />
                  <DetailItem
                    label={t("admissions.accountNumber")}
                    value={s.accountNumber}
                  />
                  <DetailItem label={t("admissions.ifsc")} value={s.ifscCode} />
                </DetailSection>

                <DetailSection
                  title={t("admissions.documents")}
                  icon={<FileCheck className="h-4 w-4" />}
                >
                  {Object.entries(s.documents || {}).map(([key, available]) => (
                    <DetailItem
                      key={key}
                      label={t(`admissions.document.${key}`)}
                      value={
                        <span
                          className={cn(
                            "adm-doc-state",
                            available ? "available" : "missing",
                          )}
                        >
                          {available ? (
                            <FileCheck className="h-3.5 w-3.5" />
                          ) : (
                            <FileX className="h-3.5 w-3.5" />
                          )}
                          {available
                            ? t("admissions.documentAvailable")
                            : t("admissions.documentMissing")}
                        </span>
                      }
                    />
                  ))}
                </DetailSection>
              </div>
            </div>
          )}

          {(s.verifiedAt || s.notes) && statusTab !== "pending" && (
            <div className="adm-audit-line">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>
                {s.verifiedAt
                  ? formatAdmissionDate(s.verifiedAt)
                  : t(`admissionStatus.${s.admissionStatus}`)}
                {s.verifiedBy && ` · ${s.verifiedBy}`}
                {s.notes && ` · ${s.notes}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
