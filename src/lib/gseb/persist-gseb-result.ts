import type { GsebResult } from "./gseb-shared";
import { parseSeatForStandard } from "./fetch-gseb";
import type { BoardResultListConfig } from "@/lib/board-records/result-list-config";
import { mergeBoardResultJson } from "@/lib/board-records/result-list-config";
import { gsebGrade } from "@/lib/board-records/gseb";

export function mapGsebSubjectsToConfig(
  result: GsebResult,
  config: BoardResultListConfig,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const sub of config.subjects) {
    out[sub.code] = result.subjects[sub.code] ?? null;
  }
  return out;
}

export function buildGsebResultJson(result: GsebResult, config: BoardResultListConfig): string {
  const subjects = mapGsebSubjectsToConfig(result, config);
  const subVals = Object.values(subjects).filter((v) => v != null) as number[];
  const totalMarks =
    result.totalMarks ?? (subVals.length ? subVals.reduce((a, b) => a + b, 0) : null);
  const pct = result.percentage;
  const grade = result.grade || (pct != null ? gsebGrade(pct).label : null);

  return mergeBoardResultJson(null, {
    subjects,
    totalMarks,
    rankScore: pct,
    grade: grade !== "—" ? grade : null,
    result: result.result,
    studentName: result.studentName,
    schoolName: result.schoolName,
    seatNo: result.seatNo,
    percentage: pct,
    fetchedAt: new Date().toISOString(),
  });
}

export function studentUpdateFromGseb(
  standard: "10" | "12",
  result: GsebResult,
  config: BoardResultListConfig,
): Record<string, unknown> {
  const pct = result.percentage;
  const data: Record<string, unknown> = {
    gsebResultJson: buildGsebResultJson(result, config),
    gsebFetchedAt: new Date(),
  };

  if (standard === "10") {
    data.sscSeatPrefix = result.prefix;
    data.sscSeatNumber = result.number;
    if (pct != null && Number.isFinite(pct)) data.percentage10th = pct;
    data.board10th = "GSEB";
  } else {
    data.hscSeatPrefix = result.prefix;
    data.hscSeatNumber = result.number;
    if (pct != null && Number.isFinite(pct)) data.percentage12th = pct;
    data.board12th = "GSEB";
  }

  return data;
}

export function resolveGsebStandard(
  student: {
    standard?: string | null;
    hscSeatNumber?: string | null;
    sscSeatNumber?: string | null;
  },
  override?: string | null,
): "10" | "12" {
  if (override === "10" || override === "12") return override;
  if (student.standard === "10" || student.standard === "12") return student.standard;
  const hsc = (student.hscSeatNumber || "").replace(/\D/g, "");
  const ssc = (student.sscSeatNumber || "").replace(/\D/g, "");
  if (hsc.length === 6 && ssc.length !== 7) return "12";
  return "10";
}

export function seatFieldsForStandard(
  student: {
    sscSeatPrefix?: string | null;
    sscSeatNumber?: string | null;
    hscSeatPrefix?: string | null;
    hscSeatNumber?: string | null;
    grNumber?: string | null;
  },
  standard: "10" | "12",
): { prefix: string; number: string } {
  const prefix =
    standard === "12"
      ? student.hscSeatPrefix || "B"
      : student.sscSeatPrefix || "A";
  let number =
    standard === "12" ? student.hscSeatNumber || "" : student.sscSeatNumber || "";

  if (!number && student.grNumber) {
    const parsed = parseSeatForStandard(student.grNumber, standard);
    if (parsed) return parsed;
  }

  return { prefix, number };
}
