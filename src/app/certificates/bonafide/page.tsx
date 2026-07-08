"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { BonafideCertificateView } from "@/components/certificates/bonafide-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_BONAFIDE } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";

function BonafideContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    classId: "", standard: "", section: "", academicYear: "2025-26",
    studentId: "", month: "1", year: String(new Date().getFullYear()),
  });
  const [students, setStudents] = useState<{ id: string; firstName: string; surname: string; grNumber?: string | null }[]>([]);
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [liveStudent, setLiveStudent] = useState<typeof SAMPLE_BONAFIDE.student | null>(null);
  const [serialNo, setSerialNo] = useState("");
  const [issueDate, setIssueDate] = useState(formatToday());

  const showPreview = useCallback(() => {
    setSource("preview");
    setSerialNo(SAMPLE_BONAFIDE.serialNo);
    setIssueDate(SAMPLE_BONAFIDE.issueDate);
  }, []);

  useEffect(() => {
    if (searchParams.get("preview") === "1") showPreview();
  }, [searchParams, showPreview]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "students" });
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    setStudents(data.students || []);
    const s = filters.studentId
      ? (data.students || []).find((x: { id: string }) => x.id === filters.studentId)
      : data.students?.[0];
    if (s) {
      setLiveStudent(s);
      setSerialNo(data.serialNo || "");
      setIssueDate(formatToday());
      setSource("live");
    }
  }, [filters]);

  const student = source === "preview" ? SAMPLE_BONAFIDE.student : liveStudent;
  const isPreview = source === "preview";

  return (
    <CertificatePrintShell
      landscape
      title={t("certificates.bonafideTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(liveStudent ? "live" : "none")}
      canPrint={!!student}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} showStudent students={students} />
      <div className="no-print grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="text-sm font-medium">{t("certificates.serialNo")}</label>
          <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.issueDate")}</label>
          <Input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="DD/MM/YYYY" />
        </div>
      </div>
      {student ? (
        <BonafideCertificateView student={student} serialNo={serialNo} issueDate={issueDate} />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function BonafidePage() {
  return (
    <Suspense>
      <BonafideContent />
    </Suspense>
  );
}
