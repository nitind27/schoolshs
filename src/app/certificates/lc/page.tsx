"use client";

import { useState, useCallback, useEffect, Suspense, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { LeavingCertificateView, type LCData } from "@/components/certificates/leaving-certificate";
import { formatToday } from "@/lib/certificates/date-to-words";
import { SAMPLE_LC } from "@/lib/certificates/sample-data";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { useT } from "@/i18n/locale-provider";
import { studentShortNameGu } from "@/lib/student-names";

function LCContent() {
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
  const [lcData, setLcData] = useState<LCData | null>(null);
  const [extra, setExtra] = useState({
    reason: "Further Education",
    progress: "Good",
    conduct: "Good",
    leavingDate: "",
    sscExam: "2026",
    sscSeatNo: "",
  });
  const autoLoadedRef = useRef(false);

  const lockedLabel = useMemo(() => {
    const s = students.find((x) => x.id === lockedStudentId) || lcData?.student;
    if (!s) return "";
    const name = studentShortNameGu(s as { firstName: string; surname: string });
    const gr = s.grNumber ? `GR ${s.grNumber}` : "";
    return [gr, name].filter(Boolean).join(" · ");
  }, [students, lcData, lockedStudentId]);

  const showPreview = useCallback(() => {
    setSource("preview");
    setExtra({
      reason: SAMPLE_LC.reason || "Further Education",
      progress: SAMPLE_LC.progress || "Good",
      conduct: SAMPLE_LC.conduct || "Good",
      leavingDate: SAMPLE_LC.leavingDate || "",
      sscExam: SAMPLE_LC.sscExam || "2026",
      sscSeatNo: SAMPLE_LC.sscSeatNo || "",
    });
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
      if (sid) setFilters((f) => ({ ...f, studentId: sid }));
    }
  }, [
    filters.classId,
    filters.standard,
    filters.section,
    filters.studentId,
    lockedStudentId,
    extra,
  ]);

  useEffect(() => {
    if (!lockedStudentId || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    void load();
  }, [lockedStudentId, load]);

  const displayData = source === "preview" ? SAMPLE_LC : lcData;
  const isPreview = source === "preview";

  return (
    <CertificatePrintShell
      title={t("certificates.lcTitle")}
      isPreview={isPreview}
      onPreview={showPreview}
      onExitPreview={() => setSource(lcData ? "live" : "none")}
      canPrint={!!displayData}
      printMargin="6mm"
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
      <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <DateField
            label={t("certificates.leavingDate")}
            value={extra.leavingDate}
            onChange={(v) => setExtra({ ...extra, leavingDate: v })}
            outputFormat="dmy-slash"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.reason")}</label>
          <Input value={extra.reason} onChange={(e) => setExtra({ ...extra, reason: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.progress")}</label>
          <Input value={extra.progress} onChange={(e) => setExtra({ ...extra, progress: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.conduct")}</label>
          <Input value={extra.conduct} onChange={(e) => setExtra({ ...extra, conduct: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.sscExam")}</label>
          <Input
            value={extra.sscExam}
            onChange={(e) => setExtra({ ...extra, sscExam: e.target.value })}
            placeholder="2026"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("certificates.sscSeatNo")}</label>
          <Input
            value={extra.sscSeatNo}
            onChange={(e) => setExtra({ ...extra, sscSeatNo: e.target.value })}
            placeholder="Seat No."
          />
        </div>
      </div>
      {displayData ? (
        <LeavingCertificateView
          data={
            source === "preview"
              ? SAMPLE_LC
              : {
                  ...displayData,
                  leavingDate: extra.leavingDate || displayData.leavingDate,
                  reason: extra.reason,
                  progress: extra.progress,
                  conduct: extra.conduct,
                  sscExam: extra.sscExam,
                  sscSeatNo: extra.sscSeatNo,
                }
          }
        />
      ) : (
        <p className="no-print text-slate-500 text-center py-12">{t("certificates.previewOrLoad")}</p>
      )}
    </CertificatePrintShell>
  );
}

export default function LCPage() {
  return (
    <Suspense>
      <LCContent />
    </Suspense>
  );
}
