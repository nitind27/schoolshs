"use client";

import type { GeneralRegisterRow } from "@/lib/certificates/general-register";
import {
  padGeneralRegisterRows,
  dedupeGrRows,
  chunkGrRows,
  GR_STUDENTS_PER_PAGE,
} from "@/lib/certificates/general-register";

/** Exact bilingual headers from official GR book */
const GR_HEADERS = {
  col1: { en: "Register No.", gu: "ક્રમાંક" },
  nameGroup: { en: "Name in full", gu: "વિદ્યાર્થીનું પૂરું નામ" },
  surname: { en: "Surname", gu: "અટક" },
  name: { en: "Name", gu: "નામ" },
  father: { en: "Father's Name", gu: "પિતાનું નામ" },
  mother: { en: "Mother's Name", gu: "માતાનું નામ" },
  col3: {
    en: "Religion with scheduled caste scheduled Tribe",
    gu: "ધર્મ શીડ્યુઅલ કાસ્ટ શીડ્યુઅલ ટ્રાઇબ",
  },
  col4: {
    en: "Place of Birth with Taluka & Dist.",
    gu: "જન્મ સ્થળ તાલુકા-જિલ્લા સહિત",
  },
  col5: {
    en: "Date of Birth, Month and year according to Christian year, both in words and figures",
    gu: "ઈસવીસન પ્રમાણે જન્મ તારીખ માસ અને વર્ષ (આંકડામાં અને શબ્દોમાં)",
  },
  col6: { en: "Last School Attended", gu: "પૂર્વ શાળા" },
  col7: {
    en: "Date of Admission (The E.I's Sanction No. if any)",
    gu: "પ્રવેશ તારીખ કેળવણી નિરીક્ષકની મંજૂરી હોય તો તેની વિગત",
  },
  col8: { en: "Paying of Fee", gu: "ફી ભરીને કે માફી" },
  col9: {
    en: "Std. and class into which Admi.",
    gu: "પ્રવેશ આપવામાં આવેલ ધો. અને વર્ગ અગર પ્રવાહ",
  },
  col10: { en: "Progress", gu: "પ્રગતિ" },
  col11: { en: "Conduct", gu: "વર્તણૂક" },
  col12: { en: "Date of Leaving", gu: "શાળા છોડ્યા તારીખ" },
  col13: {
    en: "Std and class from which left",
    gu: "શાળા છોડતી વખતે ધોરણ અને વર્ગ",
  },
  col14: { en: "L.C. Issue Date", gu: "એલ.સી. આપ્યા તારીખ" },
  col15: {
    en: "Remarks (Reasons for leaving fees paid or unpaid) etc.",
    gu: "ખાસ નોંધ (શાળા છોડવાનું કારણ બાકી ફી વગેરે)",
  },
} as const;

function BiTh({
  en,
  gu,
  rowSpan,
  colSpan,
  className = "",
}: {
  en: string;
  gu: string;
  rowSpan?: number;
  colSpan?: number;
  className?: string;
}) {
  return (
    <th rowSpan={rowSpan} colSpan={colSpan} className={`gr-th ${className}`.trim()}>
      <span className="gr-th-en">{en}</span>
      <span className="gr-th-gu">{gu}</span>
    </th>
  );
}

function EmptyBoxGrid({ count }: { count: number }) {
  return (
    <div className="gr-box-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="gr-box" />
      ))}
    </div>
  );
}

function FilledDigitBoxes({ value, count }: { value: string; count: number }) {
  const chars = value.padEnd(count, " ").slice(0, count).split("");
  return (
    <div className="gr-filled-boxes">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="gr-filled-box">
          {chars[i]?.trim() || ""}
        </span>
      ))}
    </div>
  );
}

