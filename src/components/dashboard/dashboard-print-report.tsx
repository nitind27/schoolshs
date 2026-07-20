"use client";

import { useLocale, useT } from "@/i18n/locale-provider";
import type { DashboardReportData } from "@/lib/dashboard-export";
import type { ExportStudentRow } from "@/lib/dashboard-student-export";
import {
  DEFAULT_EXPORT_OPTIONS,
  type DashboardExportOptions,
} from "@/lib/dashboard-export-options";
import { cn } from "@/lib/utils";

const STUDENTS_PER_PAGE = 28;

function pct(count: number, total: number): string {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

function groupRowsByClass(students: ExportStudentRow[]): { label: string; standard: string; section: string; rows: ExportStudentRow[] }[] {
  const map = new Map<string, { label: string; standard: string; section: string; rows: ExportStudentRow[] }>();
  for (const s of students) {
    const standard = s.standard || "?";
    const section = s.section || "?";
    const key = `${standard}::${section}`;
    let g = map.get(key);
    if (!g) {
      g = { label: `${standard}-${section}`, standard, section, rows: [] };
      map.set(key, g);
    }
    g.rows.push(s);
  }
  return [...map.values()].sort((a, b) => {
    const std = Number(a.standard) - Number(b.standard);
    if (!isNaN(std) && std !== 0) return std;
    return a.section.localeCompare(b.section);
  });
}

export function DashboardPrintReport({
  report,
  students = [],
  options = DEFAULT_EXPORT_OPTIONS,
}: {
  report: DashboardReportData | null;
  students?: ExportStudentRow[];
  options?: DashboardExportOptions;
}) {
  const t = useT();
  const { locale } = useLocale();

  const labelStatus = (key: string, fallback: string) => {
    const translated = t(`status.${key}`);
    return translated !== `status.${key}` ? translated : fallback;
  };

  const labelGender = (value: string) => {
    const g = value?.trim();
    if (!g) return "";
    const keys = [g, g.toLowerCase(), g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()];
    for (const k of keys) {
      const translated = t(`gender.${k}`);
      if (translated !== `gender.${k}`) return translated;
    }
    return value;
  };

  const stdLabel = (standard: string) => t("dashboard.stdLabel", { standard });

  if (!report) return null;

  const { total, byStatus, byCategory, byStandard, byClass, byGender } = report;
  const stdTotal = byStandard.reduce((s, r) => s + r.count, 0);
  const classTotal = byClass.reduce((s, r) => s + r.count, 0);
  const showClassPage = options.classIndex && byClass.length > 12;
  const inlineClassTable = options.classIndex && byClass.length > 0 && !showClassPage && options.reportSummary;
  const classOnlyPage = options.classIndex && !options.reportSummary && byClass.length > 0;
  const studentPages = options.allStudents ? chunk(students, STUDENTS_PER_PAGE) : [];
  const classGroups = options.classSheets ? groupRowsByClass(students) : [];
  const hasAnySection =
    options.reportSummary ||
    options.classIndex ||
    (options.allStudents && students.length > 0) ||
    (options.classSheets && classGroups.length > 0);

  if (!hasAnySection) return null;

  const footerText = t("dashboard.printFooter", {
    school: report.schoolName,
    date: report.generatedAt,
  });

  return (
    <div
      className={cn("dashboard-print-root", locale === "gu" && "dashboard-print-locale-gu")}
      aria-hidden="true"
      lang={locale === "gu" ? "gu" : "en"}
    >
      {options.reportSummary && (
        <div className="dashboard-print-page">
          <header className="dashboard-print-header">
            <div>
              <p className="dashboard-print-eyebrow">{t("dashboard.printPortalName")}</p>
              <h1 className="dashboard-print-school">{report.schoolName}</h1>
              <p className="dashboard-print-subtitle">{t("dashboard.printReportTitle")}</p>
            </div>
            <div className="dashboard-print-meta">
              <p><strong>{t("dashboard.printDate")}:</strong> {report.generatedAt}</p>
              <p><strong>{t("dashboard.printFilters")}:</strong> {report.filterSummary}</p>
            </div>
          </header>

          <section className="dashboard-print-kpis">
            <div className="dashboard-print-kpi">
              <span>{t("dashboard.printTotalStudents")}</span>
              <strong>{fmt(total)}</strong>
            </div>
            <div className="dashboard-print-kpi">
              <span>{t("dashboard.printTotalClasses")}</span>
              <strong>{fmt(report.totalClasses)}</strong>
            </div>
            <div className="dashboard-print-kpi">
              <span>{t("dashboard.printTotalStaff")}</span>
              <strong>{fmt(report.totalStaff)}</strong>
            </div>
            <div className="dashboard-print-kpi">
              <span>{t("dashboard.printCompletionRate")}</span>
              <strong>{report.completionRate}%</strong>
            </div>
          </section>

          <div className="dashboard-print-grid">
            <PrintTable
              title={t("dashboard.printByStandard")}
              headers={[t("dashboard.printStandard"), t("dashboard.printStudents"), t("dashboard.printPercent")]}
              rows={byStandard.map((r) => [stdLabel(r.standard), fmt(r.count), pct(r.count, total)])}
              total={[t("dashboard.printTotal"), fmt(stdTotal), pct(stdTotal, total)]}
              noDataLabel={t("dashboard.printNoData")}
            />
            <PrintTable
              title={t("dashboard.printByCategory")}
              headers={[t("dashboard.printCategory"), t("dashboard.printStudents"), t("dashboard.printPercent")]}
              rows={byCategory.map((r) => [r.category || t("dashboard.printUnknown"), fmt(r.count), pct(r.count, total)])}
              noDataLabel={t("dashboard.printNoData")}
            />
            <PrintTable
              title={t("dashboard.printByStatus")}
              headers={[t("dashboard.printStatus"), t("dashboard.printCount"), t("dashboard.printPercent")]}
              rows={Object.entries(byStatus)
                .filter(([, c]) => c > 0)
                .map(([s, c]) => [labelStatus(s, s), fmt(c), pct(c, total)])}
              total={[t("dashboard.printTotal"), fmt(total), "100%"]}
              noDataLabel={t("dashboard.printNoData")}
            />
            <PrintTable
              title={t("dashboard.printByGender")}
              headers={[t("dashboard.printGender"), t("dashboard.printStudents"), t("dashboard.printPercent")]}
              rows={[
                [labelGender("male"), fmt(byGender.male), pct(byGender.male, byGender.total)],
                [labelGender("female"), fmt(byGender.female), pct(byGender.female, byGender.total)],
                ...(byGender.other > 0
                  ? [[labelGender("other"), fmt(byGender.other), pct(byGender.other, byGender.total)]]
                  : []),
              ]}
              total={[t("dashboard.printTotal"), fmt(byGender.total), "100%"]}
              noDataLabel={t("dashboard.printNoData")}
            />
          </div>

          {inlineClassTable && (
            <PrintTable
              title={t("dashboard.printClassBreakdown")}
              headers={[
                t("dashboard.printClass"),
                t("dashboard.printStandard"),
                t("dashboard.printDiv"),
                t("dashboard.printStudents"),
                t("dashboard.printPercent"),
              ]}
              rows={byClass.map((r) => [r.label, r.standard, r.section, fmt(r.count), pct(r.count, total)])}
              total={[t("dashboard.printTotal"), "", "", fmt(classTotal), pct(classTotal, total)]}
              full
              noDataLabel={t("dashboard.printNoData")}
            />
          )}

          {showClassPage && (
            <p className="dashboard-print-note">
              {t("dashboard.printClassContinues", { count: byClass.length })}
            </p>
          )}

          {(options.allStudents || options.classSheets) && students.length > 0 && (
            <p className="dashboard-print-note">
              {t("dashboard.printStudentsContinues", { count: students.length })}
            </p>
          )}

          {!showClassPage && !options.allStudents && !options.classSheets && (
            <footer className="dashboard-print-footer">{footerText}</footer>
          )}
        </div>
      )}

      {(classOnlyPage || showClassPage) && (
        <div className="dashboard-print-page dashboard-print-page-2">
          <header className="dashboard-print-header dashboard-print-header-compact">
            <div>
              <p className="dashboard-print-eyebrow">{report.schoolName}</p>
              <h2 className="dashboard-print-subtitle">{t("dashboard.printClassWiseCount")}</h2>
            </div>
            <div className="dashboard-print-meta">
              <p>{report.generatedAt}</p>
              <p>{report.filterSummary}</p>
            </div>
          </header>

          <PrintTable
            title={t("dashboard.printAllClasses")}
            headers={[
              t("dashboard.printSr"),
              t("dashboard.printClass"),
              t("dashboard.printStandard"),
              t("dashboard.printDiv"),
              t("dashboard.printStudents"),
              t("dashboard.printPercent"),
            ]}
            rows={byClass.map((r, i) => [
              String(i + 1),
              r.label,
              r.standard,
              r.section,
              fmt(r.count),
              pct(r.count, total),
            ])}
            total={["", t("dashboard.printTotal"), "", "", fmt(classTotal), pct(classTotal, total)]}
            full
            noDataLabel={t("dashboard.printNoData")}
          />

          {!options.allStudents && !options.classSheets && (
            <footer className="dashboard-print-footer">{footerText}</footer>
          )}
        </div>
      )}

      {studentPages.map((pageRows, pageIdx) => (
        <div key={`all-${pageIdx}`} className="dashboard-print-page dashboard-print-students-page">
          <header className="dashboard-print-header dashboard-print-header-compact">
            <div>
              <p className="dashboard-print-eyebrow">{report.schoolName}</p>
              <h2 className="dashboard-print-subtitle">
                {t("dashboard.printFilteredStudents", { filters: report.filterSummary })}
              </h2>
            </div>
            <div className="dashboard-print-meta">
              <p>{t("dashboard.printPageOf", { page: pageIdx + 1, total: studentPages.length })}</p>
              <p>{t("dashboard.printStudentsTotal", { count: students.length })}</p>
            </div>
          </header>

          <PrintTable
            title={t("dashboard.printStudentListRange", {
              from: pageIdx * STUDENTS_PER_PAGE + 1,
              to: pageIdx * STUDENTS_PER_PAGE + pageRows.length,
            })}
            headers={[
              t("dashboard.printSr"),
              t("dashboard.printName"),
              t("dashboard.printStandard"),
              t("dashboard.printDiv"),
              t("dashboard.printGrNo"),
              t("dashboard.printRoll"),
              t("dashboard.printCategory"),
              t("dashboard.printGender"),
              t("dashboard.printStatus"),
              t("dashboard.printMobile"),
            ]}
            rows={pageRows.map((s) => [
              String(s.sr),
              s.fullName,
              s.standard,
              s.section,
              s.grNumber,
              s.rollNumber,
              s.category,
              labelGender(s.gender),
              labelStatus(s.statusKey, s.status),
              s.mobileNumber,
            ])}
            full
            dense
            noDataLabel={t("dashboard.printNoData")}
          />

          {pageIdx === studentPages.length - 1 && !options.classSheets && (
            <footer className="dashboard-print-footer">{footerText}</footer>
          )}
        </div>
      ))}

      {classGroups.flatMap((group, groupIdx) => {
        const pages = chunk(group.rows, STUDENTS_PER_PAGE);
        const isLastGroup = groupIdx === classGroups.length - 1;
        return pages.map((pageRows, pageIdx) => (
          <div
            key={`${group.label}-${pageIdx}`}
            className="dashboard-print-page dashboard-print-students-page"
          >
            <header className="dashboard-print-header dashboard-print-header-compact">
              <div>
                <p className="dashboard-print-eyebrow">{report.schoolName}</p>
                <h2 className="dashboard-print-subtitle">
                  {t("dashboard.printClassStudentsTitle", {
                    class: group.label,
                    count: group.rows.length,
                  })}
                </h2>
              </div>
              <div className="dashboard-print-meta">
                <p>{t("dashboard.printPageOf", { page: pageIdx + 1, total: pages.length })}</p>
                <p>{report.filterSummary}</p>
              </div>
            </header>

            <PrintTable
              title={t("dashboard.printStudentListRange", {
                from: pageIdx * STUDENTS_PER_PAGE + 1,
                to: pageIdx * STUDENTS_PER_PAGE + pageRows.length,
              })}
              headers={[
                t("dashboard.printSr"),
                t("dashboard.printName"),
                t("dashboard.printGrNo"),
                t("dashboard.printRoll"),
                t("dashboard.printCategory"),
                t("dashboard.printGender"),
                t("dashboard.printStatus"),
                t("dashboard.printMobile"),
              ]}
              rows={pageRows.map((s, i) => [
                String(pageIdx * STUDENTS_PER_PAGE + i + 1),
                s.fullName,
                s.grNumber,
                s.rollNumber,
                s.category,
                labelGender(s.gender),
                labelStatus(s.statusKey, s.status),
                s.mobileNumber,
              ])}
              full
              dense
              noDataLabel={t("dashboard.printNoData")}
            />

            {isLastGroup && pageIdx === pages.length - 1 && (
              <footer className="dashboard-print-footer">{footerText}</footer>
            )}
          </div>
        ));
      })}
    </div>
  );
}

function PrintTable({
  title,
  headers,
  rows,
  total,
  full,
  dense,
  noDataLabel,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  total?: string[];
  full?: boolean;
  dense?: boolean;
  noDataLabel: string;
}) {
  return (
    <div
      className={
        full
          ? dense
            ? "dashboard-print-table-full dashboard-print-table-dense"
            : "dashboard-print-table-full"
          : "dashboard-print-table"
      }
    >
      <h3 className="dashboard-print-table-title">{title}</h3>
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="dashboard-print-empty">
                {noDataLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "dashboard-print-row-alt" : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 || j >= headers.length - 2 ? "dashboard-print-num" : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
          {total && (
            <tr className="dashboard-print-total-row">
              {total.map((cell, j) => (
                <td key={j} className={j >= headers.length - 2 ? "dashboard-print-num" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
