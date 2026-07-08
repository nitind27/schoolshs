"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { LeavingCertificateView, type LCData } from "@/components/certificates/leaving-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_LC } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";

function LCContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: "1", year: String(new Date().getFullYear()),
  });
  const [students, setStudents] = useState<{ id: string; firstName: string; surname: string; grNumber?: string | null }[]>([]);
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [lcData, setLcData] = useState<LCData | null>(null);
  const [extra, setExtra] = useState({ reason: "Further Education", progress: "Good", conduct: "Good", leavingDate: "", sscExam: "2026", sscSeatNo: "" });

  const showPreview = useCallback(() => {
    setSource("preview");
    setExtra({ reason: SAMPLE_LC.reason || "Further Education", progress: SAMPLE_LC.progress || "Good", conduct: SAMPLE_LC.conduct || "Good", leavingDate: SAMPLE_LC.leavingDate || "", sscExam: SAMPLE_LC.sscExam || "2026", sscSeatNo: SAMPLE_LC.sscSeatNo || "" });
  }, []);

  useEffect(() => {
    if (searchParams.get("preview") === "1") showPreview();
  }, [searchParams, showPreview]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "students" });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    if (filters.studentId) params.set("studentId", filters.studentId);
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    setStudents(data.students || []);
    const s = filters.studentId
      ? (data.students || []).find((x: { id: string }) => x.id === filters.studentId)
      : data.students?.[0];
    if (s) {
      setLcData({
        student: s,
        serialNo: data.lcSerialNo || "",
        issueDate: formatToday(),
        leavingDate: extra.leavingDate || formatToday(),
        reason: extra.reason,
        progress: extra.progress,
        conduct: extra.conduct,
        sscExam: extra.sscExam,
        sscSeatNo: extra.sscSeatNo,
        studyingStandard: `Std ${s.standard}-${s.section}`,
      });
      setSource("live");
    }
  }, [filters, extra]);

  const displayData = source === "preview" ? SAMPLE_LC : lcData;
  const isPreview = source === "preview";

  return (
    <CertificatePrintShell
      title={t("certificates.lcTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(lcData ? "live" : "none")}
      canPrint={!!displayData}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showStudent students={students} />
      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <div><label className="text-sm font-medium">{t("certificates.leavingDate")}</label>
          <Input value={extra.leavingDate} onChange={(e) => setExtra({ ...extra, leavingDate: e.target.value })} placeholder="DD/MM/YYYY" /></div>
        <div><label className="text-sm font-medium">{t("certificates.reason")}</label>
          <Input value={extra.reason} onChange={(e) => setExtra({ ...extra, reason: e.target.value })} /></div>
        <div><label className="text-sm font-medium">{t("certificates.sscExam")}</label>
          <Input value={extra.sscExam} onChange={(e) => setExtra({ ...extra, sscExam: e.target.value })} /></div>
        <div><label className="text-sm font-medium">{t("certificates.sscSeatNo")}</label>
          <Input value={extra.sscSeatNo} onChange={(e) => setExtra({ ...extra, sscSeatNo: e.target.value })} /></div>
      </div>
      {displayData ? <LeavingCertificateView data={displayData} /> : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function LCPage() {
  return <Suspense><LCContent /></Suspense>;
}
