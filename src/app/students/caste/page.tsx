"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { CATEGORIES, RELIGIONS } from "@/lib/constants";
import { categoryFromCaste } from "@/lib/category-inference";
import { religionLabel } from "@/lib/school-religions";
import { studentListName } from "@/lib/student-names";

type ClassOption = {
  id: string;
  name: string;
  standard: string;
  section: string;
  _count?: { students: number };
};

type StudentRow = {
  id: string;
  name: string;
  grNumber: string;
  rollNumber: string;
  religion: string;
  caste: string;
  category: string;
};

function classLabel(item: ClassOption) {
  const std = [item.standard, item.section].filter(Boolean).join("-");
  return item.name && item.name !== std ? `${std} · ${item.name}` : std || item.name;
}

export default function ClassCastePage() {
  const t = useT();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [saved, setSaved] = useState<Record<string, Pick<StudentRow, "religion" | "caste" | "category">>>({});
  const [castes, setCastes] = useState<string[]>([]);
  const [religions, setReligions] = useState<string[]>([...RELIGIONS]);
  const [customReligions, setCustomReligions] = useState<string[]>([]);
  const [newReligion, setNewReligion] = useState("");
  const [addingReligion, setAddingReligion] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/classes")
      .then((response) => response.json())
      .then((data) => {
        const list: ClassOption[] = data.classes || [];
        setClasses(list);
        if (list.length === 1) setClassId(list[0].id);
      })
      .catch(() => setError(t("classCaste.loadFailed")))
      .finally(() => setLoadingClasses(false));
    fetch("/api/students/castes")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.castes)) setCastes(data.castes);
      })
      .catch(() => {});
    fetch("/api/students/religions")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.religions)) setReligions(data.religions);
        if (Array.isArray(data.custom)) setCustomReligions(data.custom);
      })
      .catch(() => {});
  }, [t]);

  useEffect(() => {
    if (!classId) {
      setRows([]);
      return;
    }
    setLoadingStudents(true);
    setError("");
    setNote("");
    fetch(`/api/students?classId=${encodeURIComponent(classId)}&limit=500`)
      .then((response) => response.json())
      .then((data) => {
        const list = (data.students || []) as Array<{
          id: string;
          grNumber?: string | null;
          rollNumber?: string | null;
          religion?: string | null;
          caste?: string | null;
          category?: string | null;
          firstName: string;
          middleName?: string | null;
          surname: string;
          firstNameGu?: string | null;
          middleNameGu?: string | null;
          surnameGu?: string | null;
        }>;
        const next = list.map((student) => ({
          id: student.id,
          name: studentListName(student),
          grNumber: student.grNumber || "",
          rollNumber: student.rollNumber || "",
          religion: student.religion || "",
          caste: student.caste || "",
          category: student.category || "",
        }));
        setRows(next);
        setSaved(
          Object.fromEntries(
            next.map((row) => [
              row.id,
              { religion: row.religion, caste: row.caste, category: row.category },
            ]),
          ),
        );
      })
      .catch(() => setError(t("classCaste.loadFailed")))
      .finally(() => setLoadingStudents(false));
  }, [classId, t]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.grNumber, row.rollNumber, row.caste, row.category, row.religion]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const patchRow = (id: string, patch: Partial<StudentRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addReligion = async () => {
    const name = newReligion.trim();
    if (!name) return;
    setAddingReligion(true);
    setError("");
    setNote("");
    try {
      const response = await fetch("/api/students/religions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("classCaste.saveFailed"));
      if (Array.isArray(data.religions)) setReligions(data.religions);
      if (Array.isArray(data.custom)) setCustomReligions(data.custom);
      setNewReligion("");
      setNote(t("classCaste.religionAdded", { name: religionLabel(data.name || name) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("classCaste.saveFailed"));
    } finally {
      setAddingReligion(false);
    }
  };

  const removeReligion = async (name: string) => {
    setError("");
    setNote("");
    try {
      const response = await fetch(`/api/students/religions?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.status === 409) throw new Error(t("classCaste.religionInUse"));
      if (!response.ok) throw new Error(data.error || t("classCaste.religionInUse"));
      if (Array.isArray(data.religions)) setReligions(data.religions);
      if (Array.isArray(data.custom)) setCustomReligions(data.custom);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("classCaste.religionInUse"));
    }
  };

  const saveRow = async (row: StudentRow) => {
    setSavingId(row.id);
    setError("");
    setNote("");
    try {
      const response = await fetch(`/api/students/${row.id}/caste`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caste: row.caste,
          category: row.category,
          religion: row.religion,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("classCaste.saveFailed"));
      const next = {
        religion: data.religion || "",
        caste: data.caste || "",
        category: data.category || "",
      };
      patchRow(row.id, next);
      setSaved((prev) => ({ ...prev, [row.id]: next }));
      if (next.caste && !castes.includes(next.caste)) {
        setCastes((prev) => [...prev, next.caste].sort((a, b) => a.localeCompare(b)));
      }
      setNote(t("classCaste.saved", { name: row.name }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("classCaste.saveFailed"));
    } finally {
      setSavingId("");
    }
  };

  if (loadingClasses) return <PageLoader label={t("common.loading")} />;

  return (
    <PageShell title={t("classCaste.title")} subtitle={t("classCaste.subtitle")}>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <Select
          label={t("classCaste.selectClass")}
          value={classId}
          emptyLabel={t("classCaste.chooseClass")}
          options={classes.map((item) => ({
            value: item.id,
            label: `${classLabel(item)}${item._count ? ` (${item._count.students})` : ""}`,
          }))}
          onChange={(event) => setClassId(event.target.value)}
        />
        <Input
          label={t("classCaste.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("classCaste.searchPlaceholder")}
        />
      </div>

      <form
        className="mb-4 rounded-xl border border-slate-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void addReligion();
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("classCaste.addReligion")}
              value={newReligion}
              onChange={(event) => setNewReligion(event.target.value)}
              placeholder={t("classCaste.addReligionPlaceholder")}
            />
          </div>
          <Button type="submit" disabled={addingReligion || !newReligion.trim()}>
            {addingReligion ? t("common.loading") : t("classCaste.addReligion")}
          </Button>
        </div>
        {customReligions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {customReligions.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {religionLabel(name)}
                <button
                  type="button"
                  className="text-slate-500 hover:text-red-600"
                  onClick={() => void removeReligion(name)}
                >
                  {t("classCaste.removeReligion")}
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </form>

      {note ? <p className="mb-3 text-sm font-medium text-emerald-700">{note}</p> : null}
      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      {!classId ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          {t("classCaste.chooseClassHint")}
        </p>
      ) : loadingStudents ? (
        <PageLoader label={t("common.loading")} />
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          {t("classCaste.noStudents")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <datalist id="school-castes">
            {castes.map((caste) => (
              <option key={caste} value={caste} />
            ))}
          </datalist>
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">{t("classCaste.roll")}</th>
                <th className="px-3 py-2">{t("classCaste.student")}</th>
                <th className="px-3 py-2">{t("fields.religion")}</th>
                <th className="px-3 py-2">{t("fields.caste")}</th>
                <th className="px-3 py-2">{t("fields.category")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const base = saved[row.id];
                const dirty =
                  !base ||
                  base.religion !== row.religion ||
                  base.caste !== row.caste ||
                  base.category !== row.category;
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-500">{row.rollNumber || row.grNumber}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <Link href={`/students/${row.id}/edit`} className="text-xs font-semibold text-violet-700">
                        {t("classCaste.openProfile")}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                        value={row.religion}
                        onChange={(event) => patchRow(row.id, { religion: event.target.value })}
                      >
                        <option value="" />
                        {(religions.some((name) => name.toLowerCase() === row.religion.toLowerCase()) || !row.religion
                          ? religions
                          : [...religions, row.religion]
                        ).map((religion) => (
                          <option key={religion} value={religion}>
                            {religionLabel(religion)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        list="school-castes"
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                        value={row.caste}
                        onChange={(event) => {
                          const caste = event.target.value;
                          const nextCategory = categoryFromCaste({
                            caste,
                            religion: row.religion,
                          });
                          patchRow(row.id, {
                            caste,
                            ...(nextCategory ? { category: nextCategory } : {}),
                          });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                        value={row.category}
                        onChange={(event) => patchRow(row.id, { category: event.target.value })}
                      >
                        <option value="" />
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!dirty || savingId === row.id}
                        onClick={() => void saveRow(row)}
                      >
                        {savingId === row.id ? t("common.loading") : t("classCaste.save")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
