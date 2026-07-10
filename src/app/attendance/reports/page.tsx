"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { AttendanceReportSummaryCards } from "@/components/attendance/attendance-report-summary";
import {
  AttendanceReportTable,
  AttendanceStudentDayGrid,
} from "@/components/attendance/attendance-report-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import type { AttendanceStudentReport } from "@/lib/attendance";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { BarChart3, Loader2, X } from "lucide-react";

interface ReportSummary {
  totalStudents: number;
  markedStudents: number;
  avgPercent: number;
  totalPresent: number;
  totalAbsent: number;
  totalHalf: number;
  totalMarkedDays: number;
}

interface StudentHistoryMonth {
  month: number;
  year: number;
  present: number;
  absent: number;
  half: number;
  markedDays: number;
  monthTotal: number;
  prevTotal: number;
  cumulative: number;
  attendance: (string | null)[];
  note: string;
}

interface StudentDetail extends AttendanceStudentReport {
  className: string;
  standard: string;
  section: string;
  history: StudentHistoryMonth[];
}

function ReportsContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: searchParams.get("classId") || "",
    standard: "",
    section: "",
    academicYear: "2025-26",
    studentId: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  });
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [students, setStudents] = useState<AttendanceStudentReport[]>([]);
  const [meta, setMeta] = useState({ className: "", standard: "", section: "" });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const monthLabel = `${ENGLISH_MONTHS[parseInt(filters.month, 10) - 1] || filters.month} ${filters.year}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSelected(null);
    const params = new URLSearchParams({ month: filters.month, year: filters.year });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);

    const res = await fetch(`/api/attendance/reports?${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setLoading(false);
      return;
    }
    setSummary(data.summary);
    setStudents(data.students || []);
    setMeta({
      className: data.className || "",
      standard: data.standard || "",
      section: data.section || "",
    });
    setLoaded(true);
    setLoading(false);
  }, [filters]);

  const loadStudentDetail = useCallback(
    async (student: AttendanceStudentReport) => {
      setDetailLoading(true);
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year,
        studentId: student.studentId,
      });
      if (filters.classId) params.set("classId", filters.classId);
      if (filters.standard) params.set("standard", filters.standard);
      if (filters.section) params.set("section", filters.section);

      const res = await fetch(`/api/attendance/reports?${params}`);
      const data = await res.json();
      if (res.ok && data.studentDetail) {
        setSelected(data.studentDetail);
      }
      setDetailLoading(false);
    },
    [filters]
  );

  useEffect(() => {
    if (searchParams.get("classId") && searchParams.get("auto") === "1") {
      load();
    }
  }, [searchParams, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BarChart3 className="h-7 w-7 text-blue-600" />
          {t("attendance.reportTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("attendance.reportSubtitle")}</p>
      </div>

      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showMonth />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !loaded ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <BarChart3 className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>{t("attendance.reportSelectHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {meta.className || `${meta.standard}-${meta.section}`}
            </span>
            <span>·</span>
            <span>{monthLabel}</span>
          </div>

          {summary && <AttendanceReportSummaryCards summary={summary} />}

          <div className="grid gap-6 xl:grid-cols-5">
            <div className={selected ? "xl:col-span-3" : "xl:col-span-5"}>
              <AttendanceReportTable
                students={students}
                search={search}
                onSearchChange={setSearch}
                selectedId={selected?.studentId ?? null}
                onSelect={loadStudentDetail}
              />
            </div>

            {selected && (
              <div className="xl:col-span-2">
                <Card className="sticky top-4 border-blue-200 shadow-md">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50/60 px-4 py-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{selected.name}</h3>
                        <p className="text-xs text-slate-500">
                          {t("attendance.roll")}: {selected.rollNumber || "—"} · GR: {selected.grNumber || "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selected.className} · {monthLabel}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {detailLoading ? (
                      <div className="flex h-40 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-4 p-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
                            <div className="text-lg font-bold text-emerald-700">{selected.present}</div>
                            <div className="text-[10px] uppercase text-emerald-600">Present</div>
                          </div>
                          <div className="rounded-lg bg-red-50 px-3 py-2 text-center">
                            <div className="text-lg font-bold text-red-600">{selected.absent}</div>
                            <div className="text-[10px] uppercase text-red-500">Absent</div>
                          </div>
                          <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                            <div className="text-lg font-bold text-amber-600">{selected.half}</div>
                            <div className="text-[10px] uppercase text-amber-600">Half</div>
                          </div>
                          <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
                            <div className="text-lg font-bold text-blue-700">{selected.percent}%</div>
                            <div className="text-[10px] uppercase text-blue-600">{t("attendance.reportAvgPercent")}</div>
                          </div>
                        </div>

                        <AttendanceStudentDayGrid attendance={selected.attendance} monthLabel={monthLabel} />

                        {selected.note && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold">{t("attendance.note")}: </span>
                            {selected.note}
                          </div>
                        )}

                        {selected.history.length > 1 && (
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-slate-800">{t("attendance.reportHistory")}</h4>
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50 sticky top-0">
                                  <tr className="text-left text-slate-500">
                                    <th className="px-2 py-1.5">{t("certificates.month")}</th>
                                    <th className="px-2 py-1.5 text-center">P</th>
                                    <th className="px-2 py-1.5 text-center">A</th>
                                    <th className="px-2 py-1.5 text-center">H</th>
                                    <th className="px-2 py-1.5 text-center">{t("attendance.cumulative")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selected.history.map((h) => (
                                    <tr key={`${h.year}-${h.month}`} className="border-t border-slate-50">
                                      <td className="px-2 py-1.5 font-medium">
                                        {ENGLISH_MONTHS[h.month - 1]} {h.year}
                                      </td>
                                      <td className="px-2 py-1.5 text-center text-emerald-700">{h.present}</td>
                                      <td className="px-2 py-1.5 text-center text-red-600">{h.absent}</td>
                                      <td className="px-2 py-1.5 text-center text-amber-600">{h.half}</td>
                                      <td className="px-2 py-1.5 text-center font-semibold">{h.cumulative}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AttendanceReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
