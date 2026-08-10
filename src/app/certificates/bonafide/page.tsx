"use client";

import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_BONAFIDE } from "@/lib/certificates/sample-data";
import { getCertificateViewForType } from "@/lib/certificates/resolve-pack";
import {
  invalidateSchoolFeaturesCache,
  useSchoolFeatures,
} from "@/components/school/use-school-features";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { useT } from "@/i18n/locale-provider";
import { studentShortNameGu } from "@/lib/student-names";

function BonafideContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const { formats, letterhead } = useSchoolFeatures();

  // Prefer Super Admin pack; for 403/404/405 always use school-code pack when default
  const packId = useMemo(() => {
    const assigned = formats?.certificates?.trim();
    if (assigned && assigned !== "default") return assigned;
    const code = (letterhead?.code || letterhead?.udiseCode || "").trim();
    if (code === "24261004403" || code === "24261004404" || code === "24261004405") {
      return code;
    }
    return assigned || "default";
  }, [formats?.certificates, letterhead?.code, letterhead?.udiseCode]);

  const BonafideCertificateView = useMemo(
    () =>
      getCertificateViewForType(packId, "bonafide") as typeof import("@/components/certificates/bonafide-certificate").BonafideCertificateView,
    [packId],
  );

  useEffect(() => {
    invalidateSchoolFeaturesCache();
  }, []);

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
  const [printCopies, setPrintCopies] = useState<1 | 2>(1);
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
  const isPrimarySongadh = packId === "24261004403" || packId === "24261004404";

  return (
    <CertificatePrintShell
      landscape
      title={t("certificates.bonafideTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(liveStudent ? "live" : "none")}
      canPrint={!!student}
      packId={packId}
      printMargin={isPrimarySongadh ? "5mm" : undefined}
    >
      <p className="no-print mb-3 text-xs text-slate-500">
        Format pack: <span className="font-mono">{packId}</span>
        {isPrimarySongadh
          ? " · Songadh Primary · full A4 · student photo"
          : null}
      </p>
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
      {student && isPrimarySongadh ? (
        <div className="no-print flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">Print copies</label>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={printCopies}
              onChange={(e) => setPrintCopies(Number(e.target.value) as 1 | 2)}
            >
              <option value={1}>1 copy — 1 A4 page</option>
              <option value={2}>2 copies — 2 A4 pages (cut &amp; keep)</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 pb-1">
            A4 Landscape · 1 full bonafide per page · Scale 100% · Fit to page OFF
          </p>
        </div>
      ) : null}
      {student ? (
        <BonafideCertificateView
          key={`bonafide-${packId}-${student.grNumber || "x"}-${printCopies}`}
          student={student}
          serialNo={serialNo}
          issueDate={issueDate}
          copies={isPrimarySongadh ? printCopies : 1}
        />
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
