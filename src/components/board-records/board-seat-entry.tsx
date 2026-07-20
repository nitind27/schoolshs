"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download, Upload, Save, Users, BookOpen, CheckCircle2, AlertCircle,
  ChevronRight, GraduationCap, Layers,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { formatBoardNo } from "@/lib/board-records/gseb";
import {
  type BoardClassInfo,
  classDisplayLabel,
  groupHscClassesByStream,
  groupSscClasses,
} from "@/lib/board-records/class-utils";
import { SENIOR_STREAMS } from "@/lib/constants";

interface EntryStudent {
  id: string;
  firstName: string;
  surname: string;
  rollNumber: string | null;
  grNumber: string | null;
  category: string;
  sscSeatPrefix: string | null;
  sscSeatNumber: string | null;
  hscSeatPrefix: string | null;
  hscSeatNumber: string | null;
  percentage10th: number;
  percentage12th: number | null;
  year10th: string;
  year12th: string | null;
}

interface EntryRow {
  studentId: string;
  roll: string;
  firstName: string;
  surname: string;
  grNumber: string;
  seatPrefix: string;
  seatNumber: string;
  percentage: string;
  examYear: string;
}

const SSC_SEAT_PREFIXES = ["A", "B", "C", "S", "P"];
const HSC_SEAT_PREFIXES = ["B", "E", "G", "P", "A", "C", "T", "H", "D", "S"];

function seatDigitLen(standard: "10" | "12") {
  return standard === "12" ? 6 : 7;
}

function toEntryRow(s: EntryStudent, standard: "10" | "12"): EntryRow {
  return {
    studentId: s.id,
    roll: s.rollNumber || "",
    firstName: s.firstName,
    surname: s.surname,
    grNumber: s.grNumber || "",
    seatPrefix: standard === "10" ? (s.sscSeatPrefix || "A") : (s.hscSeatPrefix || "B"),
    seatNumber: standard === "10" ? (s.sscSeatNumber || "") : (s.hscSeatNumber || ""),
    percentage: String(
      standard === "10"
        ? (s.percentage10th > 0 ? s.percentage10th : "")
        : (s.percentage12th && s.percentage12th > 0 ? s.percentage12th : "")
    ),
    examYear: standard === "10" ? (s.year10th || "2025") : (s.year12th || "2025"),
  };
}

const STREAM_COLORS: Record<string, string> = {
  Arts: "from-rose-500 to-pink-600 border-rose-300",
  Commerce: "from-amber-500 to-orange-600 border-amber-300",
  Science: "from-violet-500 to-purple-600 border-violet-300",
  General: "from-slate-500 to-slate-600 border-slate-300",
};

