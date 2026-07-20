import { CLASS_STREAMS, SENIOR_STREAMS } from "@/lib/constants";

export interface BoardClassInfo {
  id: string;
  name: string;
  standard: string;
  section: string;
  stream: string;
  academicYear: string;
  studentCount: number;
  seatsFilled: number;
  classTeacher?: string | null;
}

/** Parse stream — prefer DB field, fallback to class name */
export function parseStreamFromClassName(
  name: string,
  standard: string,
  streamField?: string | null
): string {
  if (streamField) return streamField;
  if (!["11", "12"].includes(standard)) return "";
  for (const stream of CLASS_STREAMS) {
    if (name.toLowerCase().includes(stream.toLowerCase())) return stream;
  }
  return "";
}

export function groupHscClassesByStream(classes: BoardClassInfo[]) {
  const map = new Map<string, BoardClassInfo[]>();
  for (const cls of classes) {
    const stream = cls.stream || parseStreamFromClassName(cls.name, cls.standard) || "Arts";
    if (!map.has(stream)) map.set(stream, []);
    map.get(stream)!.push(cls);
  }
  const order = [...SENIOR_STREAMS];
  return order
    .filter((s) => map.has(s))
    .map((stream) => ({
      stream,
      label: stream,
      classes: map.get(stream)!.sort((a, b) => a.section.localeCompare(b.section)),
      studentCount: map.get(stream)!.reduce((n, c) => n + c.studentCount, 0),
    }));
}

export function groupSscClasses(classes: BoardClassInfo[]) {
  return [...classes].sort((a, b) => a.section.localeCompare(b.section));
}

export function classDisplayLabel(cls: BoardClassInfo): string {
  if (cls.standard === "12" && cls.stream && cls.stream !== "General") {
    return `Std 12 ${cls.stream} — Div ${cls.section}`;
  }
  return `Std ${cls.standard} — Div ${cls.section}`;
}
