"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { CharacterCertificateView } from "@/components/certificates/character-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_CHARACTER } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";

function CharacterContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: "1", year: String(new Date().getFullYear()),
  });
  const [students, setStudents] = useState<{ id: string; firstName: string; surname: string; grNumber?: string | null }[]>([]);
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [liveStudent, setLiveStudent] = useState<typeof SAMPLE_CHARACTER.student | null>(null);
  const [examName, setExamName] = useState("GSEB S.S.C.");
  const [examResult, setExamResult] = useState("First Trial");
  const [issueDate, setIssueDate] = useState(formatToday());

  const showPreview = useCallback(() => {
    setSource("preview");
    setExamName(SAMPLE_CHARACTER.examName);
    setExamResult(SAMPLE_CHARACTER.examResult);
    setIssueDate(SAMPLE_CHARACTER.issueDate);
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
      setLiveStudent(s);
      setSource("live");
    }
  }, [filters]);

  const student = source === "preview" ? SAMPLE_CHARACTER.student : liveStudent;
  const grNumber = source === "preview" ? SAMPLE_CHARACTER.grNumber : liveStudent?.grNumber || undefined;
  const isPreview = source === "preview";

  return (
    <CertificatePrintShell
      landscape
      title={t("certificates.characterTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(liveStudent ? "live" : "none")}
      canPrint={!!student}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showStudent students={students} />
      <div className="no-print grid gap-4 sm:grid-cols-3 mb-6">
        <div><label className="text-sm font-medium">{t("certificates.examName")}</label>
          <Input value={examName} onChange={(e) => setExamName(e.target.value)} /></div>
        <div><label className="text-sm font-medium">{t("certificates.examResult")}</label>
          <Input value={examResult} onChange={(e) => setExamResult(e.target.value)} /></div>
        <div><label className="text-sm font-medium">{t("certificates.issueDate")}</label>
          <Input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
      </div>
      {student ? (
        <CharacterCertificateView
          student={student}
          grNumber={grNumber}
          academicYear={filters.academicYear}
          examName={examName}
          examResult={examResult}
          issueDate={issueDate}
        />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function CharacterPage() {
  return <Suspense><CharacterContent /></Suspense>;
}
