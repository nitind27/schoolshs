"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, Users, BookOpen, Search } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { studentFullNameGu } from "@/lib/student-names";

type ClassItem = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string | null;
  _count?: { students: number };
};

type StudentItem = {
  id: string;
  grNumber?: string | null;
  firstName: string;
  surname: string;
  middleName?: string | null;
  firstNameGu?: string | null;
  surnameGu?: string | null;
  middleNameGu?: string | null;
  standard?: string | null;
  section?: string | null;
  rollNumber?: string | null;
};

export type GrPickedStudent = {
  id: string;
  name: string;
  grNumber?: string | null;
  standard?: string | null;
  section?: string | null;
};

export function GrStudentPickerModal({
  open,
  onClose,
  academicYear,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  academicYear: string;
  onSelect: (student: GrPickedStudent) => void;
}) {
  const t = useT();
  const [step, setStep] = useState<"class" | "student">("class");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const reset = useCallback(() => {
    setStep("class");
    setSelectedClass(null);
    setStudents([]);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    setLoading(true);
    fetch(`/api/classes?academicYear=${encodeURIComponent(academicYear)}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .finally(() => setLoading(false));
  }, [open, academicYear, reset]);

  const loadStudents = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setStep("student");
    setSearch("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/students?classId=${cls.id}&limit=200`,
      );
      const data = await res.json();
      setStudents(data.students || []);
    } finally {
      setLoading(false);
    }
  };

  const groupedClasses = useMemo(() => {
    const map = new Map<string, ClassItem[]>();
    for (const c of classes) {
      if (!map.has(c.standard)) map.set(c.standard, []);
      map.get(c.standard)!.push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.section.localeCompare(b.section));
    }
    return [...map.entries()].sort(([a], [b]) => Number(a) - Number(b));
  }, [classes]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const full = studentFullNameGu(s).toLowerCase();
      return (
        full.includes(q) ||
        (s.grNumber || "").toLowerCase().includes(q) ||
        (s.rollNumber || "").toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  const handlePick = (s: StudentItem) => {
    onSelect({
      id: s.id,
      name: studentFullNameGu(s),
      grNumber: s.grNumber,
      standard: s.standard,
      section: s.section,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "student" && (
              <button
                type="button"
                onClick={() => {
                  setStep("class");
                  setSelectedClass(null);
                  setStudents([]);
                  setSearch("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                aria-label={t("certificates.grBackToClasses")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">
                {step === "class" ? t("certificates.grSelectClass") : t("certificates.grSelectStudentStep")}
              </h3>
              {step === "student" && selectedClass && (
                <p className="text-xs text-slate-500 truncate">{selectedClass.name}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : step === "class" ? (
            groupedClasses.length === 0 ? (
              <p className="text-center text-slate-500 py-12">{t("results.noClasses")}</p>
            ) : (
              <div className="space-y-5">
                {groupedClasses.map(([std, list]) => (
                  <div key={std}>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      {t("results.classLabel", { standard: std })}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {list.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => loadStudents(cls)}
                          className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                        >
                          <p className="font-semibold text-sm text-slate-900">{cls.name}</p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {cls._count?.students ?? 0} {t("results.students")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filteredStudents.length === 0 ? (
            <p className="text-center text-slate-500 py-12">{t("certificates.grNoStudentsInClass")}</p>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("certificates.grSearchStudent")}
                  className="h-10 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {filteredStudents.map((s) => {
                  const name = studentFullNameGu(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handlePick(s)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.grNumber ? `GR ${s.grNumber}` : ""}
                          {s.grNumber && s.rollNumber ? " · " : ""}
                          {s.rollNumber ? `Roll ${s.rollNumber}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-blue-600 shrink-0">
                        Std {s.standard || "-"}-{s.section || "-"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
