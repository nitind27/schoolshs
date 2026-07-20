"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { Download, Printer, Save, FileText } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import {
  SLIP_ALL_FIELDS,
  SLIP_DEDUCTION_FIELDS,
  SLIP_SALARY_FIELDS,
  currentSlipFy,
  emptySlipValues,
  grossPay,
  netPay,
  slipFyMonths,
  slipFyOptions,
  slipMonthLabel,
  totalDeduction,
  type SlipFieldKey,
} from "@/lib/salary-slip";
import { registerDates } from "@/lib/staff-register";
import "./salary-slip.css";

type Grid = Record<number, Record<SlipFieldKey, number>>; // month -> values

interface ApiRow {
  month: number;
  year: number;
  [key: string]: unknown;
}

const fmt = (n: number) => (n ? n.toLocaleString("en-IN") : "0");

export default function SalarySlipPage() {
  const t = useT();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [fy, setFy] = useState(currentSlipFy());
  const [grid, setGrid] = useState<Grid>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");

  const months = useMemo(() => slipFyMonths(fy), [fy]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSchoolName(d?.user?.schoolName || ""))
      .catch(() => {});
    fetch("/api/staff?limit=500")
      .then((r) => r.json())
      .then((d) => setStaffList(d.staff || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!staffId) {
      setStaff(null);
      setGrid({});
      return;
    }
    setLoading(true);
    fetch(`/api/staff/salary-slip?staffId=${staffId}&fy=${encodeURIComponent(fy)}`)
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff || null);
        const next: Grid = {};
        for (const row of (d.rows || []) as ApiRow[]) {
          const values = emptySlipValues();
          for (const f of SLIP_ALL_FIELDS) values[f.key] = Number(row[f.key]) || 0;
          next[row.month] = values;
        }
        setGrid(next);
        setSavedAt(null);
      })
      .finally(() => setLoading(false));
  }, [staffId, fy]);

  const getValues = useCallback(
    (month: number) => grid[month] || emptySlipValues(),
    [grid],
  );

  const update = (month: number, key: SlipFieldKey, raw: string) => {
    const num = Number(raw.replace(/[^\d.-]/g, "")) || 0;
    setGrid((prev) => ({ ...prev, [month]: { ...getValues(month), [key]: num } }));
    setSavedAt(null);
  };

  const totals = useMemo(() => {
    const out = emptySlipValues();
    for (const { month } of months) {
      const v = getValues(month);
      for (const f of SLIP_ALL_FIELDS) out[f.key] += v[f.key];
    }
    return out;
  }, [months, getValues]);

  const { retireDate } = useMemo(
    () => registerDates(staff?.dateOfBirth, staff?.dateOfJoining),
    [staff],
  );

  const save = async () => {
    if (!staffId) return;
    setSaving(true);
    try {
      const rows = months.map(({ month, year }) => ({ month, year, values: getValues(month) }));
      const res = await fetch("/api/staff/salary-slip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, financialYear: fy, rows }),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString("en-IN"));
      else alert((await res.json()).error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const downloadExcel = async () => {
    if (!staffId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/staff/salary-slip/export?staffId=${staffId}&fy=${encodeURIComponent(fy)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-slip-${staff?.employeeId || "staff"}-${fy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const detailItems: [string, string][] = staff
    ? [
        [t("salarySlip.employeeNo"), staff.employeeId || "—"],
        [t("salarySlip.bankAccount"), staff.bankAccount || "—"],
        [t("salarySlip.gpfCpf"), staff.gpfCpfNo || "—"],
        [t("salarySlip.pan"), staff.panNumber || "—"],
        [t("salarySlip.birthDate"), staff.dateOfBirth || "—"],
        [t("salarySlip.joiningDate"), staff.dateOfJoining || "—"],
        [t("salarySlip.retireDate"), retireDate || "—"],
        [t("salarySlip.aadhaar"), staff.aadhaarNumber || "—"],
        [t("salarySlip.mobile"), staff.mobileNumber || "—"],
        [t("salarySlip.designation"), staff.designation || "—"],
      ]
    : [];

  return (
    <PageShell
      title={t("salarySlip.title")}
      subtitle={t("salarySlip.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("salarySlip.title") },
      ]}
      actions={
        <>
          <Select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            options={slipFyOptions().map((y) => ({ value: y, label: y }))}
            className="w-32"
          />
          <Button size="sm" variant="outline" onClick={downloadExcel} disabled={!staffId || loading || exporting}>
            <Download className="h-4 w-4" />
            {t("dashboard.exportExcel")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!staffId || loading}>
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
          <Button size="sm" variant="success" onClick={save} disabled={!staffId || loading || saving}>
            <Save className="h-4 w-4" />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-96">
            <Select
              label={t("salarySlip.selectStaff")}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              options={[
                { value: "", label: t("salarySlip.selectStaffPlaceholder") },
                ...staffList.map((s) => ({
                  value: s.id,
                  label: `${s.employeeId ? s.employeeId + " — " : ""}${s.firstName} ${s.lastName} (${s.designation})`,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {savedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 print:hidden">
          {t("salaryStatement.savedAt", { time: savedAt })}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : !staff ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">{t("salarySlip.pickStaffHint")}</p>
        </div>
      ) : (
        <div className="salary-slip-area space-y-4">
          <div className="sl-print-header">
            <h2 className="sl-school">{schoolName}</h2>
            <p className="sl-title">
              STATEMENT OF EMPLOYEE INCOME OF SALARY &amp; ANNUAL DEDUCTION &amp; PERSONAL DETAILS — FINANCIAL YEAR: {fy}
            </p>
          </div>

          {/* Employee details header */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {staff.firstName} {staff.lastName}
                  <span className="ml-2 text-sm font-medium text-slate-500">{staff.designation}</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3 lg:grid-cols-5 sl-details">
                {detailItems.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Salary grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="sl-tbl">
                  <thead>
                    <tr className="sl-group-row">
                      <th rowSpan={2} className="sl-month">{t("salarySlip.monthYear")}</th>
                      <th colSpan={SLIP_SALARY_FIELDS.length + 1} className="sl-group sl-group-salary">
                        {t("salarySlip.salary")}
                      </th>
                      <th colSpan={SLIP_DEDUCTION_FIELDS.length + 1} className="sl-group sl-group-ded">
                        {t("salarySlip.deduction")}
                      </th>
                      <th rowSpan={2} className="sl-net">NET PAY</th>
                    </tr>
                    <tr>
                      {SLIP_SALARY_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th className="sl-gross">GROSS PAY</th>
                      {SLIP_DEDUCTION_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th className="sl-gross">TOTAL DEDU.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map(({ month, year }) => {
                      const values = getValues(month);
                      return (
                        <tr key={month}>
                          <td className="sl-month">{slipMonthLabel(month, year)}</td>
                          {SLIP_SALARY_FIELDS.map((f) => (
                            <td key={f.key}>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="sl-input"
                                value={values[f.key] || ""}
                                placeholder="0"
                                onChange={(e) => update(month, f.key, e.target.value)}
                              />
                            </td>
                          ))}
                          <td className="sl-gross">{fmt(grossPay(values))}</td>
                          {SLIP_DEDUCTION_FIELDS.map((f) => (
                            <td key={f.key}>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="sl-input"
                                value={values[f.key] || ""}
                                placeholder="0"
                                onChange={(e) => update(month, f.key, e.target.value)}
                              />
                            </td>
                          ))}
                          <td className="sl-gross">{fmt(totalDeduction(values))}</td>
                          <td className="sl-net">{fmt(netPay(values))}</td>
                        </tr>
                      );
                    })}
                    <tr className="sl-total-row">
                      <td className="sl-month">TOTAL</td>
                      {SLIP_SALARY_FIELDS.map((f) => (
                        <td key={f.key}>{fmt(totals[f.key])}</td>
                      ))}
                      <td className="sl-gross">{fmt(grossPay(totals))}</td>
                      {SLIP_DEDUCTION_FIELDS.map((f) => (
                        <td key={f.key}>{fmt(totals[f.key])}</td>
                      ))}
                      <td className="sl-gross">{fmt(totalDeduction(totals))}</td>
                      <td className="sl-net">{fmt(netPay(totals))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
