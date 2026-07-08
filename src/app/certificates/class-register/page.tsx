"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { ClassRegisterView } from "@/components/certificates/class-register";
import { SAMPLE_CLASS_REGISTER, SAMPLE_CLASS_REGISTER_META } from "@/lib/certificates/sample-data";
import type { ClassRegisterRow } from "@/lib/certificates/types";
import { useT } from "@/i18n/locale-provider";

function ClassRegisterContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
  });
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [rows, setRows] = useState<ClassRegisterRow[]>([]);
  const [meta, setMeta] = useState({ month: "", standard: "", section: "" });

  const showPreview = useCallback(() => setSource("preview"), []);

  useEffect(() => {
    if (searchParams.get("preview") === "1") showPreview();
  }, [searchParams, showPreview]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "class-register", month: filters.month, year: filters.year });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    setRows(data.rows || []);
    setMeta({ month: data.month || filters.month, standard: data.standard || "", section: data.section || "" });
    setSource("live");
  }, [filters]);

  const displayRows = source === "preview" ? SAMPLE_CLASS_REGISTER : rows;
  const displayMeta = source === "preview" ? SAMPLE_CLASS_REGISTER_META : meta;

  return (
    <CertificatePrintShell
      landscape
      title={t("certificates.classRegisterTitle")}
      isPreview={source === "preview"}
      onPreview={showPreview}
      onExitPreview={() => setSource(rows.length > 0 ? "live" : "none")}
      canPrint={displayRows.length > 0}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showMonth />
      {displayRows.length > 0 ? (
        <ClassRegisterView rows={displayRows} month={displayMeta.month} standard={displayMeta.standard} section={displayMeta.section} />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function ClassRegisterPage() {
  return <Suspense><ClassRegisterContent /></Suspense>;
}
