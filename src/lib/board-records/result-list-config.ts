/** Board result register — column layout (GSEB paper format) */

export type BoardResultSubjectDef = {
  code: string;
  label: string;
};

export type BoardResultListConfig = {
  standard: "10" | "12";
  stream?: string | null;
  subjects: BoardResultSubjectDef[];
  minRows: number;
};

export const SSC_BOARD_SUBJECTS: BoardResultSubjectDef[] = [
  { code: "GUJ", label: "ગુજરાતી" },
  { code: "ENG", label: "અંગ્રેજી" },
  { code: "HIN", label: "હિન્દી" },
  { code: "MATH", label: "ગણિત" },
  { code: "SCI", label: "વિજ્ઞાન" },
  { code: "SS", label: "સા.વિ." },
  { code: "SAN", label: "સંસ્કૃત" },
];

export const HSC_COMMERCE_SUBJECTS: BoardResultSubjectDef[] = [
  { code: "GUJ", label: "ગુજરાતી" },
  { code: "ENG", label: "અંગ્રેજી" },
  { code: "ECO", label: "અર્થ." },
  { code: "BOM", label: "વા.વ્ય." },
  { code: "STAT", label: "આંકડા" },
  { code: "ACC", label: "નામું" },
  { code: "SP", label: "એસ.પી." },
];

export const HSC_ARTS_SUBJECTS: BoardResultSubjectDef[] = [
  { code: "GUJ", label: "ગુજરાતી" },
  { code: "ENG", label: "અંગ્રેજી" },
  { code: "HIN", label: "હિન્દી" },
  { code: "HIS", label: "ઇતિહાસ" },
  { code: "GEO", label: "ભૂગોળ" },
  { code: "ECO", label: "અર્થ." },
  { code: "PSY", label: "મનો." },
];

export function getBoardResultListConfig(standard: string, stream?: string | null): BoardResultListConfig {
  if (standard === "12") {
    const subjects = stream === "Commerce" ? HSC_COMMERCE_SUBJECTS : HSC_ARTS_SUBJECTS;
    return { standard: "12", stream, subjects, minRows: 20 };
  }
  return { standard: "10", stream: null, subjects: SSC_BOARD_SUBJECTS, minRows: 20 };
}

export type BoardResultSubjectDetail = {
  board?: number | null;
  school?: number | null;
  total?: number | null;
  grade?: string | null;
};

export type BoardResultListJson = {
  subjects?: Record<string, number | null>;
  /** Board 80 / School 20 breakdown (exam result sheet register) */
  subjectsDetail?: Record<string, BoardResultSubjectDetail>;
  totalMarks?: number | null;
  rankScore?: number | null;
  grade?: string | null;
  result?: string | null;
  studentName?: string | null;
  schoolName?: string | null;
  seatNo?: string | null;
  percentage?: number | null;
  percentile?: number | null;
  fetchedAt?: string | null;
};

export function parseBoardResultJson(raw?: string | null): BoardResultListJson {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as BoardResultListJson;
  } catch {
    return {};
  }
}

export function mergeBoardResultJson(
  existing: string | null | undefined,
  patch: BoardResultListJson,
): string {
  const base = parseBoardResultJson(existing);
  return JSON.stringify({ ...base, ...patch });
}
