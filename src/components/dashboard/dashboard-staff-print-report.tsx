"use client";

import { useLocale, useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export type StaffPrintOptions = {
  summary: boolean;
  register: boolean;
  payroll: boolean;
};

export type StaffPrintRow = {
  emp: string;
  name: string;
  designation: string;
  mobile: string;
};

export type StaffPayrollPrintRow = {
  name: string;
  designation: string;
  net: number;
  status: string;
};

export type StaffPrintPayload = {
  schoolName: string;
  generatedAt: string;
  period: string;
  fy: string;
  options: StaffPrintOptions;
  kpis: { label: string; value: string }[];
  designations: { label: string; value: number }[];
  staffRows: StaffPrintRow[];
  payrollRows: StaffPayrollPrintRow[];
  payrollTotals?: { net: number; paid: number; pending: number };
};

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function DashboardStaffPrintReport({ payload }: { payload: StaffPrintPayload | null }) {
  const t = useT();
  const { locale } = useLocale();
  if (!payload) return null;
  const { options } = payload;
  if (!options.summary && !options.register && !options.payroll) return null;

  const footer = t("dashboard.printFooter", {
    school: payload.schoolName,
    date: payload.generatedAt,
  });

  return (
    <div
      className={cn(
        "dashboard-print-root dashboard-print-staff",
        locale === "gu" && "dashboard-print-locale-gu",
      )}
      aria-hidden="true"
      lang={locale === "gu" ? "gu" : "en"}
    >
      {options.summary ? (
        <div className="dashboard-print-page">
          <header className="dashboard-print-header">
            <div>
              <p className="dashboard-print-eyebrow">{t("dashboard.printPortalName")}</p>
              <h1 className="dashboard-print-school">{payload.schoolName}</h1>
              <p className="dashboard-print-subtitle">{t("dashboard.reportsStaffPrintTitle")}</p>
            </div>
            <div className="dashboard-print-meta">
              <p>
                <strong>{t("dashboard.printDate")}:</strong> {payload.generatedAt}
              </p>
              <p>
                <strong>{t("dashboard.printFilters")}:</strong> {payload.period}
                {payload.fy ? ` · ${payload.fy}` : ""}
              </p>
            </div>
          </header>
          <div className="dashboard-print-kpis">
            {payload.kpis.map((k) => (
              <div key={k.label} className="dashboard-print-kpi">
                <span>{k.label}</span>
                <strong>{k.value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-print-table-full">
            <h3 className="dashboard-print-table-title">{t("dashboard.staffByDesignation")}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t("dashboard.tableLabel")}</th>
                  <th className="dashboard-print-num">{t("dashboard.tableCount")}</th>
                </tr>
              </thead>
              <tbody>
                {payload.designations.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="dashboard-print-empty">
                      {t("dashboard.noTableData")}
                    </td>
                  </tr>
                ) : (
                  payload.designations.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 1 ? "dashboard-print-row-alt" : undefined}>
                      <td>{row.label}</td>
                      <td className="dashboard-print-num">{row.value.toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="dashboard-print-footer">{footer}</p>
        </div>
      ) : null}

      {options.register ? (
        <div className="dashboard-print-page dashboard-print-page-2">
          <header className="dashboard-print-header dashboard-print-header-compact">
            <h1 className="dashboard-print-school">{t("dashboard.reportsStaffExcel")}</h1>
            <p className="dashboard-print-subtitle">{payload.schoolName}</p>
          </header>
          <div className="dashboard-print-table-full dashboard-print-table-dense">
            <h3 className="dashboard-print-table-title">{t("dashboard.shortcutAllStaff")}</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("staffRegister.colEmpNo")}</th>
                  <th>{t("staffRegister.colName")}</th>
                  <th>{t("staffRegister.colDesignation")}</th>
                  <th>{t("staffRegister.colMobile")}</th>
                </tr>
              </thead>
              <tbody>
                {payload.staffRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="dashboard-print-empty">
                      {t("dashboard.noTableData")}
                    </td>
                  </tr>
                ) : (
                  payload.staffRows.map((row, i) => (
                    <tr key={`${row.emp}-${i}`} className={i % 2 === 1 ? "dashboard-print-row-alt" : undefined}>
                      <td className="dashboard-print-num">{i + 1}</td>
                      <td>{row.emp || "—"}</td>
                      <td>{row.name}</td>
                      <td>{row.designation}</td>
                      <td>{row.mobile || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="dashboard-print-footer">{footer}</p>
        </div>
      ) : null}

      {options.payroll ? (
        <div className="dashboard-print-page dashboard-print-page-2">
          <header className="dashboard-print-header dashboard-print-header-compact">
            <h1 className="dashboard-print-school">{t("dashboard.reportsPayrollExcel")}</h1>
            <p className="dashboard-print-subtitle">
              {payload.schoolName} · {payload.period}
            </p>
          </header>
          <div className="dashboard-print-table-full dashboard-print-table-dense">
            <h3 className="dashboard-print-table-title">{t("dashboard.hrPayrollChart")}</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("staffRegister.colName")}</th>
                  <th>{t("staffRegister.colDesignation")}</th>
                  <th className="dashboard-print-num">{t("dashboard.reportsKpiNet")}</th>
                  <th>{t("dashboard.tabStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {payload.payrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="dashboard-print-empty">
                      {t("dashboard.hrPayrollEmpty")}
                    </td>
                  </tr>
                ) : (
                  payload.payrollRows.map((row, i) => (
                    <tr key={`${row.name}-${i}`} className={i % 2 === 1 ? "dashboard-print-row-alt" : undefined}>
                      <td className="dashboard-print-num">{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.designation}</td>
                      <td className="dashboard-print-num">{inr(row.net)}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {payload.payrollTotals ? (
            <p className="dashboard-print-note">
              {t("dashboard.reportsKpiNet")}: {inr(payload.payrollTotals.net)} · {t("dashboard.hrPaid")}:{" "}
              {payload.payrollTotals.paid} · {t("dashboard.hrPayPending")}: {payload.payrollTotals.pending}
            </p>
          ) : null}
          <p className="dashboard-print-footer">{footer}</p>
        </div>
      ) : null}
    </div>
  );
}
