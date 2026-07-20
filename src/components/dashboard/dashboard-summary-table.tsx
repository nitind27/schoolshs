"use client";

import { useState } from "react";
import { LayoutGrid, GraduationCap, BookOpen, Tags, Activity, Users } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  value: number;
  percent?: number;
  sub?: string;
}

interface Props {
  total: number;
  byStandard: Row[];
  byClass: Row[];
  byCategory: Row[];
  byStatus: Row[];
  byGender: Row[];
}

type Tab = "overview" | "standard" | "class" | "category" | "status" | "gender";

export function DashboardSummaryTable({
  total,
  byStandard,
  byClass,
  byCategory,
  byStatus,
  byGender,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; rows: Row[] }[] = [
    { id: "overview", label: t("dashboard.tabOverview"), icon: <LayoutGrid className="h-3.5 w-3.5" />, rows: [] },
    { id: "standard", label: t("dashboard.tabStandard"), icon: <GraduationCap className="h-3.5 w-3.5" />, rows: byStandard },
    { id: "class", label: t("dashboard.tabClass"), icon: <BookOpen className="h-3.5 w-3.5" />, rows: byClass },
    { id: "category", label: t("dashboard.tabCategory"), icon: <Tags className="h-3.5 w-3.5" />, rows: byCategory },
    { id: "status", label: t("dashboard.tabStatus"), icon: <Activity className="h-3.5 w-3.5" />, rows: byStatus },
    { id: "gender", label: t("dashboard.tabGender"), icon: <Users className="h-3.5 w-3.5" />, rows: byGender },
  ];

  const overviewRows: Row[] = [
    ...byStandard.slice(0, 4).map((r) => ({ ...r, sub: t("dashboard.tabStandard") })),
    ...byCategory.slice(0, 3).map((r) => ({ ...r, sub: t("dashboard.tabCategory") })),
  ];

  const activeRows = tab === "overview" ? overviewRows : tabs.find((x) => x.id === tab)?.rows || [];

  return (
    <div className="dashboard-summary">
      <div className="dashboard-summary-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn("dashboard-summary-tab", tab === item.id && "dashboard-summary-tab-active")}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id !== "overview" && item.rows.length > 0 && (
              <span className="dashboard-summary-tab-count">{item.rows.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="dashboard-summary-table">
          <thead>
            <tr>
              <th>{t("dashboard.tableLabel")}</th>
              {tab === "overview" && <th>{t("dashboard.tableSection")}</th>}
              <th className="text-right">{t("dashboard.tableCount")}</th>
              <th className="text-right">{t("dashboard.tablePercent")}</th>
              <th className="w-32">{t("dashboard.tableShare")}</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={tab === "overview" ? 5 : 4} className="py-10 text-center text-sm text-slate-400">
                  {t("dashboard.noTableData")}
                </td>
              </tr>
            ) : (
              activeRows.map((row) => {
                const pct = row.percent ?? (total > 0 ? Math.round((row.value / total) * 100) : 0);
                return (
                  <tr key={`${row.label}-${row.sub || ""}`}>
                    <td className="font-semibold text-slate-800">{row.label}</td>
                    {tab === "overview" && (
                      <td className="text-xs text-slate-500">{row.sub}</td>
                    )}
                    <td className="text-right font-bold tabular-nums text-slate-900">{row.value}</td>
                    <td className="text-right tabular-nums text-slate-500">{pct}%</td>
                    <td>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {activeRows.length > 0 && (
            <tfoot>
              <tr>
                <td className="font-bold text-slate-900">
                  {tab === "overview" ? t("dashboard.tableSample") : t("dashboard.totalLabel")}
                </td>
                {tab === "overview" && <td />}
                <td className="text-right font-bold tabular-nums">
                  {tab === "overview"
                    ? activeRows.reduce((s, r) => s + r.value, 0)
                    : activeRows.reduce((s, r) => s + r.value, 0)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
