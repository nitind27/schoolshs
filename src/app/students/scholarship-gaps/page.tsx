"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import type { PaperGapKey } from "@/lib/scholarship-gaps";

type ClassRow = { id: string; name: string; standard: string; section: string };
type GapRow = {
  id: string;
  name: string;
  rollNumber: string;
  grNumber: string;
  standard: string;
  section: string;
  scheme: string;
  missing: PaperGapKey[];
};

export default function ScholarshipGapsPage() {
  const t = useT();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rows, setRows] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async (nextClassId: string) => {
    setLoading(true);
    try {
      const params = nextClassId ? `?classId=${encodeURIComponent(nextClassId)}` : "";
      const res = await fetch(`/api/students/scholarship-gaps${params}`);
      const data = await res.json();
      if (!res.ok) return;
      setRows(data.students || []);
      setDueDate(data.dueDate || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
    load("");
  }, [load]);

  const saveDue = async () => {
    setSaving(true);
    setNote("");
    try {
      const res = await fetch("/api/students/scholarship-gaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate }),
      });
      if (res.ok) setNote(t("paperDesk.saved"));
      else setNote((await res.json()).error || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const overdue = Boolean(dueDate) && dueDate < new Date().toISOString().slice(0, 10);

  const gapLabel = (key: PaperGapKey) => t(`paperDesk.gaps.${key}`);

  return (
    <PageShell
      title={t("paperDesk.title")}
      subtitle={t("paperDesk.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.students"), href: "/students" },
        { label: t("paperDesk.title") },
      ]}
    >
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-64">
            <Select
              label={t("paperDesk.class")}
              value={classId}
              emptyLabel={t("paperDesk.allClasses")}
              onChange={(e) => {
                setClassId(e.target.value);
                load(e.target.value);
              }}
              options={classes.map((cls) => ({
                value: cls.id,
                label: cls.name || `${cls.standard}-${cls.section}`,
              }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">{t("paperDesk.due")}</label>
            <input
              type="date"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={saveDue} disabled={saving}>
            {saving ? t("common.saving") : "Save date"}
          </Button>
          {note && <p className="text-sm text-emerald-700">{note}</p>}
        </CardContent>
      </Card>

      {overdue && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {t("paperDesk.overdue")} ({dueDate})
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
          {loading ? t("common.loading") : t("paperDesk.count", { count: rows.length })}
        </div>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{t("paperDesk.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("paperDesk.roll")}</th>
                  <th className="px-3 py-2">{t("paperDesk.gr")}</th>
                  <th className="px-3 py-2">{t("paperDesk.name")}</th>
                  <th className="px-3 py-2">{t("paperDesk.class")}</th>
                  <th className="px-3 py-2">{t("paperDesk.scheme")}</th>
                  <th className="px-3 py-2">{t("paperDesk.missing")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.rollNumber || "—"}</td>
                    <td className="px-3 py-2">{row.grNumber || "—"}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    <td className="px-3 py-2">{[row.standard, row.section].filter(Boolean).join("-") || "—"}</td>
                    <td className="px-3 py-2">{row.scheme || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.missing.map((key) => (
                          <span key={key} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                            {gapLabel(key)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/students/${row.id}/edit`} className="text-sm font-medium text-blue-700 hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
