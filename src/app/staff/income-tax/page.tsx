"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { Download, Printer, Save, Landmark } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import {
  IT_80C_FIELDS,
  IT_OTHER_DED_FIELDS,
  assessmentYear,
  computeIncomeTax,
  emptyItForm,
  type ItFormData,
  type ItNumKey,
  type ItTextKey,
} from "@/lib/income-tax";
import { currentSlipFy, slipFyOptions } from "@/lib/salary-slip";
import "./income-tax.css";

const fmt = (v: number) => v.toLocaleString("en-IN");

export default function IncomeTaxPage() {
  const t = useT();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState("");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [fy, setFy] = useState(currentSlipFy());
  const [data, setData] = useState<ItFormData>(emptyItForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");

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
      setData(emptyItForm());
      return;
    }
    setLoading(true);
    fetch(`/api/staff/income-tax?staffId=${staffId}&fy=${encodeURIComponent(fy)}`)
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff || null);
        setData(d.data || emptyItForm());
        setSavedAt(null);
      })
      .finally(() => setLoading(false));
  }, [staffId, fy]);

  const c = useMemo(() => computeIncomeTax(data), [data]);

  const setNum = (key: ItNumKey, raw: string) => {
    const value = Number(raw.replace(/[^\d.-]/g, "")) || 0;
    setData((prev) => ({ ...prev, numbers: { ...prev.numbers, [key]: value } }));
    setSavedAt(null);
  };
  const setText = (key: ItTextKey, value: string) => {
    setData((prev) => ({ ...prev, texts: { ...prev.texts, [key]: value } }));
    setSavedAt(null);
  };
  const numVal = (key: ItNumKey) => data.numbers[key] || 0;

  const save = async () => {
    if (!staffId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff/income-tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, financialYear: fy, data }),
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
      const res = await fetch(`/api/staff/income-tax/export?staffId=${staffId}&fy=${encodeURIComponent(fy)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `income-tax-${staff?.employeeId || "staff"}-${fy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const numInput = (key: ItNumKey) => (
    <input
      type="text"
      inputMode="numeric"
      className="it-input"
      value={numVal(key) || ""}
      placeholder="0"
      onChange={(e) => setNum(key, e.target.value)}
    />
  );

  const textInput = (key: ItTextKey, placeholder = "") => (
    <input
      type="text"
      className="it-head-input"
      value={data.texts[key] || ""}
      placeholder={placeholder}
      onChange={(e) => setText(key, e.target.value)}
    />
  );

  const slabLabels = [
    ["3,00,000 to 6,00,000", "5%"],
    ["6,00,000 to 9,00,000", "10%"],
    ["9,00,000 to 12,00,000", "15%"],
    ["12,00,000 to 15,00,000", "20%"],
    ["> 15,00,000", "30%"],
  ];

  return (
    <PageShell
      title={t("incomeTax.title")}
      subtitle={t("incomeTax.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("incomeTax.title") },
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
        <CardContent className="p-4">
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
          <Landmark className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">{t("salarySlip.pickStaffHint")}</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-3 md:p-5">
            <div className="income-tax-area mx-auto max-w-4xl">
              {/* ── Form title ── */}
              <div className="it-form-title">
                <p className="it-t1">આવકવેરાની ગણતરી દર્શાવતું પત્રક</p>
                <p className="it-t2">નાણાંકીય વર્ષ {fy} · આકારણી વર્ષ {assessmentYear(fy)}</p>
              </div>

              {/* ── Employee header — image jaisa grid ── */}
              <table className="it-head-tbl">
                <tbody>
                  <tr>
                    <td className="it-hl">કર્મચારીનું નામ</td>
                    <td className="it-hv it-strong">{staff.firstName} {staff.lastName}</td>
                    <td className="it-hl">હોદ્દો</td>
                    <td className="it-hv">{staff.designation || "—"}</td>
                  </tr>
                  <tr>
                    <td className="it-hl">પિતાનું નામ</td>
                    <td className="it-hv">{textInput("fatherName")}</td>
                    <td className="it-hl">PAN NO</td>
                    <td className="it-hv it-strong">{staff.panNumber || "—"}</td>
                  </tr>
                  <tr>
                    <td className="it-hl">ઓફિસનું નામ</td>
                    <td className="it-hv">{schoolName || "—"}</td>
                    <td className="it-hl">જન્મ તારીખ</td>
                    <td className="it-hv">{staff.dateOfBirth || "—"}</td>
                  </tr>
                  <tr>
                    <td className="it-hl">રહેઠાણનું સરનામુ</td>
                    <td className="it-hv">{textInput("address")}</td>
                    <td className="it-hl">મોબાઇલ નંબર</td>
                    <td className="it-hv">{staff.mobileNumber || "—"}</td>
                  </tr>
                  <tr>
                    <td className="it-hl">બેંકનું નામ/શાખા</td>
                    <td className="it-hv">{textInput("bankBranch")}</td>
                    <td className="it-hl">ખાતા નં</td>
                    <td className="it-hv">{staff.bankAccount || "—"}</td>
                  </tr>
                </tbody>
              </table>

              {/* ── Main single table — image format ── */}
              <table className="it-tbl">
                <thead>
                  <tr>
                    <th className="it-no">અ.ન</th>
                    <th>વિગત</th>
                    <th className="it-amt-h">આવક</th>
                    <th className="it-amt-h">આવક</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ૧ પગારની આવક */}
                  <tr>
                    <td className="it-no">૧</td>
                    <td>પગારની આવક</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{numInput("salaryIncome")}</td>
                  </tr>
                  <tr className="it-sub">
                    <td className="it-no"></td>
                    <td>બાદ મળવાપાત્ર રકમ</td>
                    <td className="it-amt"></td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no"></td>
                    <td className="pl-6">Standard Deduction u/s 16</td>
                    <td className="it-amt">{numInput("standardDeduction")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no">૨</td>
                    <td className="pl-6">બાદ: (A) વાહનભથ્થું u/s 10 (14)</td>
                    <td className="it-amt">{numInput("vehicleAllowance")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no"></td>
                    <td className="pl-6">(A) વ્યવસાયવેરો u/s 16 (i)</td>
                    <td className="it-amt">{numInput("professionalTax")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr className="it-sum">
                    <td className="it-no"></td>
                    <td className="text-right pr-3">કુલ</td>
                    <td className="it-amt">{fmt(c.salaryDeductionsTotal)}</td>
                    <td className="it-amt">{fmt(c.incomeAfterSalaryDeductions)}</td>
                  </tr>

                  {/* ૩ મકાન લોન વ્યાજ */}
                  <tr>
                    <td className="it-no">૩</td>
                    <td>મકાન લોન વ્યાજ u/s 24 (i) (vi) Rs.2,00,000/ સુધી</td>
                    <td className="it-amt">{numInput("housingLoanInterest")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr className="it-sum">
                    <td className="it-no">૪</td>
                    <td className="text-right pr-3">કુલ (2+3)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.incomeAfterHousing)}</td>
                  </tr>

                  {/* ૫ અન્ય આવક */}
                  <tr>
                    <td className="it-no">૫</td>
                    <td>(A) NSC વ્યાજ</td>
                    <td className="it-amt">{numInput("otherIncomeNsc")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no"></td>
                    <td>(B) બચતખાતાનું વ્યાજ</td>
                    <td className="it-amt">{numInput("otherIncomeSavings")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no"></td>
                    <td>(C) ફિક્સ ડિપોઝીટ</td>
                    <td className="it-amt">{numInput("otherIncomeFd")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr>
                    <td className="it-no"></td>
                    <td>(D) અન્ય આવક</td>
                    <td className="it-amt">{numInput("otherIncomeOther")}</td>
                    <td className="it-amt"></td>
                  </tr>
                  <tr className="it-sum">
                    <td className="it-no"></td>
                    <td className="text-right pr-3">કુલ અન્ય આવક (A+B+C+D)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.otherIncomeTotal)}</td>
                  </tr>
                  <tr className="it-grand">
                    <td className="it-no">૬</td>
                    <td className="text-right pr-3">ગ્રોસ ટોટલ આવક (4+5)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.grossTotalIncome)}</td>
                  </tr>

                  {/* ૭ ડિડકશન ચેપ્ટર VI-A */}
                  <tr className="it-sub">
                    <td className="it-no">૭</td>
                    <td colSpan={3}>ડિડકશન ચેપ્ટર VI-A (80 CCC &amp; CCD Rs.1,50,000/- સુધી)</td>
                  </tr>
                  {IT_80C_FIELDS.map((f, i) => (
                    <tr key={f.key}>
                      <td className="it-no"></td>
                      <td className="pl-6">({i + 1}) {f.labelGu}</td>
                      <td className="it-amt">{numInput(f.key)}</td>
                      <td className="it-amt"></td>
                    </tr>
                  ))}
                  <tr className="it-sum it-cap">
                    <td className="it-no"></td>
                    <td className="text-right pr-3">કુલ (૧ થી ૧૪) મહત્તમ 150000 ની મર્યાદામાં</td>
                    <td className="it-amt">{fmt(c.ded80CTotal)}</td>
                    <td className="it-amt">{fmt(c.ded80CTotal)}</td>
                  </tr>
                  {IT_OTHER_DED_FIELDS.map((f) => (
                    <tr key={f.key}>
                      <td className="it-no"></td>
                      <td className="pl-6">{f.labelGu}</td>
                      <td className="it-amt">{numInput(f.key)}</td>
                      <td className="it-amt"></td>
                    </tr>
                  ))}
                  <tr className="it-sum">
                    <td className="it-no"></td>
                    <td className="text-right pr-3">કુલ (બી થી જી)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.deductionVIATotal)}</td>
                  </tr>

                  {/* ૮-૯ કરપાત્ર આવક */}
                  <tr className="it-grand">
                    <td className="it-no">૮</td>
                    <td className="text-right pr-3">ચોખ્ખી કરપાત્ર આવક (૬-૭)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.netTaxableIncome)}</td>
                  </tr>
                  <tr className="it-sum">
                    <td className="it-no">૯</td>
                    <td className="text-right pr-3">કુલ કરપાત્ર આવક પુરા દશ રૂપિયામાં</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.roundedTaxable)}</td>
                  </tr>

                  {/* ૧૦ સ્લેબ */}
                  {c.slabTaxes.map((s, i) => (
                    <tr key={i}>
                      <td className="it-no">{i === 0 ? "૧૦" : ""}</td>
                      <td>{slabLabels[i][0]}</td>
                      <td className="it-amt it-rate">{slabLabels[i][1]}</td>
                      <td className="it-amt">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                  <tr className="it-sum">
                    <td className="it-no"></td>
                    <td className="text-right pr-3">કર રાહત (87A)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.rebate87A)}</td>
                  </tr>

                  {/* ૧૧-૧૫ */}
                  <tr className="it-sum">
                    <td className="it-no">૧૧</td>
                    <td className="text-right pr-3">ભરવાપાત્ર ઇન્કમટેક્ષ</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.taxBeforeRebate - c.rebate87A)}</td>
                  </tr>
                  <tr>
                    <td className="it-no">૧૨</td>
                    <td className="text-right pr-3">એજ્યુકેશન સેસ ૪%</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.cess)}</td>
                  </tr>
                  <tr className="it-grand">
                    <td className="it-no">૧૩</td>
                    <td className="text-right pr-3">કુલ ભરવાપાત્ર ટેક્ષ (૧૧+૧૨)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(c.totalTaxPayable)}</td>
                  </tr>
                  <tr>
                    <td className="it-no">૧૪</td>
                    <td className="text-right pr-3">વર્ષ દરમ્યાન થયેલ કપાત (TDS)</td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{numInput("tdsPaid")}</td>
                  </tr>
                  <tr className={c.refundOrPayable >= 0 ? "it-refund" : "it-due"}>
                    <td className="it-no">૧૫</td>
                    <td className="text-right pr-3">
                      {c.refundOrPayable >= 0 ? "રિફંડ પાત્ર રકમ (૧૪-૧૩)" : "બાકી ભરવાપાત્ર રકમ (૧૩-૧૪)"}
                      {c.refundOrPayable > 0 && <span className="ml-2 text-[11px] font-semibold">Paid Extra TDS</span>}
                    </td>
                    <td className="it-amt"></td>
                    <td className="it-amt">{fmt(Math.abs(c.refundOrPayable))}</td>
                  </tr>
                </tbody>
              </table>

              <div className="it-sign">
                <span>કર્મચારીની સહી</span>
                <span>તારીખ: ____________</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
