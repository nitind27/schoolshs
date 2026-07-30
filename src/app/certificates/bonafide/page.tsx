"use client";

import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { BonafideCertificateView } from "@/components/certificates/bonafide-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_BONAFIDE } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { useT } from "@/i18n/locale-provider";
import { studentShortNameGu } from "@/lib/student-names";

function BonafideContent() {
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
  const [liveStudent, setLiveStudent] = useState<typeof SAMPLE_BONAFIDE.student | null>(null);
  const [serialNo, setSerialNo] = useState("");
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
    setSerialNo(SAMPLE_BONAFIDE.serialNo);
    setIssueDate(SAMPLE_BONAFIDE.issueDate);
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
      setSerialNo(data.serialNo || "");
      setIssueDate(formatToday());
      setSource("live");
      if (sid) setFilters((f) => ({ ...f, studentId: sid }));
    }
  }, [filters.classId, filters.standard, filters.section, filters.studentId, lockedStudentId]);

  useEffect(() => {
    if (!lockedStudentId || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    void load();
  }, [lockedStudentId, load]);

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
      <CertificateFilters
        value={filters}
        onChange={setFilters}
        onLoad={load}
        showStudent={!lockedStudentId}
        students={students}
        lockedStudentId={lockedStudentId || undefined}
        lockedStudentLabel={lockedLabel}
      />
      <div className="no-print grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="text-sm font-medium">{t("certificates.serialNo")}</label>
          <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
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
