"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Download,
  Eye,
  EyeOff,
  Save,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";

type ClassOption = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string;
  academicYear: string;
  _count: { students: number };
};

type ExamTerm = {
  key: string;
  labelEn: string;
  labelGu: string;
  examDate?: string | null;
  published: boolean;
};

type StudentRow = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  grNumber?: string | null;
  rollNumber?: string | null;
  seatNumber: string;
};

export function ExamSeatNumberManager({
  teacher = false,
}: {
  teacher?: boolean;
}) {
  const t = useT();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [termKey, setTermKey] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [prefix, setPrefix] = useState("");
  const [startAt, setStartAt] = useState("1");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [assignedCount, setAssignedCount] = useState(0);

  useEffect(() => {
    fetch("/api/exam-seat-numbers")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed");
        const list = (payload.classes || []) as ClassOption[];
        setClasses(list);
        const requested =
          new URLSearchParams(window.location.search).get("classId") || "";
        if (requested && list.some((item) => item.id === requested)) {
          setClassId(requested);
        } else if (list.length === 1) {
          setClassId(list[0].id);
        }
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : t("examSeats.loadFailed"),
        ),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const loadClass = useCallback(async () => {
    setTerms([]);
    setTermKey("");
    setStudents([]);
    setDrafts({});
    if (!classId) return;
    setRowsLoading(true);
    try {
      const response = await fetch(
        `/api/exam-seat-numbers?classId=${encodeURIComponent(classId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || t("examSeats.loadFailed"));
      const nextTerms = (payload.terms || []) as ExamTerm[];
      setTerms(nextTerms);
      if (nextTerms.length === 1) setTermKey(nextTerms[0].key);
      const selectedClass = classes.find((item) => item.id === classId);
      if (selectedClass) {
        setPrefix(
          `${selectedClass.standard}${selectedClass.section || ""}-`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("examSeats.loadFailed"),
      );
    } finally {
      setRowsLoading(false);
    }
  }, [classId, classes, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClass(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClass]);

  const loadStudents = useCallback(async () => {
    setStudents([]);
    setDrafts({});
    setIsPublished(false);
    setAssignedCount(0);
    if (!classId || !termKey) return;
    setRowsLoading(true);
    try {
      const response = await fetch(
        `/api/exam-seat-numbers?classId=${encodeURIComponent(classId)}&termKey=${encodeURIComponent(termKey)}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || t("examSeats.loadFailed"));
      const rows = (payload.students || []) as StudentRow[];
      setStudents(rows);
      setIsPublished(Boolean(payload.isPublished));
      setAssignedCount(Number(payload.assignedCount) || 0);
      setDrafts(
        Object.fromEntries(
          rows.map((student) => [student.id, student.seatNumber || ""]),
        ),
      );
      const selectedClass = classes.find((item) => item.id === classId);
      if (selectedClass) {
        setPrefix(
          `${selectedClass.standard}${selectedClass.section || ""}-`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("examSeats.loadFailed"),
      );
    } finally {
      setRowsLoading(false);
    }
  }, [classId, classes, termKey, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStudents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  const duplicateIds = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const student of students) {
      const seat = (drafts[student.id] || "").trim().toLowerCase();
      if (!seat) continue;
      groups.set(seat, [...(groups.get(seat) || []), student.id]);
    }
    return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
  }, [drafts, students]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [
        student.firstName,
        student.middleName,
        student.surname,
        student.grNumber,
        student.rollNumber,
        drafts[student.id],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [drafts, search, students]);

  const autoGenerate = () => {
    const cleanPrefix = prefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9/_-]/g, "")
      .slice(0, 30);
    const first = Math.max(0, Number.parseInt(startAt, 10) || 1);
    setDrafts(
      Object.fromEntries(
        students.map((student, index) => [
          student.id,
          `${cleanPrefix}${first + index}`.slice(0, 40),
        ]),
      ),
    );
  };

  const save = async () => {
    if (!classId || !termKey || duplicateIds.size) return;
    setSaving(true);
    try {
      const response = await fetch("/api/exam-seat-numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          termKey,
          updates: students.map((student) => ({
            studentId: student.id,
            seatNumber: drafts[student.id] || "",
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || t("examSeats.saveFailed"));
      toast.success(t("examSeats.saved", { count: payload.updated || 0 }));
      await loadStudents();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("examSeats.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const setPublishState = async (nextPublished: boolean) => {
    if (!classId || !termKey) return;
    setPublishing(true);
    try {
      const response = await fetch("/api/exam-seat-numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          termKey,
          action: nextPublished ? "publish" : "unpublish",
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error ||
            (nextPublished
              ? t("examSeats.publishFailed")
              : t("examSeats.unpublishFailed")),
        );
      toast.success(
        nextPublished ? t("examSeats.published") : t("examSeats.unpublished"),
      );
      await loadStudents();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : nextPublished
            ? t("examSeats.publishFailed")
            : t("examSeats.unpublishFailed"),
      );
    } finally {
      setPublishing(false);
    }
  };

  const exportCsv = () => {
    const selectedClass = classes.find((item) => item.id === classId);
    const selectedTerm = terms.find((item) => item.key === termKey);
    const rows = students.map((student) => [
      drafts[student.id] || "",
      student.rollNumber || "",
      student.grNumber || "",
      [student.firstName, student.middleName, student.surname]
        .filter(Boolean)
        .join(" "),
    ]);
    const csv = [
      ["Seat Number", "Roll Number", "GR Number", "Student Name"],
      ...rows,
    ]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `${selectedTerm?.labelEn || "exam"}-${selectedClass?.name || "class"}-seat-numbers.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <PageLoader />;

  return (
    <PageShell
      title={t("examSeats.title")}
      subtitle={
        teacher
          ? t("examSeats.teacherSubtitle")
          : t("examSeats.adminSubtitle")
      }
      icon={<Armchair className="h-5 w-5" />}
      breadcrumbs={[
        {
          label: t("nav.dashboard"),
          href: teacher ? "/teacher" : "/dashboard",
        },
        { label: t("examSeats.title") },
      ]}
      actions={
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex sm:w-auto sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={!students.length}
            onClick={exportCsv}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            {t("examSeats.export")}
          </Button>
          {isPublished ? (
            <Button
              type="button"
              variant="outline"
              disabled={!assignedCount || publishing || saving}
              onClick={() => void setPublishState(false)}
              className="w-full sm:w-auto"
            >
              {publishing ? <Spinner size="sm" /> : <EyeOff className="h-4 w-4" />}
              {t("examSeats.unpublish")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={!assignedCount || publishing || saving}
              onClick={() => void setPublishState(true)}
              className="w-full sm:w-auto"
            >
              {publishing ? <Spinner size="sm" /> : <Eye className="h-4 w-4" />}
              {t("examSeats.publish")}
            </Button>
          )}
          <Button
            type="button"
            disabled={!students.length || saving || publishing || duplicateIds.size > 0}
            onClick={() => void save()}
            className="w-full sm:w-auto"
          >
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t("examSeats.selectClass")}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              options={classes.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.academicYear} · ${item._count.students} ${t("examSeats.students")}`,
              }))}
              emptyLabel={t("examSeats.chooseClass")}
            />
            <Select
              label={t("examSeats.selectExam")}
              value={termKey}
              onChange={(event) => setTermKey(event.target.value)}
              options={terms.map((term) => ({
                value: term.key,
                label: term.labelEn,
              }))}
              emptyLabel={t("examSeats.chooseExam")}
            />
          </div>
        </section>

        {students.length ? (
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-cyan-50 p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-2">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900">
                  {t("examSeats.generatorTitle")}
                </h2>
                <p className="text-xs text-slate-600">
                  {t("examSeats.generatorDesc")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_8rem_auto] sm:items-end">
              <Input
                label={t("examSeats.prefix")}
                value={prefix}
                maxLength={30}
                onChange={(event) => setPrefix(event.target.value)}
              />
              <Input
                label={t("examSeats.startAt")}
                type="number"
                min="0"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
              <Button type="button" variant="outline" onClick={autoGenerate} className="w-full sm:w-auto">
                <Sparkles className="h-4 w-4" />
                {t("examSeats.generate")}
              </Button>
            </div>
          </section>
        ) : null}

        {duplicateIds.size ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {t("examSeats.duplicateError")}
          </div>
        ) : null}

        {!classId || !termKey ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            <Armchair className="mx-auto mb-3 h-11 w-11 text-slate-300" />
            {t("examSeats.chooseHint")}
          </div>
        ) : rowsLoading ? (
          <PageLoader card />
        ) : !students.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            {t("examSeats.noStudents")}
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">
                  {students.filter((student) => drafts[student.id]?.trim()).length}{" "}
                  / {students.length} {t("examSeats.assigned")}
                </p>
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    isPublished ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isPublished
                    ? t("examSeats.publishedHint")
                    : t("examSeats.draftHint")}
                </p>
              </div>
              <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 sm:h-9 sm:w-auto sm:min-w-60">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("examSeats.search")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-16 px-4 py-3">#</th>
                    <th className="px-4 py-3">{t("common.name")}</th>
                    <th className="px-4 py-3">{t("fields.grNumber")}</th>
                    <th className="px-4 py-3">{t("fields.roll")}</th>
                    <th className="w-64 px-4 py-3">
                      {t("examSeats.seatNumber")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {[student.firstName, student.middleName, student.surname]
                          .filter(Boolean)
                          .join(" ")}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {student.grNumber || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {student.rollNumber || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={drafts[student.id] || ""}
                          maxLength={40}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [student.id]: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={t("examSeats.seatPlaceholder")}
                          className={`h-9 w-full rounded-lg border px-3 font-mono font-bold uppercase outline-none focus:ring-2 ${
                            duplicateIds.has(student.id)
                              ? "border-red-400 bg-red-50 focus:ring-red-200"
                              : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map((student, index) => {
                const fullName = [
                  student.firstName,
                  student.middleName,
                  student.surname,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <article key={student.id} className="space-y-3 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {fullName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            {t("fields.grNumber")}:{" "}
                            <span className="font-mono text-slate-700">
                              {student.grNumber || "—"}
                            </span>
                          </span>
                          <span>
                            {t("fields.roll")}:{" "}
                            <span className="font-mono text-slate-700">
                              {student.rollNumber || "—"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        {t("examSeats.seatNumber")}
                      </span>
                      <input
                        value={drafts[student.id] || ""}
                        maxLength={40}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [student.id]: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder={t("examSeats.seatPlaceholder")}
                        className={`h-11 w-full rounded-xl border px-3 font-mono font-bold uppercase outline-none focus:ring-2 ${
                          duplicateIds.has(student.id)
                            ? "border-red-400 bg-red-50 focus:ring-red-200"
                            : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                        }`}
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
