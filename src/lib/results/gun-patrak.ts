/** Official single-subject ગુણ પત્રક — 33 rows × 2 columns, like the printed slip. */

export const GUN_PATRAK_ROWS = 33;
export const GUN_PATRAK_COLS = 2;
export const GUN_PATRAK_SLOTS = GUN_PATRAK_ROWS * GUN_PATRAK_COLS;

export type GunPatrakStudent = {
  studentId: string;
  examNo: string;
  marks: number | null;
};

export type GunPatrakCell = {
  examNo: string;
  marks: string;
  filled: boolean;
};

export function formatGunPatrakMarks(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export function buildGunPatrakPages(students: GunPatrakStudent[]): GunPatrakCell[][] {
  const pageCount = Math.max(1, Math.ceil(students.length / GUN_PATRAK_SLOTS));
  const pages: GunPatrakCell[][] = [];

  for (let p = 0; p < pageCount; p++) {
    const page: GunPatrakCell[] = [];
    for (let i = 0; i < GUN_PATRAK_SLOTS; i++) {
      const idx = p * GUN_PATRAK_SLOTS + i;
      const row = students[idx];
      if (row) {
        page.push({
          examNo: row.examNo || String(idx + 1),
          marks: formatGunPatrakMarks(row.marks),
          filled: true,
        });
      } else {
        page.push({
          examNo: String(idx + 1),
          marks: "",
          filled: false,
        });
      }
    }
    pages.push(page);
  }

  return pages;
}

export function splitGunPatrakColumns(page: GunPatrakCell[]) {
  return {
    left: page.slice(0, GUN_PATRAK_ROWS),
    right: page.slice(GUN_PATRAK_ROWS, GUN_PATRAK_SLOTS),
  };
}

export function gunPatrakExamNo(
  seatNumber: string | null | undefined,
  rollNumber: string | null | undefined,
  fallback: number,
): string {
  const seat = String(seatNumber || "").trim();
  if (seat) return seat;
  const roll = String(rollNumber || "").trim();
  if (roll) return roll;
  return String(fallback);
}

export function formatClassStandardLine(standard: string, section: string): string {
  const std = String(standard || "").trim();
  const sec = String(section || "").trim();
  if (/^balvatika$/i.test(std) || std === "બાલવાટિકા") {
    return sec ? `બાલવાટિકા વર્ગ-${sec}` : "બાલવાટિકા";
  }
  const stdPart = std ? `ધોરણ-${std}` : "ધોરણ-";
  const secPart = sec ? ` વર્ગ-${sec}` : "";
  return `${stdPart}${secPart}`;
}
