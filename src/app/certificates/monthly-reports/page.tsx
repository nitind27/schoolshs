"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { MonthlyReportsView } from "@/components/certificates/monthly-reports";
import {
  SAMPLE_SCHOLARSHIP, SAMPLE_ADMISSIONS, SAMPLE_LEAVERS,
} from "@/lib/certificates/sample-data";
import type { ScholarshipReportRow, AdmissionReportRow, LeaverReportRow } from "@/lib/certificates/types";
import { ENGLISH_MONTHS } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";

function MonthlyReportsContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
  });
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [scholarship, setScholarship] = useState<ScholarshipReportRow[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionReportRow[]>([]);
  const [leavers, setLeavers] = useState<LeaverReportRow[]>([]);

  const showPreview = useCallback(() => setSource("preview"), []);

  useEffect(() => {
    if (searchParams.get("preview") === "1") showPreview();
  }, [searchParams, showPreview]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "monthly-reports", month: filters.month, year: filters.year });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    setScholarship(data.scholarship || []);
    setAdmissions(data.admissions || []);
    setLeavers(data.leavers || []);
    setSource("live");
  }, [filters]);

  const monthLabel = ENGLISH_MONTHS[parseInt(filters.month, 10) - 1] || filters.month;
  const isPreview = source === "preview";
  const hasData = source === "preview" || scholarship.length > 0 || admissions.length > 0;

  return (
    <CertificatePrintShell
      title={t("certificates.reportsTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(scholarship.length > 0 || admissions.length > 0 ? "live" : "none")}
      canPrint={hasData}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showMonth />
      {hasData ? (
        <MonthlyReportsView
          scholarship={isPreview ? SAMPLE_SCHOLARSHIP : scholarship}
          admissions={isPreview ? SAMPLE_ADMISSIONS : admissions}
          leavers={isPreview ? SAMPLE_LEAVERS : leavers}
          month={monthLabel}
          year={filters.year}
        />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function MonthlyReportsPage() {
  return <Suspense><MonthlyReportsContent /></Suspense>;
}
