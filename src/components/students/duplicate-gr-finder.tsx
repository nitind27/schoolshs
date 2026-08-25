"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  Pencil,
  Printer,
  Search,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import {
  studentDisplayFatherName,
  studentFullNameGu,
  studentShortNameGu,
} from "@/lib/student-names";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export type DuplicateGrStudent = {
  id: string;
  grNumber: string | null;
  firstName: string | null;
  middleName?: string | null;
  surname: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  fatherName?: string | null;
  fatherNameGu?: string | null;
  standard?: string | null;
  section?: string | null;
  status?: string | null;
  rollNumber?: string | null;
  mobileNumber?: string | null;
  schoolClass?: { name?: string | null; standard?: string | null; section?: string | null } | null;
};

export type DuplicateGrGroup = {
  grNumber: string;
  count: number;
  students: DuplicateGrStudent[];
};

function classText(s: DuplicateGrStudent) {
  if (s.schoolClass?.name) return s.schoolClass.name.replace(/^Class\s+/i, "");
  const std = String(s.standard || s.schoolClass?.standard || "").trim();
  const sec = String(s.section || s.schoolClass?.section || "").trim();
  if (std && sec) return `${std}-${sec}`;
  return std || "—";
}

function studentName(s: DuplicateGrStudent) {
  return studentFullNameGu(s) || studentShortNameGu(s) || "—";
}

