"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import {
  currentSlipFy,
  emptySlipValues,
  isSlipRowEmpty,
  slipFyMonths,
  slipFyOptions,
  slipMonthLabel,
  slipValuesFromStaff,
  valuesFromSlipRow,
  type SlipFieldKey,
} from "@/lib/salary-slip";
import { formatRupee, salaryCertificateRows, salaryCertificateTotals } from "@/lib/salary-certificate";
import "@/app/ops-print.css";

type StaffPick = {
  id: string;
  employeeId?: string | null;
  firstName: string;
  lastName: string;
  firstNameGu?: string | null;
  lastNameGu?: string | null;
  designation: string;
};

type SlipPayload = {
  staff?: StaffPick & Record<string, unknown>;
  rows?: Array<{ month: number; year: number } & Record<string, unknown>>;
};

export default function SalaryCertificatePage() {
  const t = useT();
  const [staffList, setStaffList] = useState<StaffPick[]>([]);
  const [staffId, setStaffId] = useState("");
  const [fy, setFy] = useState(currentSlipFy());
  const [monthKey, setMonthKey] = useState("");
  const [payload, setPayload] = useState<SlipPayload | null>(null);
  const [useProfile, setUseProfile] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const months = useMemo(() => slipFyMonths(fy), [fy]);

  useEffect(() => {
    const first = slipFyMonths(currentSlipFy())[0];
    if (first) setMonthKey(`${first.month}-${first.year}`);
    fetch("/api/staff?limit=500")
      .then((r) => r.json())
      .then((d) => setStaffList(d.staff || []))
      .catch(() => {});
    fetch("/api/school/settings")
      .then((r) => r.json())
      .then((d) => {
        setSchoolName(d.schoolName || "");
        setSchoolAddress(d.schoolAddress || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const list = slipFyMonths(fy);
    if (!list.some((item) => `${item.month}-${item.year}` === monthKey)) {
      const now = new Date();
      const hit = list.find((item) => item.month === now.getMonth() + 1 && item.year === now.getFullYear());
      setMonthKey(`${(hit || list[0]).month}-${(hit || list[0]).year}`);
    }
  }, [fy, monthKey]);

  useEffect(() => {
    if (!staffId) {
      setPayload(null);
      return;
    }
    setLoading(true);
    setUseProfile(false);
    fetch(`/api/staff/salary-slip?staffId=${staffId}&fy=${encodeURIComponent(fy)}`)
      .then((r) => r.json())
      .then((d) => setPayload(d))
      .finally(() => setLoading(false));
  }, [staffId, fy]);

  const selected = months.find((item) => `${item.month}-${item.year}` === monthKey) || months[0];
  const savedRow = payload?.rows?.find((row) => row.month === selected?.month);
  const savedValues = savedRow ? valuesFromSlipRow(savedRow) : emptySlipValues();
  const profileValues = payload?.staff ? slipValuesFromStaff(payload.staff) : emptySlipValues();
  const slipEmpty = isSlipRowEmpty(savedValues);
  const values: Record<SlipFieldKey, number> = !slipEmpty ? savedValues : useProfile ? profileValues : savedValues;
  const rows = salaryCertificateRows(values);
  const totals = salaryCertificateTotals(values);
  const staff = payload?.staff;
  const staffName = staff
    ? [staff.firstNameGu || staff.firstName, staff.lastNameGu || staff.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <PageShell
      title={t("salaryCert.title")}
      subtitle={t("salaryCert.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("salaryCert.title") },
      ]}
      actions={
        <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!staffId || loading}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      }
    >
      <Card className="no-print">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-80">
            <Select
              label={t("salaryCert.selectStaff")}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              options={[
                { value: "", label: t("salarySlip.selectStaffPlaceholder") },
                ...staffList.map((member) => ({
                  value: member.id,
                  label: `${member.employeeId ? member.employeeId + " — " : ""}${member.firstName} ${member.lastName}`,
                })),
              ]}
            />
          </div>
          <div className="w-32">
            <Select
              label={t("salarySlip.monthYear")}
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              hideEmptyOption
              options={slipFyOptions().map((year) => ({ value: year, label: year }))}
            />
          </div>
          <div className="w-36">
            <Select
              label={t("salaryCert.selectMonth")}
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              hideEmptyOption
              options={months.map((item) => ({
                value: `${item.month}-${item.year}`,
                label: slipMonthLabel(item.month, item.year),
              }))}
            />
          </div>
          <Link href="/staff/salary-slip" className="text-sm font-medium text-blue-700 hover:underline">
            {t("salaryCert.openSlip")}
          </Link>
        </CardContent>
      </Card>

      {staffId && slipEmpty && (
        <div className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{t("salaryCert.emptySlip")}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setUseProfile(true)}>
            {t("salaryCert.useProfile")}
          </Button>
        </div>
      )}

      {staff && selected && (
        <div className="ops-print mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-4 border-b-2 border-red-700 pb-3 text-center">
            <p className="text-lg font-bold text-red-800">{schoolName || t("salaryCert.certTitle")}</p>
            {schoolAddress && <p className="text-xs text-slate-600">{schoolAddress}</p>}
            <h2 className="mt-2 text-base font-bold tracking-wide text-slate-900">{t("salaryCert.certTitle")}</h2>
          </header>
          <div className="mb-3 grid gap-1 text-sm sm:grid-cols-2">
            <p><span className="text-slate-500">{t("salaryCert.employee")}: </span>{staffName}</p>
            <p><span className="text-slate-500">{t("salaryCert.designation")}: </span>{staff.designation || "—"}</p>
            <p><span className="text-slate-500">{t("salaryCert.employeeNo")}: </span>{staff.employeeId || "—"}</p>
            <p><span className="text-slate-500">{t("salaryCert.month")}: </span>{slipMonthLabel(selected.month, selected.year)}</p>
          </div>
          {useProfile && slipEmpty && (
            <p className="mb-2 text-xs text-amber-800">{t("salaryCert.usingProfile")}</p>
          )}
          <table className="cert-table w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-800 px-2 py-1 text-center">ક્રમ</th>
                <th className="border border-slate-800 px-2 py-1 text-center">પગારની વિગત</th>
                <th className="border border-slate-800 px-2 py-1 text-center">રકમ રૂ.</th>
                <th className="border border-slate-800 px-2 py-1 text-center">કપાતની વિગત</th>
                <th className="border border-slate-800 px-2 py-1 text-center">રકમ રૂ.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.salary}-${index}`}>
                  <td className="border border-slate-800 px-2 py-1 text-center">{index + 1}</td>
                  <td className="border border-slate-800 px-2 py-1">{row.salary}</td>
                  <td className="border border-slate-800 px-2 py-1 text-right tabular-nums">{formatRupee(row.salaryAmount)}</td>
                  <td className="border border-slate-800 px-2 py-1">{row.deduction}</td>
                  <td className="border border-slate-800 px-2 py-1 text-right tabular-nums">{formatRupee(row.deductionAmount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="border border-slate-800 px-2 py-1" />
                <td className="border border-slate-800 px-2 py-1">કુલ પગાર</td>
                <td className="border border-slate-800 px-2 py-1 text-right tabular-nums">{totals.gross.toLocaleString("en-IN")}</td>
                <td className="border border-slate-800 px-2 py-1">કુલ કપાત</td>
                <td className="border border-slate-800 px-2 py-1 text-right tabular-nums">{totals.deduction.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-right text-sm font-semibold">
            {t("salaryCert.net")}: ₹ {totals.net.toLocaleString("en-IN")}
          </p>
          <div className="mt-10 flex justify-between text-xs text-slate-600">
            <span>Clerk</span>
            <span>Principal</span>
          </div>
        </div>
      )}

      {!staffId && <p className="no-print text-sm text-slate-500">{t("salaryCert.noStaff")}</p>}
    </PageShell>
  );
}
