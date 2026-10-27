import { prisma } from "@/lib/db";
import { studentListName, type StudentNameLike } from "@/lib/student-names";

export type ChangeActor = {
  userId: string;
  name: string;
  role: string;
  schoolId: string;
};

type FieldKind = "text" | "secret" | "doc" | "money";

const STUDENT_FIELDS: { key: string; label: string; kind: FieldKind }[] = [
  { key: "firstName", label: "First name", kind: "text" },
  { key: "middleName", label: "Middle name", kind: "text" },
  { key: "surname", label: "Surname", kind: "text" },
  { key: "firstNameGu", label: "First name (Gujarati)", kind: "text" },
  { key: "surnameGu", label: "Surname (Gujarati)", kind: "text" },
  { key: "rollNumber", label: "Roll", kind: "text" },
  { key: "grNumber", label: "GR", kind: "text" },
  { key: "standard", label: "Standard", kind: "text" },
  { key: "section", label: "Section", kind: "text" },
  { key: "category", label: "Category", kind: "text" },
  { key: "caste", label: "Caste", kind: "text" },
  { key: "religion", label: "Religion", kind: "text" },
  { key: "mobileNumber", label: "Mobile", kind: "text" },
  { key: "email", label: "Email", kind: "text" },
  { key: "fatherName", label: "Father", kind: "text" },
  { key: "motherName", label: "Mother", kind: "text" },
  { key: "aadhaarNumber", label: "Aadhaar", kind: "secret" },
  { key: "accountNumber", label: "Bank account", kind: "secret" },
  { key: "ifscCode", label: "IFSC", kind: "text" },
  { key: "bankName", label: "Bank", kind: "text" },
  { key: "scholarshipScheme", label: "Scheme", kind: "text" },
  { key: "annualFamilyIncome", label: "Family income", kind: "money" },
  { key: "status", label: "Status", kind: "text" },
  { key: "aadhaarDocPath", label: "Aadhaar document", kind: "doc" },
  { key: "incomeCertPath", label: "Income certificate", kind: "doc" },
  { key: "casteCertPath", label: "Caste certificate", kind: "doc" },
  { key: "bankPassbookPath", label: "Bank passbook", kind: "doc" },
  { key: "photoPath", label: "Photo", kind: "doc" },
];

export type StudentChangeLine = { field: string; from: string; to: string };

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function maskSecret(value: string): string {
  const s = value.replace(/\s/g, "");
  if (!s) return "";
  if (s.length <= 4) return "••••";
  return `${s.slice(0, 2)}••••${s.slice(-2)}`;
}

function showValue(kind: FieldKind, value: unknown): string {
  if (kind === "doc") return asText(value) ? "uploaded" : "";
  if (kind === "secret") return maskSecret(asText(value));
  if (kind === "money") {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return asText(value) ? asText(value) : "";
    return String(n);
  }
  return asText(value);
}

export function studentChangeLines(
  before: object,
  after: object,
): StudentChangeLine[] {
  const prev = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const lines: StudentChangeLine[] = [];
  for (const field of STUDENT_FIELDS) {
    const from = showValue(field.kind, prev[field.key]);
    const to = showValue(field.kind, next[field.key]);
    if (from === to) continue;
    if (field.kind === "doc") {
      const had = Boolean(asText(prev[field.key]));
      const has = Boolean(asText(next[field.key]));
      lines.push({
        field: field.label,
        from: had ? "uploaded" : "—",
        to: has ? (had ? "replaced" : "uploaded") : "removed",
      });
      continue;
    }
    lines.push({ field: field.label, from: from || "—", to: to || "—" });
  }
  return lines;
}

export function studentAuditLabel(
  student: StudentNameLike & { grNumber?: string | null; rollNumber?: string | null },
): string {
  const name = studentListName(student).trim() || "Student";
  const bits = [name];
  if (student.grNumber) bits.push(`GR ${student.grNumber}`);
  else if (student.rollNumber) bits.push(`Roll ${student.rollNumber}`);
  return bits.join(" · ");
}

