"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

type ChangeRow = {
  id: string;
  createdAt: string;
  actorName: string;
  actorRole: string;
  kind: string;
  action: string;
  targetId: string;
  targetLabel: string;
  summary: string;
};

export default function ChangeLogPage() {
  const t = useT();
  const [kind, setKind] = useState<"all" | "student" | "marks">("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextKind: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextKind === "student" || nextKind === "marks") params.set("kind", nextKind);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/activity/changes?${params}`);
      const data = await res.json();
      setRows(res.ok ? data.changes || [] : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("all", "");
  }, [load]);

  const filters = [
    ["all", t("changeLog.all")],
    ["student", t("changeLog.student")],
    ["marks", t("changeLog.marks")],
  ] as const;

  return (
    <PageShell
      title={t("changeLog.title")}
      subtitle={t("changeLog.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("changeLog.title") },
      ]}
    >
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={kind === id ? "default" : "outline"}
            onClick={() => {
              setKind(id);
              load(id, q);
            }}
          >
            {label}
          </Button>
        ))}
        <input
          className="h-9 w-56 rounded-md border border-slate-300 px-3 text-sm"
          placeholder={t("changeLog.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load(kind, q);
          }}
        />
        <Button size="sm" variant="outline" onClick={() => load(kind, q)}>
          {t("common.search") || "Search"}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{t("changeLog.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("changeLog.when")}</th>
                  <th className="px-3 py-2">{t("changeLog.who")}</th>
                  <th className="px-3 py-2">{t("changeLog.kind")}</th>
                  <th className="px-3 py-2">{t("changeLog.what")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {new Date(row.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.actorName}</div>
                      <div className="text-xs text-slate-500">{row.actorRole}</div>
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-600">{row.kind}</td>
                    <td className="px-3 py-2">
                      <Link href={`/students/${row.targetId}`} className="font-medium text-blue-700 hover:underline">
                        {row.targetLabel}
                      </Link>
                      <p className="mt-0.5 text-slate-700">{row.summary}</p>
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
