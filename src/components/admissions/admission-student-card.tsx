"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/ui/badge";
import { ProgressRing, StudentAvatar } from "@/components/admissions/admission-ui-parts";
import { classLabel, formatAdmissionDate, type AdmissionCompleteness } from "@/lib/admissions";
import { cn } from "@/lib/utils";

export type AdmissionCardStudent = {
  id: string;
  firstName: string;
  surname: string;
  fatherName: string;
  standard: string | null;
  section: string | null;
  rollNumber: string | null;
  grNumber: string | null;
  category: string;
  mobileNumber: string;
  admissionStatus: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: string;
  startDate: string | null;
  completeness: AdmissionCompleteness;
};

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200",
    verified: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    rejected: "bg-red-100 text-red-800 ring-red-200",
  };
  const label = t(`admissionStatus.${status}`);
  return (
    <span className={cn("inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ring-1", styles[status] || styles.pending)}>
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
  const fullName = `${s.firstName} ${s.surname}`;
  const levelStyle = {
    complete: "text-emerald-700",
    partial: "text-amber-700",
    incomplete: "text-red-700",
  }[s.completeness.level];

  return (
    <div className={cn("adm-student-card", selected && "selected")}>
      <div className="flex items-start gap-3">
        {statusTab === "pending" && onToggleSelect && (
          <button type="button" onClick={onToggleSelect} className="mt-1 text-slate-300 hover:text-blue-600 transition-colors">
            {selected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
          </button>
        )}

        <StudentAvatar name={fullName} standard={s.standard} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">{fullName}</h3>
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
              GR: <strong className={s.grNumber ? "text-slate-800" : "text-red-500"}>{s.grNumber || "—"}</strong>
            </span>
            {s.rollNumber && (
              <span>Roll: <strong>{s.rollNumber}</strong></span>
            )}
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" />
              {s.mobileNumber}
            </span>
            <CategoryBadge category={s.category} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <ProgressRing percent={s.completeness.percent} level={s.completeness.level} />
              <div>
                <p className={cn("text-xs font-bold", levelStyle)}>
                  {t(`admissions.dataLevel.${s.completeness.level}`)}
                </p>
                {s.completeness.missing.length > 0 ? (
                  <p className="text-[10px] text-slate-500">
                    {t("admissions.missingCount", { count: s.completeness.missing.length })}
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-medium">{t("admissions.readyToVerify")}</p>
                )}
              </div>
              {s.completeness.level !== "complete" && statusTab === "pending" && (
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
              <Link href={`/students/${s.id}`}>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg" title={t("admissions.viewProfile")}>
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
                    <span className="hidden sm:inline">{t("admissions.verify")}</span>
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
                  <span className="hidden sm:inline">{t("admissions.reopen")}</span>
                </Button>
              )}
            </div>
          </div>

          {s.verifiedAt && statusTab !== "pending" && (
            <p className="text-[10px] text-slate-500 mt-2">
              {formatAdmissionDate(s.verifiedAt)}
              {s.verifiedBy && ` · ${s.verifiedBy}`}
              {s.notes && ` · ${s.notes}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