export function BoardSeatEntry({
  standard,
  onSaved,
}: {
  standard: "10" | "12";
  onSaved?: () => void;
}) {
  const t = useT();
  const [overview, setOverview] = useState<{ classes: BoardClassInfo[] } | null>(null);
  const [selectedStream, setSelectedStream] = useState("");
  const [classId, setClassId] = useState("");
  const [classInfo, setClassInfo] = useState<{
    name: string; standard: string; section: string; stream: string; studentCount: number;
  } | null>(null);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isHsc = standard === "12";
  const step = !classId ? (isHsc && !selectedStream ? 1 : 2) : 3;

  useEffect(() => {
    setSelectedStream("");
    setClassId("");
    setClassInfo(null);
    setRows([]);
    setMessage(null);
    fetch("/api/board-records/overview")
      .then((r) => r.json())
      .then((d) => setOverview(standard === "10" ? d.ssc : d.hsc))
      .catch(() => setOverview(null));
  }, [standard]);

  const classes = overview?.classes || [];
  const sscDivisions = useMemo(() => groupSscClasses(classes), [classes]);
  const hscStreams = useMemo(() => groupHscClassesByStream(classes), [classes]);

  const streamClasses = useMemo(() => {
    if (!selectedStream) return [];
    return hscStreams.find((s) => s.stream === selectedStream)?.classes || [];
  }, [hscStreams, selectedStream]);

  const loadClass = useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      setClassInfo(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/board-records/entry?classId=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const std = data.class.standard as "10" | "12";
      setClassInfo({
        name: data.class.name,
        standard: data.class.standard,
        section: data.class.section,
        stream: data.class.stream || "",
        studentCount: data.class.studentCount,
      });
      setRows((data.students || []).map((s: EntryStudent) => toEntryRow(s, std)));
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Load failed" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (classId) loadClass(classId);
  }, [classId, loadClass]);

  const selectClass = (id: string, stream?: string) => {
    if (stream) setSelectedStream(stream);
    setClassId(id);
  };

  const goBack = () => {
    if (step === 3) {
      setClassId("");
      setClassInfo(null);
      setRows([]);
    } else if (step === 2 && isHsc) {
      setSelectedStream("");
    }
  };

  const updateRow = (idx: number, field: keyof EntryRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      let v = value;
      if (field === "seatPrefix") v = value.toUpperCase().slice(0, 1);
      if (field === "seatNumber") v = value.replace(/\D/g, "").slice(0, seatDigitLen(standard));
      next[idx] = { ...next[idx], [field]: v };
      return next;
    });
  };

  const saveAll = async () => {
    if (!classId || !classInfo) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/board-records/entry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          standard: classInfo.standard,
          rows: rows.map((r) => ({
            studentId: r.studentId,
            seatPrefix: r.seatPrefix,
            seatNumber: r.seatNumber,
            percentage: r.percentage === "" ? null : Number(r.percentage),
            examYear: r.examYear,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage({ type: "ok", text: t("boardRecords.entrySaved", { count: data.updated }) });
      onSaved?.();
      loadClass(classId);
      fetch("/api/board-records/overview").then((r) => r.json()).then((d) => setOverview(standard === "10" ? d.ssc : d.hsc));
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const downloadExcel = () => {
    if (!classId) return;
    window.open(`/api/board-records/export?classId=${classId}`, "_blank");
  };

  const uploadExcel = async (file: File) => {
    if (!classId || !classInfo) return;
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("classId", classId);
    fd.append("standard", classInfo.standard);
    try {
      const res = await fetch("/api/board-records/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMessage({ type: "ok", text: t("boardRecords.excelImported", { count: data.updated }) });
      onSaved?.();
      loadClass(classId);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const digitLen = seatDigitLen(standard);
  const seatPrefixes = isHsc ? HSC_SEAT_PREFIXES : SSC_SEAT_PREFIXES;
  const filledSeats = rows.filter((r) => r.seatNumber.length === digitLen).length;
  const displayStep = isHsc ? step : Math.max(1, step - 1);

  const steps = isHsc
    ? [t("boardRecords.stepStream"), t("boardRecords.stepDivision"), t("boardRecords.stepEntry")]
    : [t("boardRecords.stepDivision"), t("boardRecords.stepEntry")];

  const pctCol = standard === "10" ? t("boardRecords.colPct10") : t("boardRecords.colPct12");

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((label, i) => {
            const num = i + 1;
            const current = num === displayStep;
            const done = num < displayStep;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  current ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                }`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{num}</span>
                  {label}
                </div>
              </div>
            );
          })}
          {step > 1 && (
            <button onClick={goBack} className="ml-auto text-xs font-semibold text-slate-500 hover:text-blue-600">
              ← {t("boardRecords.goBack")}
            </button>
          )}
        </div>
      </div>

      {/* Step 1 HSC: Stream selection */}
      {isHsc && step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-800">{t("boardRecords.selectStream")}</p>
          {hscStreams.length === 0 ? (
            <EmptyClasses standard={standard} t={t} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hscStreams.map((sg) => {
                const grad = STREAM_COLORS[sg.stream] || STREAM_COLORS.General;
                return (
                  <button
                    key={sg.stream}
                    onClick={() => setSelectedStream(sg.stream)}
                    className={`rounded-2xl border-2 p-5 text-left hover:shadow-md transition-all bg-gradient-to-br ${grad} text-white`}
                  >
                    <Layers className="h-6 w-6 mb-2 opacity-80" />
                    <p className="font-bold text-lg">{sg.label}</p>
                    <p className="text-sm opacity-90 mt-1">
                      {sg.classes.length} {t("boardRecords.divisions")} · {sg.studentCount} {t("boardRecords.students")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Division / Class selection */}
      {((isHsc && step === 2) || (!isHsc && step === 2)) && !classId && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-800">
            {isHsc
              ? t("boardRecords.selectDivisionHsc", { stream: selectedStream })
              : t("boardRecords.selectDivisionSsc")}
          </p>
          {(isHsc ? streamClasses : sscDivisions).length === 0 ? (
            <EmptyClasses standard={standard} t={t} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(isHsc ? streamClasses : sscDivisions).map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => selectClass(cls.id, isHsc ? selectedStream : undefined)}
                  className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-left hover:border-blue-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-blue-600 group-hover:scale-110 transition-transform">
                      {cls.section}
                    </span>
                    <GraduationCap className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{classDisplayLabel(cls)}</p>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      {cls.studentCount} {t("boardRecords.students")}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {cls.seatsFilled}/{cls.studentCount} {t("boardRecords.seatsShort")}
                    </span>
                  </div>
                  {cls.classTeacher && (
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{cls.classTeacher}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Entry table */}
      {step === 3 && classId && (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">{classInfo?.name}</p>
                  <p className="text-sm text-slate-600">
                    {classDisplayLabel({
                      id: classId, name: classInfo?.name || "", standard, section: classInfo?.section || "",
                      academicYear: "", stream: classInfo?.stream || "", studentCount: 0, seatsFilled: 0,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={downloadExcel} disabled={rows.length === 0}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  <Download className="h-4 w-4" /> {t("boardRecords.downloadExcel")}
                </button>
                <label className="flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {uploading ? t("boardRecords.uploading") : t("boardRecords.uploadExcel")}
                  <input type="file" accept=".xlsx,.xls" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadExcel(f); e.target.value = ""; }} />
                </label>
                <button onClick={saveAll} disabled={saving || rows.length === 0}
                  className="flex items-center gap-2 h-10 px-5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? t("boardRecords.saving") : t("boardRecords.saveAll")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-blue-200">
                <Users className="h-4 w-4 text-blue-600" />
                <strong>{classInfo?.studentCount}</strong> {t("boardRecords.students")}
              </span>
              <span className="bg-white rounded-lg px-3 py-1.5 border border-emerald-200 text-emerald-700 font-semibold">
                {filledSeats}/{rows.length} {t("boardRecords.seatsFilled")}
              </span>
              <span className="bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200 text-amber-800 text-xs">
                {t("boardRecords.excelLockHint")}
              </span>
            </div>
          </div>

          {message && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white border border-amber-200 bg-amber-50 p-12 text-center">
              <Users className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">{t("boardRecords.noStudentsInClass")}</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">{t("boardRecords.seatEntryTable")}</p>
                <p className="text-[11px] text-slate-500">{t("boardRecords.seatFormatHint")}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-blue-600">
                      {[t("boardRecords.colRoll"), t("boardRecords.colStudent"), t("boardRecords.colGr"),
                        t("boardRecords.colSeatPrefix"), t("boardRecords.colSeatNo"), t("boardRecords.colFullSeat"),
                        pctCol, t("boardRecords.colYear")].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-white uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const fullSeat = row.seatNumber.length === digitLen ? `${row.seatPrefix}${row.seatNumber}` : "";
                      const seatOk = row.seatNumber.length === digitLen;
                      return (
                        <tr key={row.studentId} className="hover:bg-blue-50/30">
                          <td className="px-3 py-2 font-semibold text-slate-600 w-14">{row.roll || idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">{row.firstName} {row.surname}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.grNumber || "—"}</td>
                          <td className="px-3 py-2 w-20">
                            <select value={row.seatPrefix} onChange={(e) => updateRow(idx, "seatPrefix", e.target.value)}
                              className="w-full h-9 rounded-lg border border-emerald-300 bg-emerald-50 text-center font-bold text-blue-700">
                              {seatPrefixes.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 w-32">
                            <input type="text" inputMode="numeric" maxLength={digitLen} placeholder={isHsc ? "123456" : "1234567"}
                              value={row.seatNumber} onChange={(e) => updateRow(idx, "seatNumber", e.target.value)}
                              className={`w-full h-9 rounded-lg border px-2 font-mono text-sm text-center ${
                                seatOk ? "border-emerald-400 bg-emerald-50" : row.seatNumber ? "border-amber-400 bg-amber-50" : "border-emerald-300 bg-emerald-50"
                              }`} />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-bold text-blue-700 w-28">
                            {fullSeat ? formatBoardNo(fullSeat) : "—"}
                          </td>
                          <td className="px-3 py-2 w-24">
                            <input type="number" min={0} max={100} step={0.01} placeholder="%"
                              value={row.percentage} onChange={(e) => updateRow(idx, "percentage", e.target.value)}
                              className="w-full h-9 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-center font-semibold" />
                          </td>
                          <td className="px-3 py-2 w-24">
                            <input type="text" value={row.examYear} onChange={(e) => updateRow(idx, "examYear", e.target.value)}
                              className="w-full h-9 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-center text-sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* No classes created */}
      {step < 3 && classes.length === 0 && (
        <EmptyClasses standard={standard} t={t} />
      )}
    </div>
  );
}

function EmptyClasses({ standard, t }: { standard: string; t: (k: string, p?: Record<string, string | number>) => string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center">
      <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="font-semibold text-slate-700">{t("boardRecords.noClassesForStd", { std: standard })}</p>
      <p className="text-sm text-slate-500 mt-1">{t("boardRecords.createClassFirst")}</p>
      {standard === "12" && (
        <p className="text-xs text-violet-600 mt-2 font-medium">
          {SENIOR_STREAMS.join(" · ")} — {t("boardRecords.streamHint")}
        </p>
      )}
    </div>
  );
}