function clip(text: string, max = 500): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export async function writeChangeLog(entry: {
  actor: ChangeActor;
  kind: "student" | "marks";
  action: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  lines?: StudentChangeLine[];
}): Promise<void> {
  const summary = clip(entry.summary);
  if (!summary || !entry.actor.schoolId) return;
  try {
    await prisma.changeLog.create({
      data: {
        schoolId: entry.actor.schoolId,
        actorUserId: entry.actor.userId || null,
        actorName: entry.actor.name || "Staff",
        actorRole: entry.actor.role || "",
        kind: entry.kind,
        action: entry.action,
        targetId: entry.targetId,
        targetLabel: clip(entry.targetLabel, 240),
        summary,
        detailJson: entry.lines?.length ? JSON.stringify(entry.lines.slice(0, 40)) : null,
      },
    });
  } catch (error) {
    console.error("change log failed", error);
  }
}

export async function logStudentEdits(
  actor: ChangeActor,
  studentId: string,
  label: string,
  before: object,
  after: object,
): Promise<void> {
  const lines = studentChangeLines(before, after);
  if (!lines.length) return;
  const summary = lines
    .slice(0, 8)
    .map((line) => `${line.field}: ${line.from} → ${line.to}`)
    .join("; ");
  await writeChangeLog({
    actor,
    kind: "student",
    action: "update",
    targetId: studentId,
    targetLabel: label,
    summary,
    lines,
  });
}

export type MarkBefore = {
  marksObtained: number;
  isAbsent?: boolean;
  graceMarks?: number;
  achievementMarks?: number;
  remarks?: string | null;
};

function canonJson(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return JSON.stringify(sortJson(JSON.parse(raw)));
  } catch {
    return raw;
  }
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortJson(record[key])]),
    );
  }
  return value;
}

export function describeMarkChange(
  subject: string,
  before: MarkBefore | null,
  after: MarkBefore,
): string | null {
  const fromMarks = before ? (before.isAbsent ? "Absent" : String(before.marksObtained)) : "—";
  const toMarks = after.isAbsent ? "Absent" : String(after.marksObtained);
  const graceChanged = (before?.graceMarks || 0) !== (after.graceMarks || 0);
  const achChanged = (before?.achievementMarks || 0) !== (after.achievementMarks || 0);
  const remarksChanged = canonJson(before?.remarks) !== canonJson(after.remarks);
  const marksChanged = !before || fromMarks !== toMarks;
  if (!marksChanged && !graceChanged && !achChanged && !remarksChanged) return null;
  if (
    !before &&
    toMarks === "0" &&
    !after.isAbsent &&
    !graceChanged &&
    !achChanged &&
    !String(after.remarks || "").trim()
  ) {
    return null;
  }
  if (marksChanged) {
    let line = `${subject} ${fromMarks} → ${toMarks}`;
    if (graceChanged) line += ` (grace ${before?.graceMarks || 0} → ${after.graceMarks || 0})`;
    return line;
  }
  if (graceChanged) return `${subject} grace ${before?.graceMarks || 0} → ${after.graceMarks || 0}`;
  if (achChanged) return `${subject} achievement ${before?.achievementMarks || 0} → ${after.achievementMarks || 0}`;
  return `${subject} updated`;
}

export type MarkEdit = { studentId: string; studentLabel: string; line: string };

export async function logMarkEdits(
  actor: ChangeActor,
  examName: string,
  edits: MarkEdit[],
): Promise<void> {
  const grouped = new Map<string, { label: string; lines: string[] }>();
  for (const edit of edits) {
    if (!edit.line) continue;
    const row = grouped.get(edit.studentId) || { label: edit.studentLabel || "Student", lines: [] };
    row.lines.push(edit.line);
    if (edit.studentLabel) row.label = edit.studentLabel;
    grouped.set(edit.studentId, row);
  }
  const exam = examName.trim() || "Exam";
  await Promise.all(
    [...grouped.entries()].map(([studentId, row]) =>
      writeChangeLog({
        actor,
        kind: "marks",
        action: "update",
        targetId: studentId,
        targetLabel: `${row.label} · ${exam}`,
        summary: row.lines.slice(0, 8).join("; "),
        lines: row.lines.slice(0, 40).map((line) => ({ field: exam, from: "", to: line })),
      }),
    ),
  );
}
