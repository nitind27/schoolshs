"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit,
  ExternalLink,
  FileBadge,
  FileText,
  FolderOpen,
  GraduationCap,
  Hash,
  IdCard,
  Landmark,
  MapPin,
  Percent,
  Phone,
  Printer,
  ScrollText,
  User,
  Users,
  XCircle,
  Clock,
} from "lucide-react";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Spinner } from "@/components/ui/loader";
import { StudentDocumentsSection } from "@/components/documents/student-documents-section";
import { StudentGrTab } from "@/components/students/student-gr-tab";
import { useT, useLocale } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";
import { CERTIFICATE_TYPES } from "@/lib/certificates/config";
import { cn } from "@/lib/utils";
import type { Student } from "@/generated/prisma/client";
import "./student-analysis.css";

type AttendanceHistory = {
  month: number;
  year: number;
  present: number;
  absent: number;
  half: number;
  markedDays: number;
  notMarked: number;
  monthTotal: number;
  prevTotal: number;
  cumulative: number;
  percent: number;
  note: string;
};

type AnalysisPayload = {
  attendance: {
    month: number;
    year: number;
    present: number;
    absent: number;
    half: number;
    markedDays: number;
    notMarked: number;
    percent: number;
    cumulative: number;
    hasData: boolean;
    yearTotals: {
      present: number;
      absent: number;
      half: number;
      markedDays: number;
      percent: number;
    };
    history: AttendanceHistory[];
  };
  gr: {
    hasSavedEntry: boolean;
    hasGrNumber: boolean;
    academicYear: string;
    classLabel: string;
    classId: string;
    admissionDate: string;
    conduct: string;
    progress: string;
    leavingDate: string;
    lastSchool: string;
    feeStatus: string;
    remarks: string;
  };
  results: {
    id: string;
    examId: string | null;
    examName: string;
    examType: string;
    academicYear: string;
    percentage: number | null;
    grade: string | null;
    rank: number | null;
    result: string | null;
    totalMarks: number | null;
    attendancePresent: number | null;
    attendanceTotal: number | null;
    isPublished: boolean;
    printHref: string | null;
  }[];
  docs: { uploaded: number; total: number };
};

function formatValue(
  value: string | number | boolean | null | undefined,
  yes: string,
  no: string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? yes : no;
  return String(value);
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  mono?: boolean;
}) {
  const t = useT();
  return (
    <div className="sa-field">
      <p className="sa-field__label">{label}</p>
      <p className={cn("sa-field__value", mono && "font-mono text-[13px]")}>
        {formatValue(value, t("common.yes"), t("common.no"))}
      </p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon: typeof User;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("sa-section", className)}>
      <div className="sa-section__head">
        <div className="sa-section__title">
          <span className="sa-section__icon">
            <Icon className="h-4 w-4" />
          </span>
          <h3>{title}</h3>
        </div>
        {action}
      </div>
      <div className="sa-section__body">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "bad" | "warn" | "ink";
  icon: typeof CheckCircle2;
}) {
  return (
    <div className={cn("sa-stat", tone && `sa-stat--${tone}`)}>
      <span className="sa-stat__icon">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="sa-stat__label">{label}</p>
        <p className="sa-stat__value">{value}</p>
      </div>
    </div>
  );
}

const CERT_ICONS: Record<string, typeof FileBadge> = {
  bonafide: Award,
  lc: ScrollText,
  character: FileBadge,
  "monthly-attendance": CalendarDays,
  "daily-attendance-book": ClipboardList,
  "class-register": BookOpen,
  "general-register": BookOpen,
  "monthly-reports": FileText,
};

