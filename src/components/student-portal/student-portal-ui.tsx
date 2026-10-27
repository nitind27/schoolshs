"use client";

import { Spinner } from "@/components/ui/loader";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import {
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
  X,
  Printer,
  User,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";

export type StudentPortalData = Record<string, unknown> & {
  id?: string;
  firstName?: string;
  surname?: string;
  middleName?: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  standard?: string;
  section?: string;
  rollNumber?: string | null;
  grNumber?: string | null;
  status?: string;
  category?: string;
  caste?: string | null;
  religion?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  aadhaarNumber?: string | null;
  aadhaarName?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  fatherNameGu?: string | null;
  motherNameGu?: string | null;
  fatherAadhaarNumber?: string | null;
  motherAadhaarNumber?: string | null;
  parentOccupation?: string | null;
  annualFamilyIncome?: number | null;
  currentAddress?: string | null;
  currentCity?: string | null;
  currentDistrict?: string | null;
  scholarshipScheme?: string | null;
  admissionStatus?: string | null;
  courseName?: string | null;
  financialYear?: string | null;
  institutionName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  apaarId?: string | null;
  childUid?: string | null;
  board10th?: string | null;
  percentage10th?: number | null;
  year10th?: string | null;
  board12th?: string | null;
  percentage12th?: number | null;
  year12th?: string | null;
  photoPath?: string | null;
  idPhotoProcessedPath?: string | null;
  school?: {
    id?: string;
    name?: string;
    code?: string;
    district?: string | null;
    taluka?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    udiseCode?: string | null;
  } | null;
  schoolClass?: {
    name?: string;
    standard?: string;
    section?: string;
  } | null;
  reportCards?: unknown[];
  examResults?: unknown[];
  examSeatAssignments?: unknown[];
};

type StudentCtx = {
  student: StudentPortalData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const StudentDataContext = createContext<StudentCtx | null>(null);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentData = () => {
    fetch("/api/student-portal")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Failed to load");
        setStudent(data.student);
      })
      .catch((e: unknown) => {
        setStudent(null);
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchStudentData();
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  return (
    <StudentDataContext.Provider value={{ student, loading, error, reload: load }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used within StudentPortalProvider");
  return ctx;
}

export function StudentLoading({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200/80 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
      <div className="relative">
        <div className="h-12 w-12 rounded-2xl bg-teal-500/10 p-2.5 text-teal-600">
          <Spinner size="lg" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-600">{label || "Loading..."}</p>
    </div>
  );
}

export function StudentError({ message }: { message: string }) {
  const { reload } = useStudentData();
  const t = useT();
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm backdrop-blur-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-rose-900">Unable to load portal data</h3>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      <button
        type="button"
        onClick={reload}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-95"
      >
        {t("common.loading") || "Try Again"}
      </button>
    </div>
  );
}

export function StudentPageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="student-portal-header mb-6">
      {backHref && (
        <div className="mb-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
          >
            ← {backLabel || "Back to Dashboard"}
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="sp-header-icon">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-2.5">{action}</div>}
      </div>
    </div>
  );
}

export function StudentMetricCard({
  label,
  value,
  sub,
  accent = "teal",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "teal" | "indigo" | "amber" | "emerald" | "rose" | "sky";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const accentClasses: Record<string, { iconBg: string; text: string; border: string }> = {
    teal: { iconBg: "bg-teal-50 text-teal-600 border-teal-100", text: "text-teal-700", border: "hover:border-teal-300" },
    indigo: { iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100", text: "text-indigo-700", border: "hover:border-indigo-300" },
    amber: { iconBg: "bg-amber-50 text-amber-600 border-amber-100", text: "text-amber-700", border: "hover:border-amber-300" },
    emerald: { iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100", text: "text-emerald-700", border: "hover:border-emerald-300" },
    rose: { iconBg: "bg-rose-50 text-rose-600 border-rose-100", text: "text-rose-700", border: "hover:border-rose-300" },
    sky: { iconBg: "bg-sky-50 text-sky-600 border-sky-100", text: "text-sky-700", border: "hover:border-sky-300" },
  };

  const currentAccent = accentClasses[accent] || accentClasses.teal;

  return (
    <div className={cn("student-metric-card group", currentAccent.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="sp-metric-label">{label}</p>
          <p className="sp-metric-value truncate">{value}</p>
          {sub && <p className="sp-metric-sub truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("sp-metric-icon shrink-0 border", currentAccent.iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StudentQuickLink({
  href,
  icon: Icon,
  label,
  desc,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  badge?: string | number;
}) {
  return (
    <Link href={href} className="student-quick-link group">
      <div className="sp-ql-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
            {label}
          </h3>
          {badge !== undefined && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-teal-600" />
    </Link>
  );
}

export function StudentSection({
  title,
  description,
  children,
  action,
  icon: Icon,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <section className={cn("student-section", className)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h2 className="student-section-title">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{description}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function StudentCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title="Copy to clipboard"
      className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function StudentField({
  label,
  value,
  fullWidth,
  copyable,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  copyable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const stringVal = typeof value === "string" ? value : "";
  return (
    <div className={cn("student-field group flex flex-col justify-between", fullWidth && "sm:col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="student-field-label flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
          {label}
        </p>
        {copyable && stringVal && stringVal !== "—" && <StudentCopyButton value={stringVal} />}
      </div>
      <div className="student-field-value mt-1.5 flex items-center justify-between">
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

export function StudentEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="student-empty">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-base font-bold text-slate-800">{title}</p>
      {description && <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StudentStatusPill({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "muted" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "student-status-pill",
        variant === "muted" && "student-status-pill--muted",
        variant === "success" && "student-status-pill--success",
        variant === "warning" && "student-status-pill--warning",
        variant === "info" && "border-sky-200 bg-sky-50 text-sky-700",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

/* ==========================================================================
   Multi-Step Scholarship Application Lifecycle Tracker
   ========================================================================== */
export function StudentScholarshipTimeline({ status }: { status: string }) {
  const steps = [
    { key: "applied", label: "Registration", desc: "Submitted online" },
    { key: "verified", label: "School Verification", desc: "Verified by Clerk/Principal" },
    { key: "approved", label: "Govt / District Sanction", desc: "Approved by Welfare Dept" },
    { key: "disbursed", label: "DBT Transfer", desc: "Aadhaar linked bank payout" },
  ];

  const getStepState = (idx: number) => {
    const s = (status || "").toLowerCase();
    if (s === "approved" || s === "verified") {
      return idx <= 2 ? "completed" : "pending";
    }
    if (s === "submitted" || s === "ready") {
      return idx <= 1 ? "completed" : "pending";
    }
    return idx === 0 ? "completed" : "pending";
  };

  return (
    <div className="relative py-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {steps.map((st, i) => {
          const state = getStepState(i);
          const isDone = state === "completed";
          return (
            <div key={st.key} className="relative flex flex-col items-center text-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl border-2 transition-all duration-300",
                  isDone
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "border-slate-200 bg-white text-slate-400"
                )}
              >
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <p
                className={cn(
                  "mt-2 text-xs font-bold",
                  isDone ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {st.label}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 max-w-[130px]">{st.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   Digital Student ID Card Modal Preview
   ========================================================================== */
export function StudentDigitalIdModal({
  student,
  isOpen,
  onClose,
}: {
  student: StudentPortalData;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const schoolName = student.school?.name || student.institutionName || "School of Higher Studies";
  const studentNameEn = [student.firstName, student.middleName || student.fatherName, student.surname]
    .filter(Boolean)
    .join(" ");
  const studentNameGu = [student.firstNameGu, student.middleNameGu || student.fatherNameGu, student.surnameGu]
    .filter(Boolean)
    .join(" ");

  const initials = (student.firstName?.[0] || "S") + (student.surname?.[0] || "T");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Close */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ID Card Outer */}
        <div id="student-printable-id-card" className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* School Header */}
          <div className="relative z-10 flex items-center gap-3 pb-4 border-b border-white/15">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-slate-950 font-black">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black tracking-wide uppercase text-teal-400 truncate">
                {schoolName}
              </h4>
              <p className="text-[11px] text-slate-300">
                UDISE: {student.school?.udiseCode || student.school?.code || "SHS-GUJ"} • Official Student ID
              </p>
            </div>
          </div>

          {/* Card Body */}
          <div className="relative z-10 my-5 flex items-start gap-4">
            {/* Avatar / Photo */}
            <div className="relative flex h-24 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-teal-400/80 bg-teal-950/50 shadow-inner overflow-hidden">
              {student.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoPath as string}
                  alt={studentNameEn}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <User className="mx-auto h-8 w-8 text-teal-400 opacity-80" />
                  <span className="mt-1 block text-xs font-bold tracking-wider text-teal-300">
                    {initials}
                  </span>
                </div>
              )}
            </div>

            {/* Student Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-lg font-black leading-tight text-white">{studentNameEn}</h3>
              {studentNameGu && studentNameGu !== studentNameEn && (
                <p className="text-xs font-semibold text-teal-300">{studentNameGu}</p>
              )}
              <div className="pt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Class</span>
                  <span className="font-bold text-white">
                    {student.standard || "—"} - {student.section || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Roll No</span>
                  <span className="font-bold text-teal-300 font-mono">{student.rollNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">GR No</span>
                  <span className="font-bold text-white font-mono">{student.grNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Blood Group</span>
                  <span className="font-bold text-rose-300">{student.bloodGroup || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode & Footer */}
          <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-300">
            <div>
              <p className="font-mono tracking-widest text-teal-400">||| | |||| || ||| |||| |</p>
              <p className="text-[10px] text-slate-400 mt-0.5">UID: {student.childUid || student.id?.slice(0, 10)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-white">{student.mobileNumber || "Contact: School Office"}</p>
              <p className="text-[10px] text-teal-300">Valid Academic Session</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Verified Student Credential
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print ID
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
