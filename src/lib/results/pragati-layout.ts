/** Layout tweaks for school 24261004404 પ્રગતિપત્રક. Units are mm except fonts (px) and subject column (%). */
export const PRAGATI_LAYOUT_SCHOOL = "24261004404";

export const PRAGATI_LAYOUT_PASSWORD = "24261004404";

export type PragatiLayout = {
  sheetPadTop: number;
  sheetPadX: number;
  sheetPadBottom: number;
  headerPadTop: number;
  headerPadX: number;
  headerPadBottom: number;
  headerMargin: number;
  logoW: number;
  logoH: number;
  fontTrust: number;
  fontSchool: number;
  fontSection: number;
  fontYear: number;
  legendW: number;
  fontLegendTitle: number;
  fontLegend: number;
  fontBar: number;
  fontStudent: number;
  studentPadY: number;
  studentPadX: number;
  fontTable: number;
  colSubject: number;
  remarksW: number;
  fontRemarks: number;
  fontNotice: number;
  fontSign: number;
};

export const DEFAULT_PRAGATI_LAYOUT: PragatiLayout = {
  sheetPadTop: 3.8,
  sheetPadX: 4,
  sheetPadBottom: 3,
  headerPadTop: 4.4,
  headerPadX: 1.8,
  headerPadBottom: 1.1,
  headerMargin: 1.1,
  logoW: 24,
  logoH: 28,
  fontTrust: 12,
  fontSchool: 16.5,
  fontSection: 13,
  fontYear: 12.5,
  legendW: 44,
  fontLegendTitle: 11,
  fontLegend: 10,
  fontBar: 12,
  fontStudent: 12,
  studentPadY: 0.7,
  studentPadX: 1.4,
  fontTable: 11,
  colSubject: 26,
  remarksW: 58,
  fontRemarks: 10,
  fontNotice: 10.5,
  fontSign: 12,
};

const STORAGE_KEY = `pp-layout-${PRAGATI_LAYOUT_SCHOOL}`;

export function isPragatiLayoutSchool(code?: string | null) {
  return (code || "").trim() === PRAGATI_LAYOUT_SCHOOL;
}

export function loadPragatiLayout(): PragatiLayout {
  if (typeof window === "undefined") return DEFAULT_PRAGATI_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRAGATI_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<PragatiLayout>;
    return { ...DEFAULT_PRAGATI_LAYOUT, ...parsed };
  } catch {
    return DEFAULT_PRAGATI_LAYOUT;
  }
}

export function savePragatiLayout(layout: PragatiLayout) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function pragatiLayoutStyle(layout: PragatiLayout): Record<string, string> {
  return {
    "--pp-sheet-pad-top": `${layout.sheetPadTop}mm`,
    "--pp-sheet-pad-x": `${layout.sheetPadX}mm`,
    "--pp-sheet-pad-bottom": `${layout.sheetPadBottom}mm`,
    "--pp-header-pad-top": `${layout.headerPadTop}mm`,
    "--pp-header-pad-x": `${layout.headerPadX}mm`,
    "--pp-header-pad-bottom": `${layout.headerPadBottom}mm`,
    "--pp-header-margin": `${layout.headerMargin}mm`,
    "--pp-logo-w": `${layout.logoW}mm`,
    "--pp-logo-h": `${layout.logoH}mm`,
    "--pp-font-trust": `${layout.fontTrust}px`,
    "--pp-font-school": `${layout.fontSchool}px`,
    "--pp-font-section": `${layout.fontSection}px`,
    "--pp-font-year": `${layout.fontYear}px`,
    "--pp-legend-w": `${layout.legendW}mm`,
    "--pp-font-legend-title": `${layout.fontLegendTitle}px`,
    "--pp-font-legend": `${layout.fontLegend}px`,
    "--pp-font-bar": `${layout.fontBar}px`,
    "--pp-font-student": `${layout.fontStudent}px`,
    "--pp-student-pad-y": `${layout.studentPadY}mm`,
    "--pp-student-pad-x": `${layout.studentPadX}mm`,
    "--pp-font-table": `${layout.fontTable}px`,
    "--pp-col-subject": `${layout.colSubject}%`,
    "--pp-remarks-w": `${layout.remarksW}mm`,
    "--pp-font-remarks": `${layout.fontRemarks}px`,
    "--pp-font-notice": `${layout.fontNotice}px`,
    "--pp-font-sign": `${layout.fontSign}px`,
  };
}
