"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Save, Search, Sparkles, Users } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { teacherTheme as tp } from "@/components/teacher/teacher-theme";
import { assignedRollsById, sortStudentsForRollAssign } from "@/lib/roll-order";

type ClassOption = {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream?: string | null;
  academicYear: string;
  _count: { students: number };
};

type StudentRow = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  grNumber?: string | null;
  rollNumber?: string | null;
  gender?: string | null;
  sscSeatPrefix?: string | null;
  sscSeatNumber?: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
};

export function RollNumberManager({ teacher = false }: { teacher?: boolean }) {
  const t = useT();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/roll-numbers")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed");
        const list = payload.classes || [];
        const requestedClassId =
          new URLSearchParams(window.location.search).get("classId") || "";
        setClasses(list);
        if (
          requestedClassId &&
          list.some((item: ClassOption) => item.id === requestedClassId)
        ) {
          setClassId(requestedClassId);
        } else if (list.length === 1) {
          setClassId(list[0].id);
        }
      })
      .catch((cause) =>
        setMessage({
          type: "error",
          text:
            cause instanceof Error
              ? cause.message
              : t("rollNumbers.loadFailed"),
        }),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const loadStudents = useCallback(async (opts?: { keepMessage?: boolean }) => {
    if (!classId) {
      setStudents([]);
      setDrafts({});
      return;
    }
    setStudentsLoading(true);
    if (!opts?.keepMessage) setMessage(null);
    try {
      const response = await fetch(`/api/roll-numbers?classId=${classId}`);
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || t("rollNumbers.loadFailed"));
      const rows: StudentRow[] = payload.students || [];
      setStudents(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((student) => [student.id, student.rollNumber || ""]),
        ),
      );
    } catch (cause) {
      setStudents([]);
      setDrafts({});
      setMessage({
        type: "error",
        text:
          cause instanceof Error ? cause.message : t("rollNumbers.loadFailed"),
      });
    } finally {
      setStudentsLoading(false);
    }
  }, [classId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStudents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  const selectedClass = classes.find((item) => item.id === classId);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [
        student.firstName,
        student.middleName,
        student.surname,
        student.grNumber,
        drafts[student.id],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [drafts, search, students]);

  const duplicateIds = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const student of students) {
      const value = (drafts[student.id] || "").trim().toLowerCase();
      if (!value) continue;
      groups.set(value, [...(groups.get(value) || []), student.id]);
    }
    return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
  }, [drafts, students]);

  const getBoardSeat = (student: StudentRow) =>
    selectedClass?.standard === "12"
      ? [student.hscSeatPrefix, student.hscSeatNumber].filter(Boolean).join("")
      : selectedClass?.standard === "10"
        ? [student.sscSeatPrefix, student.sscSeatNumber].filter(Boolean).join("")
        : "";

  const autoAssign = () => {
    if (!students.length || saving) return;
    const sorted = sortStudentsForRollAssign(students);
    setStudents(sorted);
    setDrafts(assignedRollsById(sorted));
    setSearch("");
    setMessage({
      type: "ok",
      text: t("rollNumbers.autoAssignDone", { count: sorted.length }),
    });
  };

  const save = async () => {
    if (!classId || duplicateIds.size) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/roll-numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          updates: students.map((student) => ({
            studentId: student.id,
            rollNumber: drafts[student.id] || "",
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || t("rollNumbers.saveFailed"));
      setMessage({
        type: "ok",
        text: t("rollNumbers.saved", { count: payload.updated || 0 }),
      });
      await loadStudents({ keepMessage: true });
    } catch (cause) {
      setMessage({
        type: "error",
        text:
          cause instanceof Error ? cause.message : t("rollNumbers.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(students.length) && !saving && duplicateIds.size === 0;

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={!students.length || saving}
        onClick={autoAssign}
      >
        <Sparkles className="h-4 w-4" />
        {t("rollNumbers.autoAssign")}
      </Button>
      <Button
        type="button"
        className={`w-full sm:w-auto ${teacher ? tp.btn : ""}`}
        disabled={!canSave}
        onClick={() => void save()}
      >
        {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
        {t("common.save")}
      </Button>
    </>
  );

  if (loading) return <PageLoader />;

  return (
    <PageShell
      title={t("rollNumbers.title")}
      subtitle={
        teacher
          ? t("rollNumbers.teacherSubtitle")
          : t("rollNumbers.adminSubtitle")
      }
      icon={<Hash className="h-5 w-5" />}
      variant={teacher ? "teacher" : "default"}
      accentColor={teacher ? "border-teal-500" : "border-blue-500"}
      breadcrumbs={[
        {
          label: t("nav.dashboard"),
          href: teacher ? "/teacher" : "/dashboard",
        },
        { label: t("rollNumbers.title") },
      ]}
      actions={
        <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap">
          {actionButtons}
        </div>
      }
    >
      <div className="min-w-0 space-y-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:space-y-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label={t("rollNumbers.selectClass")}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              options={classes.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.academicYear} · ${item._count.students} ${t("rollNumbers.students")}`,
              }))}
              emptyLabel={t("rollNumbers.chooseClass")}
            />
            <div className="min-w-0 space-y-1.5">
              <label className="block break-words text-sm font-medium leading-snug text-slate-700">
                {t("common.search")}
              </label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 sm:h-10">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("rollNumbers.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div
            className={`rounded-xl border px-3 py-3 text-sm font-medium leading-snug sm:px-4 ${
              message.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        {duplicateIds.size ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm leading-snug text-red-700 sm:px-4">
            {t("rollNumbers.duplicateError")}
          </div>
        ) : null}

        {!classId ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            <Hash className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="mx-auto max-w-sm break-words">{t("rollNumbers.chooseClassHint")}</p>
          </div>
        ) : studentsLoading ? (
          <PageLoader card />
        ) : students.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="break-words">{t("rollNumbers.noStudents")}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b bg-slate-50/90 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-slate-900 sm:text-base">
                  {selectedClass?.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filtered.length} / {students.length} {t("rollNumbers.students")}
                </p>
              </div>
              <p className="break-words text-xs leading-snug text-slate-500 sm:max-w-xs sm:text-right">
                {t("rollNumbers.uniqueHint")}
              </p>
            </div>

            {!filtered.length ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                {t("common.noData")}
              </div>
            ) : (
              <>
                {/* Mobile / tablet cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filtered.map((student, index) => {
                    const boardSeat = getBoardSeat(student);
                    const fullName = [student.firstName, student.middleName, student.surname]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <article key={student.id} className="space-y-3 p-3.5">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                              {fullName}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                                {t("fields.grNumber")}: {student.grNumber || "—"}
                              </span>
                              {student.gender ? (
                                <span className="rounded-md bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
                                  {student.gender}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">
                            {t("fields.roll")}
                          </span>
                          <input
                            value={drafts[student.id] || ""}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [student.id]: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                            placeholder={t("rollNumbers.rollPlaceholder")}
                            className={`h-12 w-full rounded-xl border px-3 font-mono text-lg font-semibold outline-none focus:ring-2 ${
                              duplicateIds.has(student.id)
                                ? "border-red-400 bg-red-50 focus:ring-red-200"
                                : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
                            }`}
                          />
                        </label>

                        {boardSeat ? (
                          <p className="break-all rounded-xl bg-indigo-50 px-3 py-2 text-xs leading-snug text-indigo-700">
                            <span className="font-medium">{t("rollNumbers.boardSeat")}:</span>{" "}
                            <span className="font-mono font-bold">{boardSeat}</span>
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-100 text-left text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="w-14 px-4 py-3">#</th>
                        <th className="px-4 py-3">{t("common.name")}</th>
                        <th className="px-4 py-3">{t("fields.grNumber")}</th>
                        <th className="min-w-[9rem] px-4 py-3">{t("fields.roll")}</th>
                        <th className="px-4 py-3">{t("rollNumbers.boardSeat")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((student, index) => {
                        const boardSeat = getBoardSeat(student);
                        return (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                            <td className="max-w-[16rem] break-words px-4 py-3 font-semibold text-slate-900">
                              {[
                                student.firstName,
                                student.middleName,
                                student.surname,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                              {student.grNumber || "—"}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={drafts[student.id] || ""}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [student.id]: event.target.value,
                                  }))
                                }
                                placeholder={t("rollNumbers.rollPlaceholder")}
                                className={`h-10 w-full min-w-0 rounded-lg border px-3 font-mono text-sm font-semibold outline-none focus:ring-2 ${
                                  duplicateIds.has(student.id)
                                    ? "border-red-400 bg-red-50 focus:ring-red-200"
                                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                                }`}
                              />
                            </td>
                            <td className="break-all px-4 py-3 font-mono font-semibold text-indigo-700">
                              {boardSeat || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky mobile action bar */}
      {students.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div
            className="mx-auto grid max-w-[1600px] grid-cols-2 gap-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {actionButtons}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
