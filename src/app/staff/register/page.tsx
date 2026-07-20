"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Download, Printer, Users } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { RETIREMENT_AGE, registerDates } from "@/lib/staff-register";
import "./staff-register.css";

export default function StaffRegisterPage() {
  const t = useT();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/staff?limit=500").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([staffData, auth]) => {
        setStaff(staffData.staff || []);
        setSchoolName(auth?.user?.schoolName || "");
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => staff.map((s) => ({ ...s, ...registerDates(s.dateOfBirth, s.dateOfJoining) })),
    [staff],
  );

  const [exporting, setExporting] = useState(false);
  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/staff/register-export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-service-register-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const headers = [
    t("staffRegister.colEmpNo"),
    t("staffRegister.colName"),
    t("staffRegister.colDesignation"),
    t("staffRegister.colBankAccount"),
    t("staffRegister.colPan"),
    t("staffRegister.colGpfCpf"),
    t("staffRegister.colDob"),
    t("staffRegister.colJoining"),
    t("staffRegister.colRetire"),
    t("staffRegister.colMobile"),
    t("staffRegister.colAadhaar"),
    t("staffRegister.colFirstHg"),
    t("staffRegister.colSecondHg"),
    t("staffRegister.colThirdHg"),
    t("staffRegister.colQualPay"),
  ];

  return (
    <PageShell
      title={t("staffRegister.title")}
      subtitle={t("staffRegister.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffRegister.title") },
      ]}
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadExcel}
            disabled={loading || exporting || rows.length === 0}
          >
            <Download className="h-4 w-4" />
            {exporting ? t("common.loading") : t("dashboard.exportExcel")}
          </Button>
          <Button size="sm" onClick={() => window.print()} disabled={loading || rows.length === 0}>
            <Printer className="h-4 w-4" />
            {t("certificates.print")}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-slate-600 font-medium">{t("staffRegister.empty")}</p>
        </div>
      ) : (
        <div className="staff-register-area">
          <div className="sr-header">
            <h2 className="sr-school">{schoolName}</h2>
            <p className="sr-title">{t("staffRegister.printTitle")}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:overflow-visible print:rounded-none print:border-0">
            <table className="sr-tbl">
              <thead>
                <tr>
                  <th className="sr-num">#</th>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.id}>
                    <td className="sr-num">{i + 1}</td>
                    <td>{s.employeeId || "—"}</td>
                    <td className="sr-name">{s.firstName} {s.lastName}</td>
                    <td>{s.designation}</td>
                    <td>{s.bankAccount || "—"}</td>
                    <td className="sr-mono">{s.panNumber || "—"}</td>
                    <td>{s.gpfCpfNo || "—"}</td>
                    <td className="sr-date">{s.dateOfBirth || "—"}</td>
                    <td className="sr-date">{s.dateOfJoining || "—"}</td>
                    <td className="sr-date">{s.retireDate || "—"}</td>
                    <td className="sr-mono">{s.mobileNumber || "—"}</td>
                    <td className="sr-mono">{s.aadhaarNumber || "—"}</td>
                    <td className="sr-date">{s.higherGrades[0] || "—"}</td>
                    <td className="sr-date">{s.higherGrades[1] || "—"}</td>
                    <td className="sr-date">{s.higherGrades[2] || "—"}</td>
                    <td>{[s.qualification, s.payLevel].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sr-note text-xs text-slate-500 mt-2">
            {t("staffRegister.autoNote", { retire: RETIREMENT_AGE })}
          </p>
        </div>
      )}
    </PageShell>
  );
}
