"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PenLine, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";

type StaffOption = {
  id: string;
  name: string;
  designation: string;
  employeeId: string | null;
  hasTeacherLogin: boolean;
  classTeacherOf: string[];
};

type ClassOption = {
  id: string;
  name: string;
  academicYear: string;
  subjects: { code: string; name: string; type: string }[];
};

type Grant = { id: string; staffId: string; classId: string; subjectCode: string };

export function MarksAccessManager() {
  const t = useT();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [staffId, setStaffId] = useState("");
  const [classId, setClassId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/results/marks-access");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || t("marksAccess.loadFailed"));
    setStaff(json.staff || []);
    setClasses(json.classes || []);
    setGrants(json.grants || []);
  }, [t]);

  useEffect(() => {
    load()
      .catch((cause) => setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("marksAccess.loadFailed") }))
      .finally(() => setLoading(false));
  }, [load, t]);

  const selectedStaff = staff.find((item) => item.id === staffId) || null;
  const selectedClass = classes.find((item) => item.id === classId) || null;

  const staffGrants = useMemo(() => grants.filter((item) => item.staffId === staffId), [grants, staffId]);

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const grant of staffGrants) {
      const list = map.get(grant.classId) || [];
      list.push(grant.subjectCode);
      map.set(grant.classId, list);
    }
    return [...map.entries()].map(([id, codes]) => ({
      classId: id,
      className: classes.find((item) => item.id === id)?.name || id,
      codes,
    }));
  }, [staffGrants, classes]);

  useEffect(() => {
    if (!selectedClass) {
      setPicked([]);
      return;
    }
    const existing = staffGrants.filter((item) => item.classId === selectedClass.id).map((item) => item.subjectCode);
    setPicked(existing);
  }, [selectedClass, staffGrants]);

  const ensureSubjects = async (item: ClassOption) => {
    if (item.subjects.length) return item.subjects;
    const res = await fetch(`/api/classes/${item.id}/subjects`);
    const json = await res.json();
    const subjects = (json.subjects || []).filter((subject: { isActive?: boolean }) => subject.isActive !== false);
    setClasses((prev) => prev.map((row) => (row.id === item.id ? { ...row, subjects } : row)));
    return subjects as ClassOption["subjects"];
  };

  const onClassChange = async (nextId: string) => {
    setClassId(nextId);
    const item = classes.find((row) => row.id === nextId);
    if (item && !item.subjects.length) {
      await ensureSubjects(item).catch(() => undefined);
    }
  };

  const toggle = (code: string) => {
    setPicked((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const save = async () => {
    if (!staffId || !classId) return;
    if (!picked.length) {
      setMessage({ type: "err", text: t("marksAccess.needSubjects") });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/results/marks-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, classId, subjectCodes: picked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("marksAccess.saveFailed"));
      await load();
      setMessage({ type: "ok", text: t("marksAccess.saved") });
    } catch (cause) {
      setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("marksAccess.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  const removeClass = async (removeClassId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/results/marks-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, classId: removeClassId, subjectCodes: [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("marksAccess.saveFailed"));
      if (classId === removeClassId) setPicked([]);
      await load();
      setMessage({ type: "ok", text: t("marksAccess.removed") });
    } catch (cause) {
      setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("marksAccess.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  const subjectName = (ownerClassId: string, code: string) =>
    classes.find((item) => item.id === ownerClassId)?.subjects.find((subject) => subject.code === code)?.name || code;

  return (
    <PageShell title={t("marksAccess.title")} subtitle={t("marksAccess.subtitle")} icon={<PenLine className="h-5 w-5" />}>
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        {message ? (
          <p className={`rounded-xl border px-3 py-2 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <Select
                label={t("marksAccess.selectStaff")}
                value={staffId}
                emptyLabel={t("marksAccess.chooseStaff")}
                options={staff.map((person) => ({
                  value: person.id,
                  label: `${person.name} · ${person.designation}`,
                }))}
                onChange={(event) => {
                  setStaffId(event.target.value);
                  setClassId("");
                  setPicked([]);
                }}
              />

              {selectedStaff ? (
                <div className={`rounded-xl px-3 py-2 text-sm ${selectedStaff.hasTeacherLogin ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  <p className="font-semibold">
                    {selectedStaff.hasTeacherLogin ? t("marksAccess.teacherLogin") : t("marksAccess.noTeacherLogin")}
                  </p>
                  {selectedStaff.classTeacherOf.length ? (
                    <p className="mt-1 text-xs">
                      {t("marksAccess.classTeacher", { name: selectedStaff.classTeacherOf.join(", ") })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Select
                label={t("marksAccess.selectClass")}
                value={classId}
                emptyLabel={t("marksAccess.chooseClass")}
                options={classes.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.academicYear}`,
                }))}
                onChange={(event) => onClassChange(event.target.value)}
                disabled={!staffId}
              />

              {selectedClass ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{t("marksAccess.subjects")}</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-teal-800"
                      onClick={() => setPicked(selectedClass.subjects.map((subject) => subject.code))}
                    >
                      {t("marksAccess.allSubjects")}
                    </button>
                  </div>
                  {!selectedClass.subjects.length ? (
                    <p className="text-sm text-slate-500">{t("common.noData")}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedClass.subjects.map((subject) => (
                        <label key={subject.code} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={picked.includes(subject.code)}
                            onChange={() => toggle(subject.code)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">{subject.name}</span>
                            <span className="text-xs text-slate-500">{subject.code}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button type="button" onClick={save} loading={saving} disabled={!picked.length} className="bg-teal-700 hover:bg-teal-800">
                      {saving ? t("marksAccess.saving") : t("marksAccess.save")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-sm font-bold text-slate-900">{t("marksAccess.current")}</h2>
              {!staffId ? null : !grouped.length ? (
                <p className="text-sm text-slate-500">{t("marksAccess.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {grouped.map((group) => (
                    <article key={group.classId} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-900">{group.className}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => removeClass(group.classId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("marksAccess.remove")}
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.codes.map((code) => (
                          <span key={code} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                            {subjectName(group.classId, code)}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
