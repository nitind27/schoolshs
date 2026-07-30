"use client";

import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { CharacterCertificateView } from "@/components/certificates/character-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_CHARACTER } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { useT } from "@/i18n/locale-provider";
import { studentShortNameGu } from "@/lib/student-names";

function CharacterContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const lockedStudentId = searchParams.get("studentId") || "";
  const [filters, setFilters] = useState({
    classId: "",
    standard: "",
    section: "",
    academicYear: searchParams.get("academicYear") || "2025-26",
    studentId: lockedStudentId,
    month: "1",
    year: String(new Date().getFullYear()),
  });
  const [students, setStudents] = useState<
    {
      id: string;
      firstName: string;
      surname: string;
      firstNameGu?: string | null;
      surnameGu?: string | null;
      grNumber?: string | null;
    }[]
  >([]);
  const [source, setSource] = useState<"none" | "preview" | "live">("none");
  const [liveStudent, setLiveStudent] = useState<typeof SAMPLE_CHARACTER.student | null>(null);
  const [examName, setExamName] = useState("GSEB S.S.C. March 2026");
  const [examResult, setExamResult] = useState("First Trial");
  const [issueDate, setIssueDate] = useState(formatToday());
  const autoLoadedRef = useRef(false);

  const lockedLabel = useMemo(() => {
    const s = students.find((x) => x.id === lockedStudentId) || liveStudent;
    if (!s) return "";
    const name = studentShortNameGu(s as { firstName: string; surname: string });
    const gr = "grNumber" in s && s.grNumber ? `GR ${s.grNumber}` : "";
    return [gr, name].filter(Boolean).join(" · ");
  }, [students, liveStudent, lockedStudentId]);

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
    const sid = lockedStudentId || filters.studentId;
    if (sid) {
      params.set("studentId", sid);
    } else {
      if (filters.classId) params.set("classId", filters.classId);
      if (filters.standard) params.set("standard", filters.standard);
      if (filters.section) params.set("section", filters.section);
    }
    const res = await fetch(`/api/certificates?${params}`);
    const data = await res.json();
    const list = data.students || [];
    setStudents(list);
    const s = sid ? list.find((x: { id: string }) => x.id === sid) : list[0];
    if (s) {
      setLiveStudent(s);
      setSource("live");
      if (sid) setFilters((f) => ({ ...f, studentId: sid }));
    }
  }, [filters.classId, filters.standard, filters.section, filters.studentId, lockedStudentId]);

  useEffect(() => {
    if (!lockedStudentId || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    void load();
  }, [lockedStudentId, load]);

  const student = source === "preview" ? SAMPLE_CHARACTER.student : liveStudent;
  const grNumber = source === "preview" ? SAMPLE_CHARACTER.grNumber : liveStudent?.grNumber || undefined;
  const isPreview = source === "preview";

  return (
    <CertificatePrintShell
      title={t("certificates.characterTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(liveStudent ? "live" : "none")}
      canPrint={!!student}
    >
      <CertificateFilters
        value={filters}
        onChange={setFilters}
        onLoad={load}
        showStudent={!lockedStudentId}
        students={students}
        lockedStudentId={lockedStudentId || undefined}
        lockedStudentLabel={lockedLabel}
      />
      <div className="no-print grid gap-4 sm:grid-cols-3 mb-4">
        <div>
          <label className="text-sm font-medium">{t("certificates.examName")}</label>
          <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. March 2026" />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.examResult")}</label>
          <Input value={examResult} onChange={(e) => setExamResult(e.target.value)} placeholder="e.g. First Trial" />
        </div>
        <div>
          <DateField
            label={t("certificates.issueDate")}
            value={issueDate}
            onChange={setIssueDate}
            outputFormat="dmy-slash"
          />
        </div>
      </div>
      {student ? (
        <p className="no-print text-xs text-slate-500 mb-3">
          A4 Portrait · 2 certificates per page (top + bottom) · Scale 100% · Fit to page OFF
        </p>
      ) : null}
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
  return (
    <Suspense>
      <CharacterContent />
    </Suspense>
  );
}
