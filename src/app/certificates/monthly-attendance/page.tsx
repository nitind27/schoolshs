"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { MonthlyAttendancePatrakView } from "@/components/certificates/monthly-attendance-patrak";
import {
  SAMPLE_PATRAK,
  SAMPLE_CLASS_REGISTER,
  SAMPLE_ADMISSIONS,
  SAMPLE_LEAVERS,
} from "@/lib/certificates/sample-data";
import type {
  MonthlyPatrakData,
  ClassRegisterRow,
  AdmissionReportRow,
  LeaverReportRow,
} from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";

function MonthlyAttendanceContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
  });
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [patrak, setPatrak] = useState<MonthlyPatrakData | null>(null);
  const [registerRows, setRegisterRows] = useState<ClassRegisterRow[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionReportRow[]>([]);
  const [leavers, setLeavers] = useState<LeaverReportRow[]>([]);

  const showPreview = useCallback(() => setSource("preview"), []);

  useEffect(() => {
    if (searchParams.get("preview") === "1") showPreview();
  }, [searchParams, showPreview]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "patrak", month: filters.month, year: filters.year });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    setPatrak(data.patrak || null);
    setRegisterRows(data.registerRows || []);
    setAdmissions(data.admissions || []);
    setLeavers(data.leavers || []);
    setSource("live");
  }, [filters]);

  const isPreview = source === "preview";
  const displayData = isPreview ? SAMPLE_PATRAK : patrak;
  const displayRegister = isPreview ? SAMPLE_CLASS_REGISTER : registerRows;
  const displayAdmissions = isPreview ? SAMPLE_ADMISSIONS : admissions;
  const displayLeavers = isPreview ? SAMPLE_LEAVERS : leavers;

  return (
    <CertificatePrintShell
      title={t("certificates.patrakTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(patrak ? "live" : "none")}
      canPrint={!!displayData}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showMonth />
      {displayData ? (
        <MonthlyAttendancePatrakView
          data={displayData}
          registerRows={displayRegister}
          admissions={displayAdmissions}
          leavers={displayLeavers}
        />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function MonthlyAttendancePage() {
  return <Suspense><MonthlyAttendanceContent /></Suspense>;
}