function BirthPlaceCell({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="gr-birth-lines">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

function StudentEntryRows({
  r,
  selected,
  onSelect,
}: {
  r: GeneralRegisterRow;
  selected?: boolean;
  onSelect?: (row: GeneralRegisterRow) => void;
}) {
  const hasData = !r.isEmpty && (r.surname || r.firstName || r.grNumber);
  const clickProps = hasData && onSelect
    ? {
        onClick: () => onSelect(r),
        className: `gr-entry gr-entry-top${hasData ? " gr-has-data" : ""}${selected ? " gr-selected" : ""} gr-clickable`,
      }
    : { className: `gr-entry gr-entry-top${hasData ? " gr-has-data" : ""}` };

  return (
    <>
      <tr {...clickProps}>
        <td rowSpan={2} className="gr-col-reg">
          {r.grNumber || (hasData ? r.serial : "")}
        </td>
        <td className="gr-hand">{r.surname}</td>
        <td className="gr-hand">{r.firstName}</td>
        <td className="gr-hand">{r.fatherName}</td>
        <td className="gr-hand">{r.motherName}</td>
        <td rowSpan={2} className="gr-hand gr-text-sm">
          {r.religionCaste}
        </td>
        <td rowSpan={2} className="gr-hand gr-text-sm">
          <BirthPlaceCell lines={r.birthPlaceLines} />
        </td>
        <td className="gr-dob-fig gr-page-split">
          <div className="gr-dob-fig-gu">{r.dobFiguresGu || r.dobFigures}</div>
          {r.dobFiguresGu && r.dobFigures && (
            <div className="gr-dob-fig-en">{r.dobFigures}</div>
          )}
        </td>
        <td className="gr-hand gr-text-sm">{r.lastSchool}</td>
        <td rowSpan={2} className="gr-date">{r.admissionDate}</td>
        <td rowSpan={2} className="gr-hand gr-center">{r.feeStatus}</td>
        <td rowSpan={2} className="gr-std-class">
          {r.standard && <div className="gr-std-num">{r.standard}</div>}
          {r.sectionGu && <div className="gr-std-sec">{r.sectionGu}</div>}
        </td>
        <td rowSpan={2}>{r.progress}</td>
        <td rowSpan={2} className="gr-hand gr-center">{r.conduct}</td>
        <td rowSpan={2}>{r.leavingDate}</td>
        <td rowSpan={2}>{r.leavingStdClass}</td>
        <td rowSpan={2}>{r.lcIssueDate}</td>
        <td rowSpan={2} className="gr-remarks">{r.remarks}</td>
      </tr>
      <tr className={`gr-entry gr-entry-bottom${hasData ? " gr-has-data" : ""}${selected ? " gr-selected" : ""}`}>
        <td colSpan={4} className="gr-id-box-cell">
          <FilledDigitBoxes value={r.childUidDigits} count={18} />
        </td>
        <td className="gr-dob-words gr-page-split">{r.dobWordsGu}</td>
        <td className="gr-udise-box-cell">
          <FilledDigitBoxes value={r.udiseDigits} count={11} />
        </td>
      </tr>
    </>
  );
}

const GR_STYLES = `
  .gr-register-wrap {
    --gr-red: #b91c1c;
    --gr-red-dark: #7f1d1d;
    --gr-peach: #f3cbb8;
    --gr-peach-light: #faf0ea;
    --gr-ink: #111;
    --gr-border: #333;
    font-family: "Noto Sans Gujarati", "Times New Roman", Times, serif;
  }
  .gr-scroll {
    overflow: auto;
    background: #e2e8f0;
    padding: 12px;
    border-radius: 12px;
    max-height: calc(100vh - 280px);
  }
  .gr-scale-wrap { width: fit-content; min-width: 100%; }
  .gr-book {
    min-width: 1280px;
    background: #fff;
    border: 2px solid var(--gr-border);
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    border-radius: 4px;
  }
  .gr-meta {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #334155;
    padding: 8px 12px;
    border-bottom: 1px solid var(--gr-border);
  }
  .gr-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .gr-table th, .gr-table td {
    border: 1px solid var(--gr-border);
    vertical-align: middle;
    line-height: 1.25;
  }
  .gr-title-left, .gr-title-right {
    padding: 8px 12px !important;
    font-weight: 900;
    color: #fff;
    background: var(--gr-red);
    border-color: var(--gr-red-dark) !important;
  }
  .gr-title-left {
    text-align: left;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-right: 2px dashed #fecaca !important;
  }
  .gr-title-right { text-align: right; font-size: 14px; }
  .gr-th { background: var(--gr-peach); text-align: center; padding: 5px 3px !important; }
  .gr-th-en { display: block; font-size: 6.5px; line-height: 1.2; color: var(--gr-ink); font-weight: 700; }
  .gr-th-gu { display: block; font-size: 6.5px; line-height: 1.25; margin-top: 2px; color: var(--gr-red-dark); font-weight: 600; }
  .gr-page-split { border-right: 2px dashed #6b7280 !important; }
  .gr-num-row td {
    text-align: center; font-weight: 800; font-size: 9px;
    color: var(--gr-ink); background: var(--gr-peach-light);
    padding: 2px !important; height: 15px;
  }
  .gr-box-row td { padding: 1px 2px !important; height: 12px; background: #fff; }
  .gr-box-grid { display: flex; gap: 1px; height: 10px; }
  .gr-box { flex: 1; border: 0.5px solid #777; min-width: 3px; background: #fff; }
  .gr-entry td { padding: 2px 3px; font-size: 7.5px; color: var(--gr-ink); background: #fff; word-break: break-word; }
  .gr-entry-top td { height: 22px; }
  .gr-entry-bottom td { height: 14px; padding: 1px 2px !important; vertical-align: top; }
  .gr-has-data .gr-hand { font-size: 8px; font-weight: 500; }
  .gr-col-reg { text-align: center; font-weight: 800; font-size: 9px; vertical-align: middle !important; }
  .gr-birth-lines div { line-height: 1.3; font-size: 7px; }
  .gr-dob-fig { font-weight: 700; font-size: 7.5px; text-align: center; }
  .gr-dob-fig-gu { font-size: 8px; font-weight: 800; color: var(--gr-red-dark); }
  .gr-dob-fig-en { font-size: 6px; color: #64748b; }
  .gr-clickable { cursor: pointer; }
  .gr-clickable:hover td { background: #fff8f0 !important; }
  .gr-selected td { background: #fef3c7 !important; }
  .gr-dob-words { font-size: 6.5px; color: var(--gr-ink); line-height: 1.2; vertical-align: top !important; padding-top: 1px !important; }
  .gr-text-sm { font-size: 7px; }
  .gr-center { text-align: center; }
  .gr-date { text-align: center; font-size: 7.5px; }
  .gr-std-class { text-align: center; vertical-align: middle !important; }
  .gr-std-num { font-weight: 800; font-size: 9px; }
  .gr-std-sec { font-size: 8px; margin-top: 1px; }
  .gr-remarks { font-size: 6.5px; }
  .gr-filled-boxes { display: flex; gap: 0; width: 100%; }
  .gr-filled-box {
    flex: 1; min-width: 0; border: 0.5px solid #555;
    text-align: center; font-size: 6.5px; font-weight: 700;
    line-height: 11px; height: 11px; background: #fff; color: var(--gr-ink);
  }
  .gr-id-box-cell, .gr-udise-box-cell { padding: 0 1px !important; }
  .gr-screen .gr-book { min-width: 1400px; }
  .gr-screen .gr-th-en { font-size: 9px; }
  .gr-screen .gr-th-gu { font-size: 9.5px; }
  .gr-screen .gr-num-row td { font-size: 11px; height: 20px; }
  .gr-screen .gr-entry td { font-size: 11px; padding: 4px 5px; }
  .gr-screen .gr-entry-top td { height: 32px; min-height: 32px; }
  .gr-screen .gr-entry-bottom td { height: 22px; min-height: 22px; }
  .gr-screen .gr-has-data .gr-hand { font-size: 12px; font-weight: 500; }
  .gr-screen .gr-col-reg { font-size: 12px; }
  .gr-screen .gr-birth-lines div { font-size: 10px; }
  .gr-screen .gr-dob-fig { font-size: 11px; }
  .gr-screen .gr-dob-fig-gu { font-size: 12px; }
  .gr-screen .gr-dob-words { font-size: 10px; }
  .gr-screen .gr-text-sm { font-size: 10px; }
  .gr-screen .gr-date { font-size: 11px; }
  .gr-screen .gr-std-num { font-size: 12px; }
  .gr-screen .gr-std-sec { font-size: 11px; }
  .gr-screen .gr-remarks { font-size: 10px; }
  .gr-screen .gr-filled-box { font-size: 9px; height: 14px; line-height: 14px; }
  .gr-screen .gr-title-left { font-size: 17px; }
  .gr-screen .gr-title-right { font-size: 16px; }
  @media print {
    .gr-screen-view { display: none !important; }
    .gr-scroll { overflow: visible; padding: 0; background: transparent; max-height: none; }
    .gr-scale-wrap { width: 100% !important; }
    .gr-book { zoom: 1 !important; min-width: 0; box-shadow: none; border-radius: 0; }
    .gr-meta { font-size: 8px; padding: 3px 8px; }
    .gr-print-sheet { page-break-after: always; break-after: page; }
    .gr-print-sheet:last-child { page-break-after: auto; break-after: auto; }
    .gr-print-root .gr-register-wrap { margin: 0; }
    .gr-print-book { min-width: 0 !important; width: 100%; }
    .gr-print-mode .gr-entry td { font-size: 7px; padding: 2px 3px; }
    .gr-print-mode .gr-entry-top td { height: 18px; }
    .gr-print-mode .gr-entry-bottom td { height: 12px; }
    .gr-print-mode .gr-has-data .gr-hand { font-size: 7.5px; }
  }
`;

function GrRegisterTable({
  data,
  selectedId,
  onRowSelect,
}: {
  data: GeneralRegisterRow[];
  selectedId?: string;
  onRowSelect?: (row: GeneralRegisterRow) => void;
}) {
  return (
    <table className="gr-table">
      <colgroup>
        <col style={{ width: "3%" }} />
        <col style={{ width: "4.5%" }} />
        <col style={{ width: "4.5%" }} />
        <col style={{ width: "5%" }} />
        <col style={{ width: "5%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "8.5%" }} />
        <col style={{ width: "5%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "4.5%" }} />
        <col style={{ width: "4.5%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "6%" }} />
        <col style={{ width: "10.5%" }} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={8} className="gr-title-left">GENERAL REGISTER</th>
          <th colSpan={10} className="gr-title-right">સામાન્ય રજિસ્ટર (વય પત્રક)</th>
        </tr>
        <tr>
          <BiTh {...GR_HEADERS.col1} rowSpan={2} />
          <BiTh {...GR_HEADERS.nameGroup} colSpan={4} />
          <BiTh {...GR_HEADERS.col3} rowSpan={2} />
          <BiTh {...GR_HEADERS.col4} rowSpan={2} />
          <BiTh {...GR_HEADERS.col5} rowSpan={2} className="gr-page-split" />
          <BiTh {...GR_HEADERS.col6} rowSpan={2} />
          <BiTh {...GR_HEADERS.col7} rowSpan={2} />
          <BiTh {...GR_HEADERS.col8} rowSpan={2} />
          <BiTh {...GR_HEADERS.col9} rowSpan={2} />
          <BiTh {...GR_HEADERS.col10} rowSpan={2} />
          <BiTh {...GR_HEADERS.col11} rowSpan={2} />
          <BiTh {...GR_HEADERS.col12} rowSpan={2} />
          <BiTh {...GR_HEADERS.col13} rowSpan={2} />
          <BiTh {...GR_HEADERS.col14} rowSpan={2} />
          <BiTh {...GR_HEADERS.col15} rowSpan={2} />
        </tr>
        <tr>
          <BiTh {...GR_HEADERS.surname} />
          <BiTh {...GR_HEADERS.name} />
          <BiTh {...GR_HEADERS.father} />
          <BiTh {...GR_HEADERS.mother} />
        </tr>
        <tr className="gr-box-row">
          <td />
          <td colSpan={4}><EmptyBoxGrid count={18} /></td>
          <td /><td />
          <td className="gr-page-split" />
          <td><EmptyBoxGrid count={11} /></td>
          <td colSpan={9} />
        </tr>
        <tr className="gr-num-row">
          <td>1</td><td colSpan={4}>2</td><td>3</td><td>4</td>
          <td className="gr-page-split">5</td><td>6</td><td>7</td><td>8</td><td>9</td>
          <td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <StudentEntryRows
            key={r.id || r.studentId || `s-${r.serial}-${r.grNumber}`}
            r={r}
            selected={
              !!selectedId &&
              (r.id === selectedId || (!r.id && `sel-${r.serial}` === selectedId))
            }
            onSelect={onRowSelect}
          />
        ))}
      </tbody>
    </table>
  );
}

export function GeneralRegisterView({
  rows,
  schoolName,
  academicYear,
  classLabel,
  selectedId,
  onRowSelect,
  padEmpty = false,
  padTo = GR_STUDENTS_PER_PAGE,
  zoom = 1,
  mode = "screen",
  pageFooter,
}: {
  rows: GeneralRegisterRow[];
  schoolName?: string;
  academicYear?: string;
  classLabel?: string;
  selectedId?: string;
  onRowSelect?: (row: GeneralRegisterRow) => void;
  padEmpty?: boolean;
  padTo?: number;
  zoom?: number;
  mode?: "screen" | "print";
  pageFooter?: string;
}) {
  const data = padGeneralRegisterRows(dedupeGrRows(rows), padTo, padEmpty);
  const screenClass = mode === "screen" ? "gr-screen" : "gr-print-mode";
  const isPrint = mode === "print";

  const book = (
    <div
      className={`gr-book cert-page print-landscape-wide${isPrint ? " gr-print-book" : ""}`}
      style={isPrint ? undefined : { zoom }}
    >
      {(schoolName || classLabel || pageFooter) && (
        <div className="gr-meta">
          {schoolName}
          {academicYear ? ` · ${academicYear}` : ""}
          {classLabel ? ` · ${classLabel}` : ""}
          {pageFooter ? ` · ${pageFooter}` : ""}
        </div>
      )}
      <GrRegisterTable data={data} selectedId={selectedId} onRowSelect={onRowSelect} />
    </div>
  );

  return (
    <div className={`gr-register-wrap ${screenClass}`}>
      <style>{GR_STYLES}</style>
      {isPrint ? (
        book
      ) : (
        <div className="gr-scroll">
          <div className="gr-scale-wrap">{book}</div>
        </div>
      )}
    </div>
  );
}

/** Hidden on screen — prints all pages, 10 students per A4 landscape sheet */
export function GeneralRegisterPrintBundle({
  rows,
  schoolName,
  academicYear,
  classLabel,
  studentsPerPage = GR_STUDENTS_PER_PAGE,
}: {
  rows: GeneralRegisterRow[];
  schoolName?: string;
  academicYear?: string;
  classLabel?: string;
  studentsPerPage?: number;
}) {
  const chunks = chunkGrRows(rows, studentsPerPage);
  if (!chunks.length) return null;

  return (
    <div className="gr-print-root hidden print:block">
      {chunks.map((chunk, i) => (
        <div key={i} className="gr-print-sheet">
          <GeneralRegisterView
            mode="print"
            rows={chunk}
            padEmpty
            padTo={studentsPerPage}
            schoolName={schoolName}
            academicYear={academicYear}
            classLabel={classLabel}
            pageFooter={`પાનું ${i + 1} / ${chunks.length}`}
          />
        </div>
      ))}
    </div>
  );
}
