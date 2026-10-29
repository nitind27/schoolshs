"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLocale, useT } from "@/i18n/locale-provider";
import { categoryFromCaste } from "@/lib/category-inference";
import { religionLabel } from "@/lib/school-religions";
import {
  EDIT_LINK_AREA_FIELDS,
  EDIT_LINK_DATE_FIELDS,
  EDIT_LINK_LABELS,
  EDIT_LINK_SELECT_OPTIONS,
  isEditLinkBooleanField,
  isEditLinkNumberField,
  type EditLinkField,
} from "@/lib/student-edit-link";

type StudentRow = {
  id: string;
  rollNumber: string;
  name: string;
  grNumber: string;
  values: Partial<Record<EditLinkField, string>>;
};

const SELECT_LABEL: Partial<Record<EditLinkField, (value: string, lang: "en" | "gu", t: (key: string) => string) => string>> = {
  gender: (value, _lang, t) => t(`gender.${value}`) || value,
  maritalStatus: (value, _lang, t) =>
    value === "Married" ? t("studentForm.married") : value === "Unmarried" ? t("studentForm.unmarried") : value,
  residentType: (value, _lang, t) =>
    value === "Urban" ? t("studentForm.urban") : value === "Rural" ? t("studentForm.rural") : value,
  habitationType: (value, _lang, t) =>
    value === "Rent" ? t("studentForm.rent") : value === "Own" ? t("studentForm.own") : value,
  admissionType: (value, _lang, t) => {
    if (value === "Lateral") return t("studentForm.lateral");
    if (value === "Transfer") return t("studentForm.transfer");
    if (value === "Regular") return t("studentForm.regular");
    return value;
  },
};