export function StudentAnalysisView({ student, id }: { student: Student; id: string }) {
  const t = useT();
  const { locale } = useLocale();
  const [data, setData] = useState<AnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");

  const englishName = [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");
  const gujaratiName = studentFullNameGu(student);
  const classLabel =
    student.standard && student.section
      ? t("students.classLabel", { standard: student.standard, section: student.section })
      : student.standard || student.section || "—";

  const photoPath = student.idPhotoProcessedPath || student.photoPath;
  const photoUrl = photoPath ? `/api/uploads/${photoPath}` : null;
  const initials =
    [student.firstName?.[0], student.surname?.[0]].filter(Boolean).join("").toUpperCase() || "?";

  const now = useMemo(() => new Date(), []);
  const monthLabel = (m: number, y: number) => {
    try {
      return new Date(y, m - 1, 1).toLocaleDateString(locale === "gu" ? "gu-IN" : "en-IN", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return `${m}/${y}`;
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/students/${id}/analysis`, { cache: "no-store" })
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok) throw new Error(payload.error || "Failed");
        if (alive) setData(payload);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSchoolName(String(d?.user?.schoolName || "").trim()))
      .catch(() => setSchoolName(""));
  }, []);

  const handlePrint = () => {
    document.body.classList.add("sa-printing");
    const restore = () => {
      document.body.classList.remove("sa-printing");
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 1500);
  };

  const printedOn = useMemo(() => {
    try {
      return now.toLocaleDateString(locale === "gu" ? "gu-IN" : "en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return now.toISOString().slice(0, 10);
    }
  }, [locale, now]);

  const classId = data?.gr.classId || student.classId || "";
  const month = data?.attendance.month || now.getMonth() + 1;
  const year = data?.attendance.year || now.getFullYear();

  const STUDENT_ONLY_CERTS = new Set(["bonafide", "lc", "character"]);

  const certLinks = CERTIFICATE_TYPES.map((c) => {
    const Icon = CERT_ICONS[c.id] || FileBadge;
    const qs = new URLSearchParams();
    qs.set("studentId", id);
    if (!STUDENT_ONLY_CERTS.has(c.id) && classId) {
      qs.set("classId", classId);
      if (student.standard) qs.set("standard", student.standard);
      if (student.section) qs.set("section", student.section);
    }
    if (student.grNumber) qs.set("grNumber", student.grNumber);
    qs.set("month", String(month));
    qs.set("year", String(year));
    if (c.id === "general-register" && classId) {
      qs.set("classId", classId);
    }
    return {
      id: c.id,
      href: `/certificates/${c.id}?${qs.toString()}`,
      Icon,
      labelEn: c.labelEn,
      labelGu: c.labelGu,
    };
  });

  const extraLinks = [
    {
      id: "id-card",
      href: `/id-cards?studentId=${id}`,
      Icon: IdCard,
      label: t("students.idCard"),
    },
    {
      id: "att-report",
      href: `/attendance/reports?studentId=${id}&month=${month}&year=${year}`,
      Icon: CalendarDays,
      label: t("studentAnalysis.attendanceFullReport"),
    },
    {
      id: "detail",
      href: `/students/${id}`,
      Icon: User,
      label: t("studentAnalysis.openProfile"),
    },
    {
      id: "edit",
      href: `/students/${id}/edit`,
      Icon: Edit,
      label: t("common.edit"),
    },
    ...(classId
      ? [
          {
            id: "results",
            href: `/results/student?classId=${classId}&studentId=${id}`,
            Icon: GraduationCap,
            label: t("studentAnalysis.resultsPrint"),
          },
        ]
      : []),
    {
      id: "export",
      href: `/export`,
      Icon: FileText,
      label: t("nav.exportData"),
    },
  ];

  const att = data?.attendance;
  const yearTot = att?.yearTotals;

  return (
    <PageShell
      title={t("studentAnalysis.title")}
      subtitle={t("studentAnalysis.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.students"), href: "/students" },
        { label: englishName, href: `/students/${id}` },
        { label: t("studentAnalysis.breadcrumb") },
      ]}
      icon={<FileBadge className="h-5 w-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t("studentAnalysis.printReport")}
          </Button>
          <Link href={`/students/${id}/edit`}>
            <Button size="sm">
              <Edit className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </Link>
        </>
      }
    >
      <div className="sa-page sa-print-root">
        <div className="sa-print-letter">
          <p className="sa-print-letter__school">
            {schoolName || t("studentAnalysis.printSchoolFallback")}
          </p>
          <p className="sa-print-letter__title">{t("studentAnalysis.title")}</p>
          <p className="sa-print-letter__meta">
            {t("studentAnalysis.printedOn", { date: printedOn })}
          </p>
        </div>
        <div className="sa-hero">
          <div className="sa-hero__photo">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="sa-hero__main">
            <p className="sa-hero__eyebrow">{t("studentAnalysis.reportFor")}</p>
            <h2 className="sa-hero__name">{englishName}</h2>
            {gujaratiName && gujaratiName !== englishName ? (
              <p className="sa-hero__gu font-gujarati">{gujaratiName}</p>
            ) : null}
            <div className="sa-hero__badges">
              <Badge status={student.status} />
              <CategoryBadge category={student.category} />
              {student.admissionStatus ? (
                <span className="sa-pill">
                  {t("studentAnalysis.admission")}: {student.admissionStatus}
                </span>
              ) : null}
              {student.scholarshipScheme ? (
                <span className="sa-pill">{student.scholarshipScheme}</span>
              ) : null}
              {data?.docs ? (
                <span className="sa-pill">
                  {t("studentAnalysis.docsCount", {
                    uploaded: data.docs.uploaded,
                    total: data.docs.total,
                  })}
                </span>
              ) : null}
            </div>
            <div className="sa-hero__meta">
              {student.grNumber ? (
                <span>
                  <Hash className="h-3.5 w-3.5" /> GR {student.grNumber}
                </span>
              ) : null}
              {student.rollNumber ? (
                <span>
                  <Hash className="h-3.5 w-3.5" /> Roll {student.rollNumber}
                </span>
              ) : null}
              <span>
                <GraduationCap className="h-3.5 w-3.5" /> {classLabel}
              </span>
              {student.mobileNumber ? (
                <span>
                  <Phone className="h-3.5 w-3.5" /> {student.mobileNumber}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Attendance */}
        <Section
          title={t("studentAnalysis.attendanceTitle")}
          icon={CalendarDays}
          action={
            <Link
              href={`/attendance/reports?studentId=${id}&month=${month}&year=${year}`}
              className="sa-section__link"
            >
              {t("studentAnalysis.attendanceFullReport")}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !att ? (
            <p className="sa-lead">{t("studentAnalysis.attendanceNone")}</p>
          ) : (
            <>
              <p className="sa-lead">
                {t("studentAnalysis.attendanceMonthLabel", {
                  month: monthLabel(att.month, att.year),
                })}
              </p>
              <div className="sa-stat-grid">
                <Stat
                  label={t("attendance.present")}
                  value={att.present}
                  tone="ok"
                  icon={CheckCircle2}
                />
                <Stat
                  label={t("attendance.absent")}
                  value={att.absent}
                  tone="bad"
                  icon={XCircle}
                />
                <Stat label={t("attendance.halfDay")} value={att.half} tone="warn" icon={Clock} />
                <Stat
                  label={t("studentAnalysis.markedDays")}
                  value={att.markedDays}
                  tone="ink"
                  icon={ClipboardList}
                />
                <Stat
                  label={t("studentAnalysis.attendancePercent")}
                  value={`${att.percent}%`}
                  tone="ok"
                  icon={Percent}
                />
                <Stat
                  label={t("studentAnalysis.cumulativeDays")}
                  value={att.cumulative}
                  tone="ink"
                  icon={CalendarDays}
                />
              </div>

              {yearTot ? (
                <>
                  <p className="sa-subhead sa-subhead--spaced">
                    {t("studentAnalysis.yearSummary", { year: String(att.year) })}
                  </p>
                  <div className="sa-stat-grid">
                    <Stat
                      label={t("attendance.present")}
                      value={yearTot.present}
                      tone="ok"
                      icon={CheckCircle2}
                    />
                    <Stat
                      label={t("attendance.absent")}
                      value={yearTot.absent}
                      tone="bad"
                      icon={XCircle}
                    />
                    <Stat
                      label={t("attendance.halfDay")}
                      value={yearTot.half}
                      tone="warn"
                      icon={Clock}
                    />
                    <Stat
                      label={t("studentAnalysis.markedDays")}
                      value={yearTot.markedDays}
                      tone="ink"
                      icon={ClipboardList}
                    />
                    <Stat
                      label={t("studentAnalysis.attendancePercent")}
                      value={`${yearTot.percent}%`}
                      tone="ok"
                      icon={Percent}
                    />
                    <Stat
                      label={t("studentAnalysis.totalAbsentYear")}
                      value={yearTot.absent}
                      tone="bad"
                      icon={XCircle}
                    />
                  </div>
                </>
              ) : null}

              {att.history.length > 0 ? (
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>{t("studentAnalysis.colMonth")}</th>
                        <th>{t("attendance.present")}</th>
                        <th>{t("attendance.absent")}</th>
                        <th>{t("attendance.halfDay")}</th>
                        <th>{t("studentAnalysis.markedDays")}</th>
                        <th>%</th>
                        <th>{t("studentAnalysis.cumulativeDays")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {att.history.map((h) => (
                        <tr key={`${h.year}-${h.month}`}>
                          <td>{monthLabel(h.month, h.year)}</td>
                          <td className="sa-num sa-num--ok">{h.present}</td>
                          <td className="sa-num sa-num--bad">{h.absent}</td>
                          <td className="sa-num">{h.half}</td>
                          <td className="sa-num">{h.markedDays}</td>
                          <td className="sa-num">{h.percent}%</td>
                          <td className="sa-num">{h.cumulative}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="sa-lead sa-lead--mt">{t("studentAnalysis.attendanceNone")}</p>
              )}
            </>
          )}
        </Section>

        {/* Results */}
        <Section title={t("studentAnalysis.resultsTitle")} icon={GraduationCap}>
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !data?.results?.length ? (
            <p className="sa-lead">{t("studentAnalysis.resultsNone")}</p>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>{t("studentAnalysis.colExam")}</th>
                    <th>{t("fields.financialYear")}</th>
                    <th>%</th>
                    <th>{t("studentAnalysis.colGrade")}</th>
                    <th>{t("studentAnalysis.colRank")}</th>
                    <th>{t("studentAnalysis.colResult")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="font-semibold text-slate-900">{r.examName}</span>
                        {r.examType ? (
                          <span className="ml-1 text-xs text-slate-500">({r.examType})</span>
                        ) : null}
                      </td>
                      <td>{r.academicYear}</td>
                      <td className="sa-num">
                        {r.percentage != null ? `${r.percentage}%` : "—"}
                      </td>
                      <td>{r.grade || "—"}</td>
                      <td className="sa-num">{r.rank ?? "—"}</td>
                      <td>{r.result || "—"}</td>
                      <td>
                        {r.printHref ? (
                          <Link href={r.printHref} className="sa-section__link">
                            {t("common.view")}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Certificates */}
        <Section title={t("studentAnalysis.certsTitle")} icon={Award} className="sa-no-print">
          <p className="sa-lead">{t("studentAnalysis.certsDesc")}</p>
          <div className="sa-cert-grid">
            {certLinks.map((c) => (
              <Link key={c.id} href={c.href} className="sa-cert-card">
                <span className="sa-cert-card__icon">
                  <c.Icon className="h-4 w-4" />
                </span>
                <span className="sa-cert-card__text">
                  <span className="sa-cert-card__en">{c.labelEn}</span>
                  <span className="sa-cert-card__gu font-gujarati">{c.labelGu}</span>
                </span>
                <ExternalLink className="sa-cert-card__ext h-3.5 w-3.5" />
              </Link>
            ))}
            {extraLinks.map((c) => (
              <Link key={c.id} href={c.href} className="sa-cert-card sa-cert-card--muted">
                <span className="sa-cert-card__icon">
                  <c.Icon className="h-4 w-4" />
                </span>
                <span className="sa-cert-card__text">
                  <span className="sa-cert-card__en">{c.label}</span>
                </span>
                <ExternalLink className="sa-cert-card__ext h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </Section>

        {/* GR snapshot */}
        <Section title={t("students.grTab")} icon={BookOpen}>
          {loading || !data ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="sa-fields">
                <Field
                  label={t("studentAnalysis.grStatus")}
                  value={
                    data.gr.hasSavedEntry
                      ? t("students.grSavedEntry")
                      : t("students.grPreviewFromStudent")
                  }
                />
                <Field label={t("fields.financialYear")} value={data.gr.academicYear} />
                <Field label={t("studentAnalysis.admission")} value={data.gr.admissionDate} />
                <Field label={t("certificates.conduct")} value={data.gr.conduct} />
                <Field label={t("certificates.progress")} value={data.gr.progress} />
                <Field label={t("studentAnalysis.lastSchool")} value={data.gr.lastSchool} />
                <Field label={t("studentAnalysis.feeStatus")} value={data.gr.feeStatus} />
                <Field label={t("studentAnalysis.leavingDate")} value={data.gr.leavingDate} />
              </div>
              <div className="sa-gr-embed">
                <StudentGrTab studentId={id} student={student} />
              </div>
            </>
          )}
        </Section>

        <div className="sa-grid-2">
          <Section title={t("students.personalDetails")} icon={User}>
            <div className="sa-fields">
              <Field label={t("students.englishName")} value={englishName} />
              <Field label={t("students.gujaratiName")} value={gujaratiName} />
              <Field label={t("fields.aadhaarName")} value={student.aadhaarName} />
              <Field label={t("fields.aadhaarNumber")} value={student.aadhaarNumber} mono />
              <Field label={t("fields.dateOfBirth")} value={student.dateOfBirth} />
              <Field label={t("fields.gender")} value={student.gender} />
              <Field label={t("fields.mobileNumber")} value={student.mobileNumber} />
              <Field label={t("fields.email")} value={student.email} />
              <Field label={t("fields.religion")} value={student.religion} />
              <Field label={t("fields.bloodGroup")} value={student.bloodGroup} />
              <Field label={t("fields.apaarId")} value={student.apaarId} mono />
              <Field label={t("fields.panNumber")} value={student.panNumber} mono />
              <Field label={t("fields.rationCardNumber")} value={student.rationCardNumber} mono />
              <Field label={t("fields.maritalStatus")} value={student.maritalStatus} />
            </div>
          </Section>

          <Section title={t("students.familyDetails")} icon={Users}>
            <div className="sa-fields">
              <Field label={t("fields.fatherName")} value={student.fatherName} />
              <Field label={t("fields.motherName")} value={student.motherName} />
              <Field label={t("fields.guardianName")} value={student.guardianName} />
              <Field label={t("students.occupation")} value={student.parentOccupation} />
              <Field
                label={t("students.familyIncome")}
                value={student.annualFamilyIncome ? `₹${student.annualFamilyIncome.toLocaleString("en-IN")}` : null}
              />
              <Field label={t("fields.familySize")} value={student.familySize} />
              <Field label={t("fields.isOrphan")} value={student.isOrphan} />
              <Field label={t("fields.caste")} value={student.caste} />
              <Field label={t("fields.category")} value={student.category} />
            </div>
          </Section>
        </div>

        <div className="sa-grid-2">
          <Section title={t("students.academicDetails")} icon={GraduationCap}>
            <div className="sa-fields">
              <Field label={t("fields.grNumber")} value={student.grNumber} mono />
              <Field label={t("fields.rollNumber")} value={student.rollNumber} />
              <Field label={t("fields.standard")} value={student.standard} />
              <Field label={t("fields.section")} value={student.section} />
              <Field label={t("common.scholarship")} value={student.scholarshipScheme} />
              <Field label={t("fields.financialYear")} value={student.financialYear} />
              <Field label={t("fields.courseName")} value={student.courseName} />
              <Field label={t("fields.courseType")} value={student.courseType} />
              <Field label={t("fields.institutionName")} value={student.institutionName} />
              <Field label={t("fields.institutionDistrict")} value={student.institutionDistrict} />
              <Field label={t("fields.currentYear")} value={student.currentYear} />
              <Field label={t("fields.childUid")} value={student.childUid} mono />
              <Field label={t("fields.board10th")} value={student.board10th} />
              <Field
                label={t("students.percentage10th")}
                value={student.percentage10th != null ? `${student.percentage10th}%` : null}
              />
              <Field label={t("fields.board12th")} value={student.board12th} />
              <Field
                label={t("students.percentage12th")}
                value={student.percentage12th != null ? `${student.percentage12th}%` : null}
              />
              <Field label={t("common.status")} value={student.status} />
              <Field label={t("studentAnalysis.admission")} value={student.admissionStatus} />
            </div>
          </Section>

          <Section title={t("students.bankDetails")} icon={Landmark}>
            <div className="sa-fields">
              <Field label={t("fields.bankName")} value={student.bankName} />
              <Field label={t("fields.branchName")} value={student.branchName} />
              <Field label={t("fields.accountNumber")} value={student.accountNumber} mono />
              <Field label={t("fields.ifscCode")} value={student.ifscCode} mono />
              <Field label={t("fields.accountHolderName")} value={student.accountHolderName} />
            </div>
          </Section>
        </div>

        <Section title={t("common.address")} icon={MapPin}>
          <div className="sa-grid-2">
            <div>
              <p className="sa-subhead">{t("students.currentAddressTitle")}</p>
              <div className="sa-fields">
                <Field label={t("common.address")} value={student.currentAddress} />
                <Field label={t("fields.currentCity")} value={student.currentCity} />
                <Field label={t("common.district")} value={student.currentDistrict} />
                <Field label={t("fields.currentPincode")} value={student.currentPincode} mono />
              </div>
            </div>
            <div>
              <p className="sa-subhead">{t("students.permanentAddressTitle")}</p>
              <div className="sa-fields">
                <Field label={t("common.address")} value={student.permanentAddress} />
                <Field label={t("fields.permanentCity")} value={student.permanentCity} />
                <Field label={t("common.district")} value={student.permanentDistrict} />
                <Field label={t("fields.permanentPincode")} value={student.permanentPincode} mono />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title={t("students.documents")}
          icon={FolderOpen}
          className="sa-no-print"
          action={
            <Link href={`/students/${id}`} className="sa-section__link">
              {t("studentAnalysis.manageDocs")}
            </Link>
          }
        >
          <StudentDocumentsSection studentId={id} />
        </Section>
      </div>
    </PageShell>
  );
}
