"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Lock, Trash2 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { useLocale, useT } from "@/i18n/locale-provider";
import { studentListName } from "@/lib/student-names";
import {
  EDIT_LINK_GROUPS,
  EDIT_LINK_LABELS,
  type EditLinkField,
} from "@/lib/student-edit-link";

type ClassOption = { id: string; name: string; academicYear?: string; _count?: { students?: number } };
type PreviewStudent = {
  id: string;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  rollNumber?: string | null;
  grNumber?: string | null;
};
type LinkRow = {
  id: string;
  code: string;
  password: string;
  path: string;
  fields: EditLinkField[];
  isActive: boolean;
  createdAt: string;
  class: { name: string; academicYear: string };
};

const GROUP_LABEL: Record<string, "groupName" | "groupFamily" | "groupCommunity" | "groupContact" | "groupIds" | "groupAddress"> = {
  name: "groupName",
  family: "groupFamily",
  community: "groupCommunity",
  contact: "groupContact",
  ids: "groupIds",
  address: "groupAddress",
};

export function StudentEditLinksAdmin() {
  const t = useT();
  const { locale } = useLocale();
  const lang = locale === "en" ? "en" : "gu";
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<PreviewStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [fields, setFields] = useState<EditLinkField[]>(["caste", "category", "religion", "mobileNumber"]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [created, setCreated] = useState<LinkRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [pendingDelete, setPendingDelete] = useState("");
  const [notice, setNotice] = useState("");

  const loadLinks = useCallback(async () => {
    const res = await fetch("/api/students/edit-links");
    const json = await res.json();
    if (res.ok) setLinks(json.links || []);
  }, []);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((json) => setClasses(json.classes || []))
      .catch(() => setError(t("editLink.loadFailed")));
    loadLinks().catch(() => setError(t("editLink.loadFailed")));
  }, [loadLinks, t]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    fetch(`/api/roll-numbers?classId=${encodeURIComponent(classId)}`)
      .then((res) => res.json())
      .then((json) => setStudents(json.students || []))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [classId]);

  const label = (field: EditLinkField) => EDIT_LINK_LABELS[field][lang];

  const toggle = (field: EditLinkField) => {
    setFields((prev) => (prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]));
  };

  const shareText = (link: LinkRow) => {
    const url = `${window.location.origin}${link.path}`;
    return `${t("editLink.link")}: ${url}\n${t("editLink.linkId")}: ${link.code}\n${t("editLink.password")}: ${link.password}`;
  };

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1600);
  };

  const create = async () => {
    setError("");
    if (!classId) return;
    if (!fields.length) {
      setError(t("editLink.needFields"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/students/edit-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, fields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("editLink.createFailed"));
      setCreated(json.link);
      await loadLinks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("editLink.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/students/edit-links/${id}`, { method: "PATCH" });
    if (!res.ok) {
      setError(t("editLink.loadFailed"));
      return;
    }
    if (created?.id === id) setCreated((prev) => (prev ? { ...prev, isActive: false } : prev));
    await loadLinks();
  };

  const removeLink = async (id: string) => {
    setError("");
    const res = await fetch(`/api/students/edit-links/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("editLink.deleteFailed"));
      return;
    }
    setLinks((prev) => prev.filter((item) => item.id !== id));
    if (created?.id === id) setCreated(null);
    setPendingDelete("");
    setNotice(t("editLink.deleted"));
  };

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: item.id,
        label: `${item.name}${item.academicYear ? ` · ${item.academicYear}` : ""}`,
      })),
    [classes],
  );

  return (
    <PageShell title={t("editLink.title")} subtitle={t("editLink.subtitle")} icon={<Link2 className="h-5 w-5" />}>
      <div className="mx-auto max-w-5xl space-y-4 pb-10">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
        ) : null}

        {created ? <CredentialCard link={created} copied={copied} onCopy={copyText} shareText={shareText} /> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <Select
            label={t("editLink.selectClass")}
            value={classId}
            emptyLabel={t("editLink.chooseClass")}
            options={classOptions}
            onChange={(event) => setClassId(event.target.value)}
          />
          <div className="mt-4">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t("editLink.studentsTitle")}</h2>
                <p className="text-xs text-slate-500">{t("editLink.studentsHint")}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{students.length}</span>
            </div>
            {loadingStudents ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : !classId ? null : !students.length ? (
              <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">{t("editLink.noStudents")}</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-12 px-3 py-2">#</th>
                      <th className="w-20 px-3 py-2">Roll</th>
                      <th className="px-3 py-2">{t("common.name")}</th>
                      <th className="w-28 px-3 py-2">GR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, index) => (
                      <tr key={student.id}>
                        <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{student.rollNumber || "—"}</td>
                        <td className="px-3 py-2">{studentListName(student)}</td>
                        <td className="px-3 py-2 text-slate-600">{student.grNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("editLink.fieldsTitle")}</h2>
              <p className="text-xs text-slate-500">{t("editLink.fieldsHint")}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setFields(EDIT_LINK_GROUPS.flatMap((group) => [...group.fields]))}>
                {t("editLink.selectAll")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setFields([])}>
                {t("editLink.clearAll")}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {EDIT_LINK_GROUPS.map((group) => (
              <div key={group.id} className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t(`editLink.${GROUP_LABEL[group.id]}`)}
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.fields.map((field) => (
                    <label key={field} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm text-slate-800 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={fields.includes(field)}
                        onChange={() => toggle(field)}
                      />
                      <span className="leading-snug">{label(field)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={create} loading={busy} disabled={!classId || !students.length}>
              <Link2 className="h-4 w-4" />
              {busy ? t("editLink.creating") : t("editLink.create")}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">{t("editLink.recent")}</h2>
          {!links.length ? (
            <p className="text-sm text-slate-500">{t("editLink.noLinks")}</p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <article key={link.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{link.class.name}</p>
                      <p className="text-xs text-slate-500">
                        {link.class.academicYear} · {link.fields.length} fields · {link.isActive ? t("editLink.active") : t("editLink.closed")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {link.isActive ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => revoke(link.id)}>
                          <Lock className="h-3.5 w-3.5" />
                          {t("editLink.revoke")}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => setPendingDelete(pendingDelete === link.id ? "" : link.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("editLink.delete")}
                      </Button>
                    </div>
                  </div>
                  {pendingDelete === link.id ? (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-red-800">{t("editLink.deleteAsk")}</p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPendingDelete("")}>
                          {t("common.cancel")}
                        </Button>
                        <Button type="button" size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => removeLink(link.id)}>
                          {t("editLink.delete")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <CredentialBits link={link} copied={copied} onCopy={copyText} shareText={shareText} />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function CredentialCard({
  link,
  copied,
  onCopy,
  shareText,
}: {
  link: LinkRow;
  copied: string;
  onCopy: (key: string, text: string) => void;
  shareText: (link: LinkRow) => string;
}) {
  const t = useT();
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-bold text-emerald-900">{t("editLink.createdTitle")}</h2>
      <CredentialBits link={link} copied={copied} onCopy={onCopy} shareText={shareText} />
    </section>
  );
}

function CredentialBits({
  link,
  copied,
  onCopy,
  shareText,
}: {
  link: LinkRow;
  copied: string;
  onCopy: (key: string, text: string) => void;
  shareText: (link: LinkRow) => string;
}) {
  const t = useT();
  const url = typeof window === "undefined" ? link.path : `${window.location.origin}${link.path}`;
  const items = [
    { key: "url", label: t("editLink.link"), value: url },
    { key: "id", label: t("editLink.linkId"), value: link.code },
    { key: "password", label: t("editLink.password"), value: link.password },
  ];
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-2 rounded-xl bg-white px-3 py-2 sm:flex-row sm:items-center">
          <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-slate-900">{item.value}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => onCopy(`${link.id}-${item.key}`, item.value)}
          >
            {copied === `${link.id}-${item.key}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === `${link.id}-${item.key}` ? t("editLink.copied") : t("editLink.copy")}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-teal-800 underline-offset-2 hover:underline"
        onClick={() => onCopy(`${link.id}-all`, shareText(link))}
      >
        {copied === `${link.id}-all` ? t("editLink.copied") : t("editLink.copyAll")}
      </button>
    </div>
  );
}
