"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, BookOpenCheck } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { GunPatrakSheet } from "@/components/results/gun-patrak-sheet";
import { useT } from "@/i18n/locale-provider";
import { FINANCIAL_YEARS, DEFAULT_ACADEMIC_YEAR } from "@/lib/constants";
import { compareRollNumbers } from "@/lib/attendance";
import { gunPatrakExamNo, type GunPatrakStudent } from "@/lib/results/gun-patrak";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import { cn } from "@/lib/utils";

type ClassRow = {
  id: string;
  name: string;
  standard: string;
  section: string;
  academicYear: string;
  studentCount?: number;
  classTeacher?: { firstName: string; lastName: string } | null;
};

type TermStat = {
  key: string;
  labelEn: string;
  labelGu: string;
  maxMarks: number;
  internalMax?: number;
  examDate?: string | null;
};

type SubjectDef = { code: string; name: string; type?: string };

type StudentMark = {
  studentId: string;
  rollNumber?: string | null;
  subjectMarks: Array<{
    subjectCode: string;
    subjectName: string;
    termValue: number | null;
    internalValue?: number | null;
  }>;
};

function GunPatrakInner() {
  const t = useT();
  const params = useSearchParams();
  const { letterhead } = useSchoolFeatures();
  const [year, setYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState(params.get("classId") || "");
  const [termKey, setTermKey] = useState(params.get("term") || "");
  const [subjectCode, setSubjectCode] = useState(params.get("subject") || "");
  const [printAll, setPrintAll] = useState(false);
  const [terms, setTerms] = useState<TermStat[]>([]);
  const [subjects, setSubjects] = useState<SubjectDef[]>([]);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [seats, setSeats] = useState<Record<string, string>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);

  const schoolName = (letterhead?.name || "").trim();
  const selectedClass = classes.find((c) => c.id === classId) || null;
  const selectedTerm = terms.find((tm) => tm.key === termKey) || null;
  const examiner = selectedClass?.classTeacher
    ? `${selectedClass.classTeacher.firstName} ${selectedClass.classTeacher.lastName}`.trim()
    : "";

  useEffect(() => {
    setLoadingClasses(true);
    fetch(`/api/results/class-overview?academicYear=${encodeURIComponent(year)}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [year]);

  const loadMeta = useCallback(async (id: string) => {
    const res = await fetch(`/api/results/term-marks?classId=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    const nextTerms: TermStat[] = data.termStats || [];
    setTerms(nextTerms);
    setSubjects((data.subjects || []).filter((s: SubjectDef) => s.type !== "grade"));
    setTermKey((prev) => prev || nextTerms[0]?.key || "");
  }, []);

  const loadSheet = useCallback(async (id: string, term: string) => {
    setLoadingSheet(true);
    try {
      const [marksRes, seatRes] = await Promise.all([
        fetch(
          `/api/results/term-marks?classId=${encodeURIComponent(id)}&term=${encodeURIComponent(term)}`,
        ),
        fetch(
          `/api/exam-seat-numbers?classId=${encodeURIComponent(id)}&termKey=${encodeURIComponent(term)}`,
        ).catch(() => null),
      ]);
      const marksData = await marksRes.json();
      if (!marksRes.ok) throw new Error(marksData.error || "Failed");
      setStudents(marksData.students || []);
      setSubjects((marksData.subjects || []).filter((s: SubjectDef) => s.type !== "grade"));
      if (seatRes?.ok) {
        const seatData = await seatRes.json();
        const map: Record<string, string> = {};
        for (const row of seatData.students || []) {
          if (row.id && row.seatNumber) map[row.id] = String(row.seatNumber);
        }
        setSeats(map);
      } else {
        setSeats({});
      }
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    if (!classId) {
      setTerms([]);
      setSubjects([]);
      setStudents([]);
      return;
    }
    void loadMeta(classId).catch(() => {
      setTerms([]);
      setSubjects([]);
    });
  }, [classId, loadMeta]);

  useEffect(() => {
    if (!classId || !termKey) {
      setStudents([]);
      return;
    }
    void loadSheet(classId, termKey).catch(() => setStudents([]));
  }, [classId, termKey, loadSheet]);

  const rowsBySubject = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      const seatA = seats[a.studentId] || "";
      const seatB = seats[b.studentId] || "";
      if (seatA && seatB && seatA !== seatB) return seatA.localeCompare(seatB, undefined, { numeric: true });
      return (
        compareRollNumbers(a.rollNumber, b.rollNumber) ||
        a.studentId.localeCompare(b.studentId)
      );
    });

    const map = new Map<string, GunPatrakStudent[]>();
    for (const subject of subjects) {
      map.set(
        subject.code,
        sorted.map((st, index) => {
          const mark = st.subjectMarks.find((m) => m.subjectCode === subject.code);
          const paper = mark?.termValue ?? null;
          const internal = mark?.internalValue ?? null;
          return {
            studentId: st.studentId,
            examNo: gunPatrakExamNo(seats[st.studentId], st.rollNumber, index + 1),
            marks: paper != null ? paper : internal,
          };
        }),
      );
    }
    return map;
  }, [students, subjects, seats]);

  const visibleSubjects = useMemo(() => {
    if (printAll) return subjects;
    if (!subjectCode) return [];
    return subjects.filter((s) => s.code === subjectCode);
  }, [printAll, subjectCode, subjects]);

  const filledCount = (code: string) =>
    (rowsBySubject.get(code) || []).filter((r) => r.marks != null).length;

  return (
    <PageShell
      title={t("results.gunPatrakTitle")}
      subtitle={t("results.gunPatrakSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("results.hubTitle"), href: "/results" },
        { label: t("results.gunPatrakTitle") },
      ]}
      icon={<BookOpenCheck className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href={classId ? `/results/class/${classId}` : "/results"}>
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.back")}
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            disabled={!visibleSubjects.length}
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            {t("results.gunPatrakPrint")}
          </Button>
        </div>
      }
    >
      <div className="no-print space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <Select
            label={t("classes.academicYear")}
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setClassId("");
              setTermKey("");
              setSubjectCode("");
              setPrintAll(false);
            }}
            options={FINANCIAL_YEARS.map((y) => ({ value: y, label: y }))}
            hideEmptyOption
          />
          <Select
            label={t("examTerms.selectClass")}
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setTermKey("");
              setSubjectCode("");
              setPrintAll(false);
            }}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} · ${c.standard}-${c.section}`,
            }))}
          />
          <Select
            label={t("examTerms.selectExam")}
            value={termKey}
            onChange={(e) => {
              setTermKey(e.target.value);
              setPrintAll(false);
            }}
            options={terms.map((tm) => ({
              value: tm.key,
              label: tm.labelGu || tm.labelEn,
            }))}
          />
        </div>

        {loadingClasses ? (
          <PageLoader />
        ) : !classId ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {t("results.gunPatrakPickClass")}
          </p>
        ) : loadingSheet ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {t("results.gunPatrakSubjects")}
              </p>
              <Button
                type="button"
                variant={printAll ? "default" : "outline"}
                size="sm"
                disabled={!subjects.length}
                onClick={() => {
                  setPrintAll(true);
                  setSubjectCode("");
                }}
              >
                {t("results.gunPatrakPrintAll")}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => {
                const on = !printAll && subjectCode === subject.code;
                const filled = filledCount(subject.code);
                return (
                  <button
                    key={subject.code}
                    type="button"
                    className={cn(
                      "rounded-xl border bg-white px-3 py-3 text-left transition",
                      on
                        ? "border-teal-500 bg-teal-50 shadow-[0_0_0_2px_rgba(20,184,166,0.15)]"
                        : "border-slate-200 hover:border-teal-300 hover:bg-slate-50",
                    )}
                    onClick={() => {
                      setSubjectCode(subject.code);
                      setPrintAll(false);
                    }}
                  >
                    <strong className="block text-sm text-slate-900">{subject.name}</strong>
                    <span className="mt-1 block text-xs text-slate-500">
                      {t("results.gunPatrakFilled", {
                        filled,
                        total: students.length,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedClass && selectedTerm && visibleSubjects.length > 0 && (
        <div className="print-area gp-print-root mt-4">
          {visibleSubjects.map((subject) => (
            <GunPatrakSheet
              key={subject.code}
              schoolName={schoolName}
              examLabel={selectedTerm.labelGu || selectedTerm.labelEn}
              subjectName={subject.name}
              standard={selectedClass.standard}
              section={selectedClass.section}
              examDate={selectedTerm.examDate}
              examiner={examiner}
              students={rowsBySubject.get(subject.code) || []}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default function GunPatrakPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <GunPatrakInner />
    </Suspense>
  );
}