export function StudentEditPortal({ initialCode = "" }: { initialCode?: string }) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const lang = locale === "en" ? "en" : "gu";
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [className, setClassName] = useState("");
  const [fields, setFields] = useState<EditLinkField[]>([]);
  const [religions, setReligions] = useState<string[]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`edit-link:${initialCode.toUpperCase()}`);
    if (saved && initialCode) {
      setToken(saved);
    }
  }, [initialCode]);

  useEffect(() => {
    if (!token) return;
    setBusy(true);
    fetch("/api/student-edit-link/students", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("editLink.sessionExpired"));
        setClassName(json.className || "");
        setFields(json.fields || []);
        setReligions(json.religions || []);
        setRows(json.students || []);
      })
      .catch((cause) => {
        setToken("");
        sessionStorage.removeItem(`edit-link:${code}`);
        setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("editLink.sessionExpired") });
      })
      .finally(() => setBusy(false));
  }, [token, t, code]);

  const open = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/student-edit-link/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("editLink.saveFailed"));
      sessionStorage.setItem(`edit-link:${json.code || code.toUpperCase()}`, json.token);
      if (!initialCode) router.replace(`/student-edit/${code.toUpperCase()}`);
      setToken(json.token);
      setClassName(json.className || "");
      setFields(json.fields || []);
    } catch (cause) {
      setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("editLink.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  const update = (studentId: string, field: EditLinkField, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== studentId) return row;
        const values = { ...row.values, [field]: value };
        if (field === "caste" && fields.includes("category")) {
          const suggested = categoryFromCaste({ caste: value, religion: values.religion });
          if (suggested) values.category = suggested;
        }
        return { ...row, values };
      }),
    );
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.rollNumber} ${row.name} ${row.grNumber}`.toLowerCase().includes(q));
  }, [rows, query]);

  const save = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/student-edit-link/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          students: rows.map((row) => ({ studentId: row.id, values: row.values })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("editLink.saveFailed"));
      if (json.errors?.length) {
        setMessage({ type: "err", text: json.errors[0].error || t("editLink.saveFailed") });
      } else {
        setMessage({ type: "ok", text: t("editLink.saved") });
      }
    } catch (cause) {
      setMessage({ type: "err", text: cause instanceof Error ? cause.message : t("editLink.saveFailed") });
    } finally {
      setBusy(false);
    }
  };

  const fieldLabel = (field: EditLinkField) => EDIT_LINK_LABELS[field][lang];

  return (
    <main className="min-h-screen bg-[#eef3f8] px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800">Codeat Education</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("editLink.portalTitle")}</h1>
          <p className="text-sm text-slate-500">{className || t("editLink.portalSubtitle")}</p>
        </header>

        {message ? (
          <p className={`mb-4 rounded-xl border px-3 py-2 text-sm ${message.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        ) : null}

        {!token ? (
          <form onSubmit={open} className="mx-auto max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Input label={t("editLink.linkId")} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required autoComplete="username" />
            <Input label={t("editLink.password")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            <Button type="submit" loading={busy} className="w-full bg-teal-700 hover:bg-teal-800">
              {busy ? t("editLink.opening") : t("editLink.open")}
            </Button>
          </form>
        ) : (
          <div className="space-y-3 pb-24">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("editLink.search")}
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="space-y-3 md:hidden">
              {visible.map((row, index) => (
                <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold">{row.rollNumber || index + 1}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">GR {row.grNumber || "—"}</p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {fields.map((field) => (
                      <FieldInput
                        key={field}
                        field={field}
                        label={fieldLabel(field)}
                        value={row.values[field] || ""}
                        religions={religions}
                        lang={lang}
                        onChange={(value) => update(row.id, field, value)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2">Roll</th>
                    <th className="sticky left-16 z-10 min-w-40 bg-slate-50 px-3 py-2">{t("common.name")}</th>
                    {fields.map((field) => (
                      <th key={field} className="min-w-40 px-3 py-2">{fieldLabel(field)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((row) => (
                    <tr key={row.id}>
                      <td className="sticky left-0 bg-white px-3 py-2 font-semibold">{row.rollNumber || "—"}</td>
                      <td className="sticky left-16 bg-white px-3 py-2">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-slate-500">GR {row.grNumber || "—"}</p>
                      </td>
                      {fields.map((field) => (
                        <td key={field} className="px-2 py-2 align-top">
                          <FieldInput
                            field={field}
                            value={row.values[field] || ""}
                            religions={religions}
                            lang={lang}
                            onChange={(value) => update(row.id, field, value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {token ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl justify-end">
            <Button type="button" onClick={save} loading={busy} className="w-full bg-teal-700 hover:bg-teal-800 sm:w-auto">
              <Save className="h-4 w-4" />
              {busy ? t("editLink.saving") : t("editLink.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function FieldInput({
  field,
  label,
  value,
  religions,
  lang,
  onChange,
}: {
  field: EditLinkField;
  label?: string;
  value: string;
  religions: string[];
  lang: "en" | "gu";
  onChange: (value: string) => void;
}) {
  const t = useT();
  if (isEditLinkBooleanField(field)) {
    return (
      <label className="flex min-h-10 items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={value === "true"}
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
        />
        {label ? <span className="font-medium">{label}</span> : null}
      </label>
    );
  }
  if (field === "religion") {
    const options = religions.includes(value) || !value ? religions : [value, ...religions];
    return (
      <Select
        label={label}
        value={value}
        options={options.map((item) => ({
          value: item,
          label: lang === "gu" ? religionLabel(item) : item,
        }))}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  const listed = EDIT_LINK_SELECT_OPTIONS[field];
  if (listed) {
    const options = listed.includes(value) || !value ? listed : [value, ...listed];
    const labelFor = SELECT_LABEL[field];
    return (
      <Select
        label={label}
        value={value}
        options={options.map((item) => ({
          value: item,
          label: labelFor ? labelFor(item, lang, t) : item,
        }))}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (EDIT_LINK_DATE_FIELDS.has(field)) {
    return (
      <DateField
        label={label}
        value={value}
        onChange={onChange}
        outputFormat="dmy-slash"
      />
    );
  }
  if (EDIT_LINK_AREA_FIELDS.has(field)) {
    return (
      <label className="block space-y-1 text-sm">
        {label ? <span className="font-medium text-slate-700">{label}</span> : null}
        <textarea
          value={value}
          rows={field === "notes" ? 3 : 2}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </label>
    );
  }
  return (
    <Input
      label={label}
      type={isEditLinkNumberField(field) ? "number" : "text"}
      step={field === "percentage10th" || field === "percentage12th" ? "0.01" : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