export function DuplicateGrFinder({
  groups,
  loading,
}: {
  groups: DuplicateGrGroup[];
  loading?: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSchoolName(String(d?.user?.schoolName || d?.school?.name || "").trim());
        setSchoolCode(String(d?.user?.schoolCode || d?.school?.code || "").trim());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const grMatch = group.grNumber.toLowerCase().includes(q);
        const students = group.students.filter((s) => {
          const name = studentName(s).toLowerCase();
          const father = studentDisplayFatherName(s).toLowerCase();
          return name.includes(q) || father.includes(q) || classText(s).toLowerCase().includes(q);
        });
        if (grMatch) return group;
        if (!students.length) return null;
        return { ...group, students, count: students.length };
      })
      .filter((g): g is DuplicateGrGroup => Boolean(g));
  }, [groups, query]);

  const totalStudents = useMemo(
    () => filtered.reduce((n, g) => n + g.count, 0),
    [filtered],
  );

  const printedOn = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const copyGr = async (gr: string) => {
    try {
      await navigator.clipboard.writeText(gr);
      toast.success(t("students.duplicateGrCopied"));
    } catch {
      toast.error(gr);
    }
  };

  const toggleGroup = (gr: string) => {
    setCollapsed((prev) => ({ ...prev, [gr]: !prev[gr] }));
  };

  const handlePrint = () => {
    document.body.classList.add("dup-gr-printing");
    const restore = () => {
      document.body.classList.remove("dup-gr-printing");
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 2000);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-6 text-center text-sm text-amber-900">
        {t("common.loading")}
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-4 text-sm text-emerald-900">
        {t("students.duplicateGrEmpty")}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm print:hidden">
        <div className="sticky top-0 z-10 border-b border-amber-100 bg-amber-50/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">{t("students.duplicateGrTitle")}</p>
              <p className="text-[11px] text-amber-800/80">
                {t("students.duplicateGrSummary", {
                  groups: String(filtered.length),
                  students: String(totalStudents),
                })}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-amber-300 bg-white text-amber-950"
              onClick={handlePrint}
              disabled={!filtered.length}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("students.duplicateGrPrint")}
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-700/60" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("students.duplicateGrSearch")}
              className="h-8 border-amber-200 bg-white pl-8 text-sm"
            />
          </div>
        </div>

        {!filtered.length ? (
          <div className="px-3 py-8 text-center text-sm text-slate-500">
            {t("students.duplicateGrNoMatch")}
          </div>
        ) : (
          <div className="max-h-[min(70vh,720px)] overflow-y-auto">
            {filtered.map((group) => {
              const isClosed = Boolean(collapsed[group.grNumber]);
              return (
                <section key={group.grNumber} className="border-b border-slate-100 last:border-b-0">
                  <header className="sticky top-0 z-[1] flex items-center gap-1.5 border-b border-amber-100/80 bg-amber-50/90 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.grNumber)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-800 hover:bg-amber-100"
                      aria-expanded={!isClosed}
                    >
                      {isClosed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.grNumber)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="font-mono text-sm font-bold text-amber-950">
                        GR {group.grNumber}
                      </span>
                      <span className="ml-2 inline-flex rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {group.count}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] text-amber-900"
                      onClick={() => void copyGr(group.grNumber)}
                      title={t("students.duplicateGrCopied")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </Button>
                  </header>

                  {!isClosed ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-1.5 font-semibold">#</th>
                            <th className="px-2 py-1.5 font-semibold">{t("fields.firstName")}</th>
                            <th className="hidden px-2 py-1.5 font-semibold sm:table-cell">
                              {t("fields.fatherName")}
                            </th>
                            <th className="px-2 py-1.5 font-semibold">{t("fields.standard")}</th>
                            <th className="px-2 py-1.5 font-semibold">{t("fields.rollNumber")}</th>
                            <th className="px-2 py-1.5 font-semibold">{t("common.status")}</th>
                            <th className="px-2 py-1.5 text-right font-semibold">{t("common.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.students.map((s, idx) => {
                            const name = studentName(s);
                            const father = studentDisplayFatherName(s);
                            return (
                              <tr
                                key={s.id}
                                className="border-b border-slate-50 hover:bg-amber-50/40"
                              >
                                <td className="px-2 py-1.5 align-middle text-xs text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="max-w-[180px] px-2 py-1.5 align-middle">
                                  <p className="truncate text-[13px] font-medium leading-tight text-slate-900">
                                    {name}
                                  </p>
                                  {father ? (
                                    <p className="truncate text-[10px] text-slate-500 sm:hidden">
                                      {father}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="hidden max-w-[140px] truncate px-2 py-1.5 align-middle text-xs text-slate-600 sm:table-cell">
                                  {father || "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-800">
                                    {classText(s)}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 align-middle font-mono text-xs text-slate-600">
                                  {s.rollNumber || "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                                  {s.status ? (
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                                        s.status === "draft"
                                          ? "bg-violet-50 text-violet-800"
                                          : s.status === "ready"
                                            ? "bg-emerald-50 text-emerald-800"
                                            : "bg-slate-100 text-slate-600",
                                      )}
                                    >
                                      {s.status}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-2 py-1 align-middle">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Link
                                      href={`/students/${s.id}/edit`}
                                      title={t("students.duplicateGrEdit")}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-teal-700 hover:bg-teal-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Link>
                                    <Link
                                      href={`/students/${s.id}`}
                                      title={t("common.view")}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* A4 print sheet — only visible when printing */}
      <div className="dup-gr-print-root" aria-hidden>
        <style jsx global>{`
          .dup-gr-print-root {
            display: none;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 12mm 14mm 12mm;
            }

            html,
            body {
              height: auto !important;
              overflow: visible !important;
              background: #fff !important;
            }

            body.dup-gr-printing * {
              visibility: hidden !important;
            }

            body.dup-gr-printing .dup-gr-print-root,
            body.dup-gr-printing .dup-gr-print-root * {
              visibility: visible !important;
            }

            body.dup-gr-printing .dup-gr-print-root {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              background: #fff !important;
              color: #000 !important;
              z-index: 99999;
            }

            body.dup-gr-printing .no-print,
            body.dup-gr-printing .tn-shell,
            body.dup-gr-printing .shell-aside,
            body.dup-gr-printing aside,
            body.dup-gr-printing nav,
            body.dup-gr-printing [role="dialog"] {
              display: none !important;
              visibility: hidden !important;
            }

            .dup-gr-group {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 10pt;
            }

            .dup-gr-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 9pt;
            }

            .dup-gr-table thead {
              display: table-header-group;
            }

            .dup-gr-table th,
            .dup-gr-table td {
              border: 0.6pt solid #64748b;
              padding: 3pt 4pt;
              vertical-align: top;
              word-break: break-word;
            }

            .dup-gr-table th {
              background: #fef3c7 !important;
              font-weight: 700;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>

        <header style={{ borderBottom: "1.5pt solid #000", paddingBottom: "8pt", marginBottom: "10pt" }}>
          <p style={{ margin: 0, fontSize: "14pt", fontWeight: 700, textAlign: "center" }}>
            {schoolName || t("nav.students")}
          </p>
          {schoolCode ? (
            <p style={{ margin: "2pt 0 0", fontSize: "9pt", textAlign: "center" }}>
              {t("students.duplicateGrPrintSchoolCode", { code: schoolCode })}
            </p>
          ) : null}
          <p style={{ margin: "6pt 0 0", fontSize: "12pt", fontWeight: 700, textAlign: "center" }}>
            {t("students.duplicateGrPrintTitle")}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "6pt",
              fontSize: "9pt",
            }}
          >
            <span>
              {t("students.duplicateGrSummary", {
                groups: String(filtered.length),
                students: String(totalStudents),
              })}
            </span>
            <span>{t("students.duplicateGrPrintedOn", { date: printedOn })}</span>
          </div>
        </header>

        <p style={{ margin: "0 0 10pt", fontSize: "8.5pt", color: "#334155" }}>
          {t("students.duplicateGrPrintNote")}
        </p>

        {filtered.map((group, gi) => (
          <section key={group.grNumber} className="dup-gr-group">
            <div
              style={{
                background: "#fef3c7",
                border: "0.8pt solid #92400e",
                padding: "4pt 6pt",
                marginBottom: "4pt",
                fontWeight: 700,
                fontSize: "10pt",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              {gi + 1}. GR {group.grNumber} — {t("students.duplicateGrCount", { count: String(group.count) })}
            </div>
            <table className="dup-gr-table">
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("fields.firstName")}</th>
                  <th>{t("fields.fatherName")}</th>
                  <th>{t("fields.standard")}</th>
                  <th>{t("fields.rollNumber")}</th>
                  <th>{t("fields.mobile")}</th>
                </tr>
              </thead>
              <tbody>
                {group.students.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td>{studentName(s)}</td>
                    <td>{studentDisplayFatherName(s) || "—"}</td>
                    <td style={{ textAlign: "center" }}>{classText(s)}</td>
                    <td style={{ textAlign: "center" }}>{s.rollNumber || "—"}</td>
                    <td style={{ textAlign: "center", fontFamily: "monospace" }}>
                      {s.mobileNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer
          style={{
            marginTop: "28pt",
            display: "flex",
            justifyContent: "space-between",
            gap: "24pt",
            fontSize: "9pt",
          }}
        >
          <div style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderTop: "0.8pt solid #000", paddingTop: "4pt" }}>
              {t("students.duplicateGrSignClerk")}
            </div>
          </div>
          <div style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderTop: "0.8pt solid #000", paddingTop: "4pt" }}>
              {t("students.duplicateGrSignChecked")}
            </div>
          </div>
          <div style={{ width: "30%", textAlign: "center" }}>
            <div style={{ borderTop: "0.8pt solid #000", paddingTop: "4pt" }}>
              {t("students.duplicateGrSignPrincipal")}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
