"use client";

import { useEffect, useState } from "react";
import { toGujaratiDigits } from "@/lib/certificates/gujarati-date";
import {
  GUJARATI_MONTHS,
  PATRAK_GOVT_WAIVER_COUNT,
  PATRAK_TYPE_ROWS,
  type AdmissionReportRow,
  type ClassRegisterRow,
  type LeaverReportRow,
  type MonthlyPatrakData,
  type PatrakMovementRow,
} from "@/lib/certificates/types";

const INK = "#1a5f7a";
const FONT = '"Noto Sans Gujarati", "Noto Sans", Arial, sans-serif';
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Printable area inside A4 after page margins */
const A4P = {
  margin: "5mm",
  w: "200mm",
  h: "287mm",
} as const;
const A4L = {
  margin: "4mm",
  w: "289mm",
  h: "202mm",
} as const;

function g(n: number | string): string {
  return toGujaratiDigits(String(n));
}

function BG({ b, g: girls }: { b: number | string; g: number | string }) {
  const fmt = (v: number | string) => (v === 0 || v === "" ? "\u00a0" : g(v));
  return (
    <>
      <td className="patrak-c">{fmt(b)}</td>
      <td className="patrak-c">{fmt(girls)}</td>
    </>
  );
}

function NumCell({ v }: { v: number }) {
  return <td className="patrak-c">{v === 0 ? "\u00a0" : g(v)}</td>;
}

function MovementCells({ row }: { row: PatrakMovementRow }) {
  return (
    <>
      <BG b={row.opening.boys} g={row.opening.girls} />
      <NumCell v={row.admittedNew} />
      <NumCell v={row.transferPaid} />
      <NumCell v={row.transferUnpaid} />
      <NumCell v={row.schoolPaid} />
      <NumCell v={row.schoolUnpaid} />
      <NumCell v={row.classPaid} />
      <NumCell v={row.classUnpaid} />
      <BG b={row.closing.boys} g={row.closing.girls} />
    </>
  );
}

function padRegister(rows: ClassRegisterRow[], start: number, count: number): ClassRegisterRow[] {
  const map = new Map(rows.map((r) => [r.serial, r]));
  return Array.from({ length: count }, (_, i) => {
    const serial = start + i;
    return (
      map.get(serial) ?? {
        grNumber: "",
        caste: "",
        category: "",
        dob: "",
        schoolFee: "",
        termFee: "",
        admissionFee: "",
        otherFee: "",
        totalFee: "",
        serial,
        name: "",
        attendance: Array(31).fill(null),
        monthTotal: "",
        prevTotal: "",
        cumulative: "",
        note: "",
      }
    );
  });
}

function padAdmission(rows: AdmissionReportRow[], n: number): AdmissionReportRow[] {
  const out = [...rows];
  while (out.length < n) out.push({ serial: out.length + 1, grNumber: "", name: "", admissionDate: "", note: "" });
  return out.slice(0, n);
}

function emptyLeaver(serial: number): LeaverReportRow {
  return {
    serial,
    grNumber: "",
    name: "",
    leavingDate: "",
    reason: "",
    standard: "",
    conduct: "",
    feePaid: "",
    outstanding: "",
    note: "",
  };
}

function initLeavers(rows: LeaverReportRow[]): LeaverReportRow[] {
  if (rows.length > 0) {
    return rows.map((r, i) => ({ ...r, serial: i + 1 }));
  }
  return [emptyLeaver(1), emptyLeaver(2), emptyLeaver(3), emptyLeaver(4)];
}

function PageMarker({ n, centered = false }: { n: number; centered?: boolean }) {
  return (
    <div className={`patrak-pg-marker${centered ? " patrak-pg-marker-center" : ""}`}>
      ..{g(n)}..
    </div>
  );
}

const STUDENT_NAME_HDR =
  "વિદ્યાર્થીનું નામ (અટક, પૂરું નામ અને પિતાનું નામ દર મહિનાની શરૂઆતમાં કક્કાવારીના ક્રમ પ્રમાણે લખવા)";

const SHEET3_SUMMARY_LABELS = [
  "હાજર સંખ્યા",
  "રજા ઉપર સંખ્યા",
  "માંદગી સંખ્યા",
  "ગેરહાજર સંખ્યા",
  "કુલ સંખ્યા",
  "નવા આવેલાની સંખ્યા",
  "ઉઠી જનારાની સંખ્યા",
  "એકંદરે સંખ્યા",
];

/** Editable ...... blank in vertical headers — type number, shows Gujarati digits. */
function HdrDots({
  value,
  onChange,
  width = 4,
}: {
  value: string;
  onChange: (latinDigits: string) => void;
  width?: number;
}) {
  const display = value ? g(value) : "";
  return (
    <input
      className={`patrak-hdr-dots-inp${value ? " has-val" : ""}`}
      value={display}
      placeholder={".".repeat(width)}
      inputMode="numeric"
      maxLength={width}
      size={width}
      aria-label="દિવસ સંખ્યા"
      onChange={(e) => {
        const next = e.target.value
          .split("")
          .map((ch) => {
            const gi = "૦૧૨૩૪૫૬૭૮૯".indexOf(ch);
            if (gi >= 0) return String(gi);
            return /\d/.test(ch) ? ch : "";
          })
          .join("")
          .slice(0, width);
        onChange(next);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function countMarkedDays(rows: ClassRegisterRow[]): number {
  let n = 0;
  for (let d = 0; d < 31; d++) {
    if (rows.some((r) => {
      const v = r.attendance[d];
      return v != null && String(v).trim() !== "";
    })) n += 1;
  }
  return n;
}

function useAttendanceDayBlanks(rows: ClassRegisterRow[], month: string, year: string) {
  const monthNum = parseInt(month, 10) || 1;
  const yearNum = parseInt(year, 10) || new Date().getFullYear();
  const calendarDays = new Date(yearNum, monthNum, 0).getDate();
  const marked = countMarkedDays(rows);
  const defaultMonth = String(marked > 0 ? marked : calendarDays);
  const maxPrev = rows.reduce((m, r) => {
    const n = parseInt(String(r.prevTotal || ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  const maxCum = rows.reduce((m, r) => {
    const n = parseInt(String(r.cumulative || ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);

  const [monthDays, setMonthDays] = useState(defaultMonth);
  const [prevDays, setPrevDays] = useState(maxPrev > 0 ? String(maxPrev) : "");
  const [cumDays, setCumDays] = useState(
    maxCum > 0 ? String(maxCum) : maxPrev > 0 ? String(maxPrev + Number(defaultMonth)) : ""
  );

  useEffect(() => {
    setMonthDays(defaultMonth);
    setPrevDays(maxPrev > 0 ? String(maxPrev) : "");
    setCumDays(
      maxCum > 0 ? String(maxCum) : maxPrev > 0 ? String(maxPrev + Number(defaultMonth)) : ""
    );
  }, [defaultMonth, maxPrev, maxCum]);

  return { monthDays, setMonthDays, prevDays, setPrevDays, cumDays, setCumDays };
}

const RIGHT_BODY_COLS = 31 + 1 + 3 + 1; // days | ser | 3 totals | note
const LEFT_SHEET2_COLS = 10; // gr dob 4fees caste cat ser name
const LEFT_SHEET3_COLS = 11; // gr caste dob 5fees sign ser name

/**
 * Open-book register: LEFT | RIGHT as ONE table.
 * Same <tr> = continuous horizontal line (matches physical patrak).
 */
function RegisterSpread({
  rows,
  variant,
  leftPageNo,
  rightPageNo,
  monthName,
  standard,
  section,
  yearShort,
  month,
  year,
}: {
  rows: ClassRegisterRow[];
  variant: "sheet2" | "sheet3";
  leftPageNo: number;
  rightPageNo: number;
  monthName: string;
  standard: string;
  section: string;
  yearShort: string;
  month: string;
  year: string;
}) {
  const isSheet3 = variant === "sheet3";
  const leftCols = isSheet3 ? LEFT_SHEET3_COLS : LEFT_SHEET2_COLS;
  const { monthDays, setMonthDays, prevDays, setPrevDays, cumDays, setCumDays } =
    useAttendanceDayBlanks(rows, month, year);

  return (
    <div className="patrak-sheet patrak-landscape patrak-reg-page patrak-spread">
      <div className="patrak-screen-label no-print">
        {"\u0AAA\u0ABE\u0AA8\u0AC1\u0A82"} {g(leftPageNo)}–{g(rightPageNo)} — joint spread (one line)
      </div>

      <div className="patrak-spread-markers">
        <div className="patrak-spread-marker-slot"><PageMarker n={leftPageNo} centered /></div>
        <div className="patrak-spread-marker-slot"><PageMarker n={rightPageNo} centered /></div>
      </div>

      <div className="patrak-day-edit no-print">
        <label>
          આ માસના દિવસ
          <HdrDots value={monthDays} onChange={setMonthDays} width={4} />
        </label>
        <label>
          છેલ્લા માસ સુધી
          <HdrDots value={prevDays} onChange={setPrevDays} width={4} />
        </label>
        <label>
          અંત સુધી કુલ
          <HdrDots value={cumDays} onChange={setCumDays} width={4} />
        </label>
      </div>

      <table className="patrak-tbl patrak-unified">
        <thead>
          <tr className="patrak-reg-h1">
            <th rowSpan={2} className="patrak-w-gr patrak-vhdr"><span>{"\u0A9C\u0AA8\u0AB0\u0AB2 \u0AB0\u0A9C\u0AC0\u0AB8\u0ACD\u0A9F\u0AB0 \u0AA8\u0A82\u0AAC\u0AB0"}</span></th>
            {isSheet3 && (
              <th rowSpan={2} className="patrak-vhdr patrak-w-caste"><span>{"\u0A9C\u0ACD\u0A9E\u0ABE\u0AA4\u0ABF"}</span></th>
            )}
            <th rowSpan={2} className="patrak-w-dob patrak-vhdr"><span>{"\u0A9C\u0AA8\u0ACD\u0AAE \u0AA4\u0ABE\u0AB0\u0AC0\u0A96"}</span></th>
            <th colSpan={isSheet3 ? 5 : 4} className="patrak-fee-group">{"\u0AAE\u0AB3\u0AC7\u0AB2\u0AC0 \u0AAB\u0AC0"}</th>
            {isSheet3 ? (
              <th rowSpan={2} className="patrak-vhdr patrak-w-sign"><span>{"\u0AAB\u0AC0 \u0AB2\u0AC7\u0AA8\u0ABE\u0AB0\u0AA8\u0AC0 \u0AB8\u0AB9\u0AC0"}</span></th>
            ) : (
              <>
                <th rowSpan={2} className="patrak-vhdr patrak-w-caste"><span>{"\u0A9C\u0ACD\u0A9E\u0ABE\u0AA4\u0ABF"}</span></th>
                <th rowSpan={2} className="patrak-vhdr patrak-w-cat"><span>{"\u0A95\u0AC7\u0A9F\u0AC7\u0A97\u0AB0\u0AC0"}</span></th>
              </>
            )}
            <th rowSpan={2} className="patrak-w-ser patrak-vhdr"><span>{"\u0A95\u0ACD\u0AB0\u0AAE\u0ABE\u0A82\u0A95"}</span></th>
            <th rowSpan={2} className="patrak-w-name patrak-name-hdr">{STUDENT_NAME_HDR}</th>
            <th rowSpan={2} className="patrak-fold" aria-hidden />
            <th colSpan={RIGHT_BODY_COLS} className="patrak-reg-hdr-cell">
              {"\u0AAE\u0ABE\u0AB9\u0AC7"} <span className="patrak-ul patrak-ul-md">{monthName || "\u00a0".repeat(6)}</span>
              {" "}{"\u0AE8\u0AE6"}<span className="patrak-ul">{yearShort || "\u00a0\u00a0"}</span>
              {" "}{"\u0AB9\u0ABE\u0A9C\u0AB0\u0AC0"}
              {" "}{"\u0AA7\u0ACB\u0AB0\u0AA3"} <span className="patrak-ul">{g(standard) || "\u00a0\u00a0"}</span>
              {" "}{"\u0AB5\u0AB0\u0ACD\u0A97"} <span className="patrak-ul">{section || "\u00a0\u00a0"}</span>
            </th>
          </tr>
          <tr className="patrak-reg-h2">
            <th className="patrak-vhdr patrak-fee-sub"><span>{"\u0AB8\u0AA4\u0ACD\u0AB0 \u0AAB\u0AC0"}</span></th>
            <th className="patrak-vhdr patrak-fee-sub"><span>{"\u0AA6\u0ABE\u0A96\u0AB2 \u0AAB\u0AC0"}</span></th>
            <th className="patrak-vhdr patrak-fee-sub"><span>{"\u0A85\u0AA8\u0ACD\u0AAF \u0AAB\u0AC0"}</span></th>
            <th className="patrak-vhdr patrak-fee-sub"><span>{"\u0A95\u0AC1\u0AB2"}</span></th>
            {isSheet3 && (
              <th className="patrak-vhdr patrak-fee-sub patrak-w-date"><span>{"\u0AA4\u0ABE\u0AB0\u0AC0\u0A96"}</span></th>
            )}
            {DAYS.map((d) => (
              <th key={d} className="patrak-day-h">{g(d)}</th>
            ))}
            <th className="patrak-w-ser patrak-vhdr"><span>{"\u0A95\u0ACD\u0AB0\u0AAE\u0ABE\u0A82\u0A95"}</span></th>
            <th className="patrak-vhdr patrak-w-sum">
              <span className="patrak-vstack">
                {"\u0A86 \u0AAE\u0ABE\u0AB8\u0AA8\u0ABE \u0A95\u0AC1\u0AB2 "}
                {monthDays ? g(monthDays) : "...."}
                {" \u0AA6\u0ABF\u0AB5\u0AB8\u0ACB\u0AA8\u0AC0 \u0AB9\u0ABE\u0A9C\u0AB0\u0AC0"}
              </span>
            </th>
            <th className="patrak-vhdr patrak-w-sum">
              <span className="patrak-vstack">
                {"\u0A9B\u0AC7\u0AB2\u0ACD\u0AB2\u0ABE \u0AAE\u0ABE\u0AB8 \u0AB8\u0AC1\u0AA7\u0AC0\u0AA8\u0AC0 \u0A95\u0AC1\u0AB2 "}
                {prevDays ? g(prevDays) : "...."}
                {" \u0AB9\u0ABE\u0A9C\u0AB0\u0AC0"}
              </span>
            </th>
            <th className="patrak-vhdr patrak-w-sum">
              <span className="patrak-vstack">
                {"\u0A86 \u0AAE\u0ABE\u0AB8\u0AA8\u0ABE \u0A85\u0A82\u0AA4 \u0AB8\u0AC1\u0AA7\u0AC0\u0AA8\u0AC0 \u0A95\u0AC1\u0AB2 "}
                {cumDays ? g(cumDays) : "...."}
                {" \u0AB9\u0ABE\u0A9C\u0AB0\u0AC0"}
              </span>
            </th>
            <th className="patrak-w-note patrak-vhdr"><span>{"\u0AA8\u0ACB\u0A82\u0AA7"}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.serial}>
              <td>{r.grNumber ? g(r.grNumber) : ""}</td>
              {isSheet3 && <td className="patrak-c">{r.caste}</td>}
              <td>{r.dob ? g(r.dob) : ""}</td>
              <td>{r.termFee ? g(r.termFee) : ""}</td>
              <td>{r.admissionFee ? g(r.admissionFee) : ""}</td>
              <td>{r.otherFee ? g(r.otherFee) : ""}</td>
              <td>{r.totalFee ? g(r.totalFee) : ""}</td>
              {isSheet3 ? (
                <>
                  <td />
                  <td />
                </>
              ) : (
                <>
                  <td className="patrak-c">{r.caste}</td>
                  <td className="patrak-c">{r.category}</td>
                </>
              )}
              <td className="patrak-c patrak-ser-cell">{g(r.serial)}</td>
              <td className="patrak-name-cell">{r.name}</td>
              <td className="patrak-fold" aria-hidden />
              {DAYS.map((d) => (
                <td key={d} className="patrak-day-c">{r.attendance[d - 1] || ""}</td>
              ))}
              <td className="patrak-c patrak-ser-cell">{g(r.serial)}</td>
              <td className="patrak-c">{r.monthTotal ? g(r.monthTotal) : ""}</td>
              <td className="patrak-c">{r.prevTotal ? g(r.prevTotal) : ""}</td>
              <td className="patrak-c">{r.cumulative ? g(r.cumulative) : ""}</td>
              <td>{r.note}</td>
            </tr>
          ))}
          {isSheet3 &&
            SHEET3_SUMMARY_LABELS.map((label) => (
              <tr key={label} className="patrak-summary-row">
                <td colSpan={leftCols - 1} className="patrak-summary-lbl">{label}</td>
                <td />
                <td className="patrak-fold" aria-hidden />
                {DAYS.map((d) => (
                  <td key={d} className="patrak-day-c" />
                ))}
                <td colSpan={5} />
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={leftCols - 1} className="patrak-foot-lbl">{"\u0A95\u0AC1\u0AB2 \u0AB8\u0AB0\u0AB5\u0ABE\u0AB3\u0ACB"}</td>
            <td className="patrak-foot-lbl patrak-c">{"\u0AA4\u0ABE\u0AB0\u0AC0\u0A96"}</td>
            <td className="patrak-fold" aria-hidden />
            {DAYS.map((d) => (
              <td key={d} className="patrak-day-f patrak-c">{g(d)}</td>
            ))}
            <td colSpan={5} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CellInput({
  value,
  onChange,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="patrak-cell-inp"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function LeaversReportTable({
  initialRows,
}: {
  initialRows: LeaverReportRow[];
}) {
  const [rows, setRows] = useState(() => initLeavers(initialRows));

  const update = (index: number, field: keyof LeaverReportRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value, serial: i + 1 } : { ...r, serial: i + 1 }))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyLeaver(prev.length + 1)]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return [emptyLeaver(1)];
      return prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, serial: i + 1 }));
    });
  };

  return (
    <div className="patrak-lev-wrap">
      <div className="patrak-sec-head no-print">
        <h3 className="patrak-sec-title patrak-sec-title-inline">શાળા છોડી ગયેલ વિદ્યાર્થીઓનો અહેવાલ</h3>
        <button type="button" className="patrak-add-row" onClick={addRow}>
          <span className="patrak-add-ico" aria-hidden>+</span>
          પંક્તિ ઉમેરો
        </button>
      </div>
      <h3 className="patrak-sec-title print-only">શાળા છોડી ગયેલ વિદ્યાર્થીઓનો અહેવાલ</h3>

      <table className="patrak-tbl patrak-lev">
        <thead>
          <tr>
            <th className="patrak-w-ser2">અનુક્રમ નંબર</th>
            <th className="patrak-w-gr2">જ.ર. નંબર</th>
            <th>વિદ્યાર્થીનું નામ</th>
            <th className="patrak-w-date2">શાળા છોડ્યાની તારીખ</th>
            <th>શાળા છોડ્યાનું કારણ</th>
            <th className="patrak-vhdr patrak-w-sm"><span>અભ્યાસ</span></th>
            <th className="patrak-vhdr patrak-w-sm"><span>વર્તણૂંક</span></th>
            <th className="patrak-vhdr patrak-w-lev"><span>ફી ભરી કે નહી?</span></th>
            <th className="patrak-vhdr patrak-w-lev"><span>બાકી નીકળતી રકમ</span></th>
            <th className="patrak-w-note2">નોંધ</th>
            <th className="patrak-w-act no-print"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`lev-${i}`}>
              <td className="patrak-c">{g(r.serial)}</td>
              <td><CellInput value={r.grNumber} onChange={(v) => update(i, "grNumber", v)} /></td>
              <td><CellInput value={r.name} onChange={(v) => update(i, "name", v)} /></td>
              <td><CellInput value={r.leavingDate} onChange={(v) => update(i, "leavingDate", v)} placeholder="dd/mm/yyyy" /></td>
              <td><CellInput value={r.reason} onChange={(v) => update(i, "reason", v)} /></td>
              <td><CellInput value={r.standard} onChange={(v) => update(i, "standard", v)} /></td>
              <td><CellInput value={r.conduct} onChange={(v) => update(i, "conduct", v)} /></td>
              <td><CellInput value={r.feePaid} onChange={(v) => update(i, "feePaid", v)} /></td>
              <td><CellInput value={r.outstanding} onChange={(v) => update(i, "outstanding", v)} /></td>
              <td><CellInput value={r.note} onChange={(v) => update(i, "note", v)} /></td>
              <td className="patrak-c no-print">
                <button
                  type="button"
                  className="patrak-del-row"
                  onClick={() => removeRow(i)}
                  title="પંક્તિ કાઢો"
                  aria-label="પંક્તિ કાઢો"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="patrak-add-row patrak-add-row-below no-print" onClick={addRow}>
        <span className="patrak-add-ico" aria-hidden>+</span>
        નવી પંક્તિ ઉમેરો
      </button>
    </div>
  );
}

export function MonthlyAttendancePatrakView({
  data,
  registerRows = [],
  admissions = [],
  leavers = [],
}: {
  data: MonthlyPatrakData;
  registerRows?: ClassRegisterRow[];
  admissions?: AdmissionReportRow[];
  leavers?: LeaverReportRow[];
}) {
  const monthName = GUJARATI_MONTHS[parseInt(data.month, 10) - 1] || data.month;
  const yearShort = data.year.slice(-2);
  const cls = data.classification;
  const govtRows = PATRAK_TYPE_ROWS.filter((r) => r.isGovtWaiver);
  const sheet2Rows = padRegister(registerRows, 1, 40);
  const sheet3Rows = padRegister(registerRows, 41, 32);
  const adm = padAdmission(admissions, 6);

  return (
    <div className="patrak-root">
      {/* ── Sheet 1: portrait summary ───────────────── */}
      <div className="patrak-sheet patrak-portrait">
        <div className="patrak-screen-label no-print">પાનું ૧ — સારાંશ (Portrait A4)</div>
        <h1 className="patrak-title">વિદ્યાર્થીનું માસિક હાજરી પત્રક</h1>
        <div className="patrak-meta">
          <span>વર્ગ શિક્ષકશ્રી <u className="patrak-fill">{data.classTeacher || "\u00a0".repeat(18)}</u></span>
          <span>માહે <u className="patrak-fill">{monthName}</u> ૨૦<u className="patrak-fill">{yearShort}</u></span>
          <span>ધોરણ <u className="patrak-fill">{g(data.standard)}</u> વર્ગ <u className="patrak-fill">{data.section}</u></span>
        </div>

        <table className="patrak-tbl patrak-move">
          <thead>
            <tr>
              <th colSpan={2} rowSpan={3} className="patrak-type-hdr">વિદ્યાર્થીના પ્રકાર</th>
              <th colSpan={2}>માસના પ્રથમ દિવસે સંખ્યા</th>
              <th colSpan={3}>આ માસમાં દાખલ થયા</th>
              <th colSpan={4}>આ માસમાં વર્ગમાંથી ગયા</th>
              <th colSpan={2}>માસના છેલ્લા દિવસે બાકી રહેતી સંખ્યા</th>
              <th rowSpan={3} className="patrak-w-note">નોંધ</th>
            </tr>
            <tr>
              <th rowSpan={2}>કુમાર</th>
              <th rowSpan={2}>કન્યા</th>
              <th rowSpan={2}>નવા</th>
              <th colSpan={2}>બીજા વર્ગમાંથી</th>
              <th colSpan={2}>શાળા છોડીને</th>
              <th colSpan={2}>બીજા વર્ગમાં</th>
              <th rowSpan={2}>કુમાર</th>
              <th rowSpan={2}>કન્યા</th>
            </tr>
            <tr>
              <th className="patrak-vhdr"><span>ત્યાં ફી આપીને</span></th>
              <th className="patrak-vhdr"><span>ત્યાં ફી આપ્યા વિના</span></th>
              <th className="patrak-vhdr"><span>ફી આપીને</span></th>
              <th className="patrak-vhdr"><span>ફી આપ્યા વિના</span></th>
              <th className="patrak-vhdr"><span>ફી આપીને</span></th>
              <th className="patrak-vhdr"><span>ફી આપ્યા વિના</span></th>
            </tr>
          </thead>
          <tbody>
            {PATRAK_TYPE_ROWS.map((def) => {
              const row = data.movement[def.key];
              if (def.key === "fullFee") {
                return (
                  <tr key={def.key}>
                    <td colSpan={2}>{def.label}</td>
                    <MovementCells row={row} />
                    <td>{row.note}</td>
                  </tr>
                );
              }
              if (def.isGovtWaiver && def.key === govtRows[0].key) {
                return (
                  <tr key={def.key}>
                    <td rowSpan={PATRAK_GOVT_WAIVER_COUNT} className="patrak-vhdr patrak-waiver-side">
                      <span>સરકાર તરફથી માફી</span>
                    </td>
                    <td>{def.label}</td>
                    <MovementCells row={row} />
                    <td>{row.note}</td>
                  </tr>
                );
              }
              if (def.isGovtWaiver) {
                return (
                  <tr key={def.key}>
                    <td>{def.label}</td>
                    <MovementCells row={row} />
                    <td>{row.note}</td>
                  </tr>
                );
              }
              return (
                <tr key={def.key} className={def.key === "total" ? "patrak-total-row" : undefined}>
                  <td colSpan={2}>{def.label}</td>
                  <MovementCells row={row} />
                  <td>{row.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="patrak-cls-title">માસના છેલ્લા દિવસે રહેલ વિદ્યાર્થીઓની સંખ્યાનું વર્ગીકરણ</div>
        <table className="patrak-tbl patrak-cls">
          <thead>
            <tr>
              <th rowSpan={2}>ઉજળિયાત</th>
              <th rowSpan={2}>મધ્યમ</th>
              <th rowSpan={2}>પછાત</th>
              <th rowSpan={2}>કુલ</th>
              <th colSpan={6}>બીજા</th>
              <th rowSpan={2}>એકંદરે કુલ</th>
              <th rowSpan={2} className="patrak-vhdr patrak-w-avg"><span>આ માસની સરાસરી હાજરી</span></th>
            </tr>
            <tr>
              <th>જૈન</th>
              <th>પારસી</th>
              <th>મુસલમાન</th>
              <th>શીખ</th>
              <th>ખ્રિસ્તી</th>
              <th>કુલ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[
                cls.ujaniyat,
                cls.madhyam,
                cls.pachhat,
                cls.groupTotal,
                cls.other.jain,
                cls.other.parsi,
                cls.other.muslim,
                cls.other.sikh,
                cls.other.christian,
                cls.other.total,
                cls.grandTotal,
                cls.avgAttendance,
              ].map((v, i) => (
                <td key={i} className="patrak-c">
                  {v ? g(v) : "\u00a0"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="patrak-sigs">
          <span>વર્ગ શિક્ષક</span>
          <span>હિસાબનીશ</span>
          <span>આચાર્ય / આચાર્યા</span>
        </div>
      </div>

            {/* PDF pages 2-3: open-book spread students 1-40 */}
      <RegisterSpread
        rows={sheet2Rows}
        variant="sheet2"
        leftPageNo={2}
        rightPageNo={3}
        monthName={monthName}
        standard={data.standard}
        section={data.section}
        yearShort={yearShort}
        month={data.month}
        year={data.year}
      />

      {/* PDF pages 4-5: open-book spread students 41-72 */}
      <RegisterSpread
        rows={sheet3Rows}
        variant="sheet3"
        leftPageNo={4}
        rightPageNo={5}
        monthName={monthName}
        standard={data.standard}
        section={data.section}
        yearShort={yearShort}
        month={data.month}
        year={data.year}
      />

      {/* ── Page 6: portrait reports ───────────────── */}
      <div className="patrak-sheet patrak-portrait patrak-sheet-last">
        <div className="patrak-screen-label no-print">છેલ્લું પાનું — અહેવાલ (નવા દાખલ / શાળા છોડી)</div>

        <h3 className="patrak-sec-title">નવા દાખલ થયેલ વિદ્યાર્થીઓનો અહેવાલ</h3>
        <table className="patrak-tbl patrak-adm">
          <thead>
            <tr>
              <th className="patrak-w-ser2">અનુક્રમ નંબર</th>
              <th className="patrak-w-gr2">જ.ર. નંબર</th>
              <th>વિદ્યાર્થીનું નામ</th>
              <th className="patrak-w-date2">દાખલ તારીખ</th>
              <th className="patrak-w-note2">નોંધ</th>
            </tr>
          </thead>
          <tbody>
            {adm.map((r) => (
              <tr key={r.serial}>
                <td className="patrak-c">{g(r.serial)}</td>
                <td>{r.grNumber}</td>
                <td>{r.name}</td>
                <td>{r.admissionDate}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <LeaversReportTable
          key={`lev-${leavers.map((r) => r.grNumber).join("|") || "empty"}-${leavers.length}`}
          initialRows={leavers}
        />

        <p className="patrak-decl">ઉપરના ખાનાઓમાં ભરેલી હકીકત જનરલ રજીસ્ટર પ્રમાણે ખરી છે.</p>
        <div className="patrak-sigs patrak-sigs-rpt">
          <span>વર્ગ શિક્ષક<br /><small className="patrak-sig-date">તા.{"\u00a0".repeat(8)}- ૨૦</small></span>
          <span>તપાસનીશ<br /><small className="patrak-sig-date">તા.{"\u00a0".repeat(8)}- ૨૦</small></span>
          <span>આચાર્ય / આચાર્યા<br /><small className="patrak-sig-date">તા.{"\u00a0".repeat(8)}- ૨૦</small></span>
        </div>
      </div>

      <style jsx global>{`
        .patrak-root {
          font-family: ${FONT};
          color: ${INK};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          display: block;
          width: 100%;
          overflow-x: auto;
          padding: 8px 4px 32px;
        }
        .patrak-root .patrak-sheet {
          box-sizing: border-box;
          background: #fff;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          margin: 0 auto 28px;
          box-shadow: 0 6px 24px rgba(0,0,0,.12);
          overflow: visible;
          border: 1px solid #d8e2e8;
        }
        .patrak-root .patrak-portrait {
          page: patrak-portrait;
          width: 210mm;
          min-height: 297mm;
          height: auto;
          padding: 6mm 5mm;
          display: flex;
          flex-direction: column;
          overflow: visible;
          box-sizing: border-box;
        }
        .patrak-root .patrak-landscape {
          page: patrak-landscape;
          width: 297mm;
          min-height: 210mm;
          height: auto;
          padding: 4mm 5mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .patrak-root .patrak-sheet-last {
          page-break-after: auto;
          break-after: auto;
        }
        .patrak-root .patrak-screen-label {
          display: none;
        }
        .patrak-root .patrak-title {
          text-align: center;
          font-size: 15pt;
          font-weight: 700;
          margin: 0 0 4mm;
          letter-spacing: 0.03em;
        }
        .patrak-root .patrak-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 2mm 6mm;
          font-size: 10pt;
          margin-bottom: 3.5mm;
        }
        .patrak-root .patrak-fill { min-width: 22mm; display: inline-block; }
        .patrak-root .patrak-ul {
          display: inline-block;
          min-width: 12mm;
          border-bottom: 1px solid ${INK};
          padding: 0 1mm;
        }
        .patrak-root .patrak-ul-wide {
          display: inline-block;
          min-width: 35mm;
          border-bottom: 1px solid ${INK};
          margin: 0 2mm;
        }
        .patrak-root .patrak-tbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          table-layout: fixed;
        }
        .patrak-root .patrak-tbl th,
        .patrak-root .patrak-tbl td {
          border: 1px solid ${INK};
          padding: 2px 3px;
          vertical-align: middle;
          line-height: 1.25;
          color: ${INK};
          background: #fff;
        }
        .patrak-root .patrak-tbl th {
          font-weight: 600;
          text-align: center;
        }
        .patrak-root .patrak-c { text-align: center; }
        .patrak-root .patrak-move {
          font-size: 5.8pt;
          margin-bottom: 3mm;
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
          box-sizing: border-box;
        }
        .patrak-root .patrak-move thead th {
          overflow: hidden;
        }
        .patrak-root .patrak-type-hdr {
          width: 15%;
          overflow: hidden;
        }
        .patrak-root .patrak-move td,
        .patrak-root .patrak-move th {
          padding: 1px 1px;
          height: auto;
          min-height: 5mm;
          word-break: break-word;
          overflow: hidden;
        }
        .patrak-root .patrak-type-hdr { width: 16%; }
        .patrak-root .patrak-waiver-side { width: 6mm; padding: 0 !important; overflow: hidden; }
        .patrak-root .patrak-waiver-side span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: inline-block;
          font-size: 7pt;
          letter-spacing: 0.04em;
          max-height: 100%;
        }
        .patrak-root .patrak-vhdr { padding: 0 1px; overflow: hidden; }
        .patrak-root .patrak-vhdr span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: inline-block;
          font-size: 6.5pt;
          line-height: 1.05;
          white-space: nowrap;
        }
        .patrak-root .patrak-total-row td { font-weight: 700; }
        .patrak-root .patrak-cls-title {
          text-align: center;
          font-size: 9.5pt;
          font-weight: 600;
          margin: 3.5mm 0 2mm;
        }
        .patrak-root .patrak-cls { font-size: 8.5pt; margin-bottom: 2mm; }
        .patrak-root .patrak-cls td { height: 9mm; }
        .patrak-root .patrak-w-avg { width: 14mm; }
        .patrak-root .patrak-sigs {
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
          margin-top: auto;
          padding-top: 12mm;
        }
        .patrak-root .patrak-sigs span { flex: 1; text-align: center; }
        .patrak-root .patrak-sigs-rpt { margin-top: 6mm; padding-top: 6mm; }
        .patrak-root .patrak-sigs-rpt small { font-size: 7pt; }
        .patrak-root .patrak-sig-date { letter-spacing: 0.05em; }

        .patrak-root .patrak-reg-page {
          --patrak-meta-h: 6.5mm;
          --patrak-colhdr-h: 48mm;
          --patrak-hdr-h: calc(var(--patrak-meta-h) + var(--patrak-colhdr-h));
          --patrak-row-h: 3.35mm;
          --patrak-foot-h: 4mm;
          width: 100%;
        }
        /* Joint open-book: one table, continuous lines */
        .patrak-root .patrak-spread {
          display: flex;
          flex-direction: column;
          width: 297mm;
          max-width: 297mm;
          min-height: 210mm;
          box-sizing: border-box;
        }
        .patrak-root .patrak-spread-markers {
          display: flex;
          flex-direction: row;
          height: 4.5mm;
          min-height: 4.5mm;
          margin-bottom: 1mm;
          flex-shrink: 0;
        }
        .patrak-root .patrak-spread-marker-slot {
          flex: 1 1 50%;
          text-align: center;
        }
        .patrak-root .patrak-spread-marker-slot .patrak-pg-marker {
          margin: 0 auto;
        }
        .patrak-root .patrak-unified {
          width: 100%;
          flex: 1 1 auto;
          border: 2.5px double ${INK};
          table-layout: fixed;
          border-collapse: collapse;
        }
        .patrak-root .patrak-fold {
          width: 1.2mm !important;
          max-width: 1.2mm !important;
          min-width: 1.2mm !important;
          padding: 0 !important;
          border-left: 2px solid ${INK} !important;
          border-right: 2px solid ${INK} !important;
          background: #e8f2f6 !important;
        }
        .patrak-root .patrak-unified thead th[rowspan="2"] {
          height: var(--patrak-hdr-h);
          vertical-align: bottom;
        }
        .patrak-root .patrak-unified .patrak-reg-h1 { height: var(--patrak-meta-h); }
        .patrak-root .patrak-unified .patrak-reg-h2 { height: var(--patrak-colhdr-h); }
        .patrak-root .patrak-unified .patrak-fee-group {
          height: var(--patrak-meta-h) !important;
          font-size: 9pt;
          font-weight: 700;
          vertical-align: middle !important;
        }
        .patrak-root .patrak-unified .patrak-reg-hdr-cell {
          height: var(--patrak-meta-h) !important;
          font-size: 7.5pt;
          vertical-align: middle !important;
          white-space: nowrap;
          padding: 0.5mm 1mm !important;
          overflow: hidden;
        }
        .patrak-root .patrak-unified tbody td,
        .patrak-root .patrak-unified tfoot td {
          height: var(--patrak-row-h) !important;
          min-height: var(--patrak-row-h) !important;
          max-height: var(--patrak-row-h) !important;
          padding: 0 1px !important;
          font-size: 6.5pt;
          line-height: 1;
          overflow: hidden;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .patrak-root .patrak-unified tfoot td {
          height: var(--patrak-foot-h) !important;
          min-height: var(--patrak-foot-h) !important;
          max-height: var(--patrak-foot-h) !important;
        }
        .patrak-root .patrak-unified .patrak-day-h,
        .patrak-root .patrak-unified .patrak-day-c,
        .patrak-root .patrak-unified .patrak-day-f {
          width: 3.5mm !important;
          max-width: 3.5mm !important;
          padding: 0 !important;
          text-align: center;
          font-size: 5.5pt;
        }
        .patrak-root .patrak-unified .patrak-w-gr { width: 8mm; }
        .patrak-root .patrak-unified .patrak-w-dob { width: 11mm; }
        .patrak-root .patrak-unified .patrak-w-caste { width: 6mm; }
        .patrak-root .patrak-unified .patrak-w-cat { width: 7mm; }
        .patrak-root .patrak-unified .patrak-w-ser { width: 5.5mm !important; min-width: 5.5mm; }
        .patrak-root .patrak-unified .patrak-w-name { width: 28mm; min-width: 24mm; }
        .patrak-root .patrak-unified .patrak-w-sum {
          width: 14mm !important;
          min-width: 14mm !important;
          max-width: 15mm !important;
        }
        .patrak-root .patrak-unified .patrak-w-note {
          width: 9mm !important;
          min-width: 9mm !important;
        }
        .patrak-root .patrak-unified .patrak-w-date { width: 6mm; }
        .patrak-root .patrak-unified .patrak-w-sign { width: 6mm; }
        .patrak-root .patrak-unified .patrak-fee-sub { width: 5.2mm; }
        /* Vertical headers: do not clip long Gujarati labels */
        .patrak-root .patrak-unified th.patrak-vhdr {
          overflow: visible !important;
          vertical-align: bottom !important;
          padding: 1px 1px !important;
        }
        .patrak-root .patrak-unified th.patrak-vhdr > span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: inline-block;
          max-height: none !important;
          font-size: 5.5pt !important;
          line-height: 1.2 !important;
          letter-spacing: 0.015em;
          white-space: nowrap;
          overflow: visible !important;
          text-overflow: clip;
          padding: 0 0 2px;
        }
        .patrak-root .patrak-day-edit {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          margin: 0 0 6px;
          font-size: 12px;
          color: #64748b;
        }
        .patrak-root .patrak-day-edit label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .patrak-root .patrak-unified th.patrak-w-sum > span {
          font-size: 5pt !important;
          line-height: 1.25 !important;
          max-height: none !important;
        }
        .patrak-root .patrak-unified th.patrak-w-sum .patrak-hdr-dots-inp {
          writing-mode: horizontal-tb !important;
          transform: none !important;
          display: inline-block;
          width: 2.6em;
          min-width: 2em;
          max-width: 3em;
          font-size: 5.5pt;
          margin: 0 0.4mm;
          vertical-align: baseline;
        }
        .patrak-root .patrak-unified th.patrak-w-note > span {
          font-size: 7.5pt !important;
          font-weight: 700;
        }
        .patrak-root .patrak-unified th.patrak-w-sum {
          overflow: hidden !important;
        }
        .patrak-root .patrak-unified .patrak-vstack {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          display: inline-block;
          white-space: nowrap;
          font-size: 4.8pt !important;
          line-height: 1.15 !important;
          letter-spacing: 0.02em;
          overflow: hidden;
          max-height: calc(var(--patrak-colhdr-h) - 2mm);
          font-weight: 600;
        }
        .patrak-root .patrak-unified .patrak-name-hdr {
          font-size: 5pt !important;
          line-height: 1.2 !important;
          padding: 2px 3px !important;
          white-space: normal !important;
          writing-mode: horizontal-tb !important;
          transform: none !important;
          overflow: visible !important;
          text-align: center;
          vertical-align: middle !important;
          font-weight: 600;
        }
        .patrak-root .patrak-unified .patrak-name-cell {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 6.5pt;
          text-align: left;
          padding: 0 2px !important;
        }
        .patrak-root .patrak-pg-marker {
          font-size: 10pt;
          font-weight: 600;
          z-index: 3;
          background: #fff;
          padding: 0 3mm;
          white-space: nowrap;
          line-height: 1.2;
          color: ${INK};
        }
        .patrak-root .patrak-pg-marker-center {
          position: relative;
          text-align: center;
          margin: 0 auto 2mm;
          width: fit-content;
        }
        .patrak-root .patrak-reg-left-page,
        .patrak-root .patrak-reg-right-page {
          width: 100%;
          flex: 1 1 auto;
          border: 2.5px double ${INK};
          table-layout: fixed;
          border-spacing: 0;
        }
        .patrak-root .patrak-reg-left-page { font-size: 8pt; }
        .patrak-root .patrak-reg-right-page { font-size: 7.5pt; }
        .patrak-root .patrak-reg-h1 { height: var(--patrak-meta-h); }
        .patrak-root .patrak-reg-h2 { height: var(--patrak-colhdr-h); }
        .patrak-root .patrak-reg-left-page thead th[rowspan="2"],
        .patrak-root .patrak-reg-right-page thead th[rowspan="2"] {
          height: var(--patrak-hdr-h);
          vertical-align: bottom;
          padding: 2px 2px;
        }
        .patrak-root .patrak-fee-group {
          height: var(--patrak-meta-h) !important;
          padding: 1px 3px !important;
          font-size: 10pt;
          font-weight: 700;
          vertical-align: middle !important;
          white-space: nowrap;
        }
        .patrak-root .patrak-fee-sub {
          height: var(--patrak-colhdr-h) !important;
          vertical-align: bottom;
        }
        .patrak-root .patrak-name-hdr {
          writing-mode: horizontal-tb !important;
          transform: none !important;
          font-size: 8pt !important;
          font-weight: 600;
          line-height: 1.25;
          white-space: normal;
          text-align: center;
          vertical-align: middle;
          padding: 3px 5px;
        }
        .patrak-root .patrak-reg-hdr-cell {
          height: var(--patrak-meta-h) !important;
          vertical-align: middle !important;
          text-align: center;
          font-size: 10pt;
          font-weight: 600;
          padding: 1.5mm 2mm !important;
          border-bottom: 1px solid ${INK} !important;
          white-space: nowrap;
        }
        .patrak-root .patrak-reg-hdr-cell .patrak-ul {
          display: inline-block;
          min-width: 10mm;
          border-bottom: 1px solid ${INK};
          padding: 0 1mm;
          font-weight: 700;
        }
        .patrak-root .patrak-reg-hdr-cell .patrak-ul-md { min-width: 18mm; }
        .patrak-root .patrak-hdr-dots-inp {
          display: inline-block;
          width: 3.5em;
          min-width: 3em;
          max-width: 4.5em;
          border: none;
          border-bottom: 1px dotted ${INK};
          background: transparent;
          color: ${INK};
          font: inherit;
          font-size: 7.5pt;
          font-weight: 700;
          text-align: center;
          padding: 0;
          margin: 0 0.3mm;
          line-height: 1;
          outline: none;
          appearance: textfield;
        }
        .patrak-root .patrak-hdr-dots-inp.has-val { border-bottom-style: solid; }
        .patrak-root .patrak-hdr-dots-inp::placeholder {
          color: ${INK};
          opacity: 0.85;
          letter-spacing: 0.5px;
        }
        .patrak-root .patrak-reg-h2 th {
          height: var(--patrak-colhdr-h);
          vertical-align: bottom;
          padding-bottom: 1px;
        }
        .patrak-root .patrak-day-h {
          vertical-align: middle;
          height: var(--patrak-colhdr-h);
          font-size: 7.5pt;
          font-weight: 700;
        }
        .patrak-root .patrak-ser-cell { font-weight: 700; font-size: 8pt; }
        .patrak-root .patrak-day-h,
        .patrak-root .patrak-day-c,
        .patrak-root .patrak-day-f {
          width: 6.2mm;
          max-width: 6.2mm;
          padding: 0 !important;
          text-align: center;
          font-size: 7pt;
        }
        .patrak-root .patrak-reg-left-page tbody td,
        .patrak-root .patrak-reg-left-page tfoot td,
        .patrak-root .patrak-reg-right-page tbody td,
        .patrak-root .patrak-reg-right-page tfoot td {
          height: var(--patrak-row-h);
          min-height: var(--patrak-row-h);
          box-sizing: border-box;
          padding: 0 2px;
          white-space: nowrap;
          overflow: hidden;
        }
        .patrak-root .patrak-reg-left-page tbody td.patrak-name-cell {
          text-overflow: ellipsis;
        }
        .patrak-root .patrak-reg-left-page tbody td { font-size: 8pt; }
        .patrak-root .patrak-reg-right-page tbody td { font-size: 7.5pt; }
        .patrak-root .patrak-day-c {
          height: var(--patrak-row-h) !important;
        }
        .patrak-root .patrak-w-gr { width: 13mm; }
        .patrak-root .patrak-w-dob { width: 15mm; }
        .patrak-root .patrak-w-name { width: auto; }
        .patrak-root .patrak-w-caste { width: 11mm; }
        .patrak-root .patrak-w-cat { width: 13mm; }
        .patrak-root .patrak-w-ser { width: 9mm; }
        .patrak-root .patrak-w-date { width: 10mm; }
        .patrak-root .patrak-w-sign { width: 12mm; }
        .patrak-root .patrak-w-sum { width: 11mm; max-width: 11mm; }
        .patrak-root .patrak-w-note { width: 11mm; }
        .patrak-root .patrak-foot-lbl { font-weight: 600; font-size: 8pt; }
        .patrak-root .patrak-summary-row td { font-size: 7.5pt; }
        .patrak-root .patrak-summary-lbl {
          text-align: left;
          padding-left: 3px;
          font-weight: 600;
          white-space: nowrap;
        }

        .patrak-root .patrak-rpt-title {
          text-align: center;
          font-size: 10pt;
          font-weight: 700;
          margin: 2mm 0 3mm;
        }
        .patrak-root .patrak-sec-title {
          text-align: center;
          font-size: 10pt;
          font-weight: 700;
          margin: 4mm 0 2mm;
        }
        .patrak-root .patrak-sec-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin: 5mm 0 2mm;
        }
        .patrak-root .patrak-sec-title-inline {
          margin: 0;
          text-align: left;
          flex: 1;
        }
        .patrak-root .patrak-add-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1.5px dashed ${INK};
          background: #f0f7fa;
          color: ${INK};
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
        }
        .patrak-root .patrak-add-row:hover { background: #e2f0f5; }
        .patrak-root .patrak-add-row-below {
          width: 100%;
          justify-content: center;
          margin-top: 8px;
          padding: 8px 12px;
        }
        .patrak-root .patrak-add-ico {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${INK};
          color: #fff;
          font-size: 14px;
          line-height: 1;
          font-weight: 700;
        }
        .patrak-root .patrak-del-row {
          border: none;
          background: transparent;
          color: #b45353;
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .patrak-root .patrak-del-row:hover { background: #fce8e8; }
        .patrak-root .patrak-w-act { width: 8mm; }
        .patrak-root .patrak-cell-inp {
          display: block;
          width: 100%;
          border: none;
          background: transparent;
          color: ${INK};
          font: inherit;
          font-size: inherit;
          padding: 0 1px;
          margin: 0;
          outline: none;
          box-sizing: border-box;
          min-width: 0;
        }
        .patrak-root .patrak-cell-inp::placeholder { color: ${INK}; opacity: 0.35; }
        .patrak-root .patrak-cell-inp:focus { background: #f5fbfd; }
        .patrak-root .patrak-adm td,
        .patrak-root .patrak-lev td { height: 6.5mm; vertical-align: middle; }
        .patrak-root .patrak-w-gr2 { width: 12mm; }
        .patrak-root .patrak-w-waiver { width: 8mm; }
        .patrak-root .patrak-w-sm { width: 6mm; }
        .patrak-root .patrak-w-pres { width: 8mm; }
        .patrak-root .patrak-adm { font-size: 8pt; margin-bottom: 3mm; }
        .patrak-root .patrak-lev { font-size: 7pt; }
        .patrak-root .patrak-w-ser2 { width: 10mm; }
        .patrak-root .patrak-w-date2,
        .patrak-root .patrak-w-note2 { width: 14mm; }
        .patrak-root .patrak-w-lev { width: 7mm; }
        .patrak-root .patrak-decl { text-align: center; font-size: 8.5pt; margin: 5mm 0 3mm; }
        .patrak-root .print-only { display: none; }

        @page patrak-portrait {
          size: A4 portrait;
          margin: ${A4P.margin};
        }
        @page patrak-landscape {
          size: A4 landscape;
          margin: ${A4L.margin};
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: ${A4P.margin};
          }
          @page patrak-portrait {
            size: A4 portrait;
            margin: ${A4P.margin};
          }
          @page patrak-landscape {
            size: A4 landscape;
            margin: ${A4L.margin};
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .print-area {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .patrak-root {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .patrak-root .patrak-sheet {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
          }
          .patrak-root .patrak-sheet-last {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .patrak-root .patrak-screen-label { display: none !important; }

          .patrak-root .patrak-portrait {
            page: patrak-portrait !important;
            width: ${A4P.w} !important;
            min-height: ${A4P.h} !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .patrak-root .patrak-landscape {
            page: patrak-landscape !important;
            width: ${A4L.w} !important;
            min-height: ${A4L.h} !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .patrak-root .patrak-reg-page {
            --patrak-meta-h: 6.5mm;
            --patrak-colhdr-h: 48mm;
            --patrak-row-h: 3.35mm;
            --patrak-foot-h: 4mm;
          }
          .patrak-root .patrak-spread {
            width: ${A4L.w} !important;
            max-width: ${A4L.w} !important;
            min-height: ${A4L.h} !important;
          }

          .patrak-root .patrak-title { font-size: 14pt; margin-bottom: 3mm; }
          .patrak-root .patrak-meta { font-size: 9.5pt; margin-bottom: 2.5mm; gap: 2mm 5mm; }
          .patrak-root .patrak-move { font-size: 6pt; margin-bottom: 2.5mm; }
          .patrak-root .patrak-move td,
          .patrak-root .patrak-move th { padding: 1px 1px; height: auto; min-height: 5mm; }
          .patrak-root .patrak-cls-title { font-size: 9pt; margin: 2.5mm 0 1.5mm; }
          .patrak-root .patrak-cls { font-size: 8pt; margin-bottom: 2mm; }
          .patrak-root .patrak-cls td { height: 8mm; }
          .patrak-root .patrak-sigs {
            margin-top: auto;
            padding-top: 10mm;
            font-size: 10pt;
          }
          .patrak-root .patrak-sigs-rpt {
            margin-top: 5mm;
            padding-top: 5mm;
          }

          .patrak-root .patrak-sec-title { font-size: 10pt; margin: 3mm 0 2mm; }
          .patrak-root .patrak-adm { font-size: 8pt; margin-bottom: 3mm; }
          .patrak-root .patrak-lev { font-size: 7.5pt; }
          .patrak-root .patrak-adm td,
          .patrak-root .patrak-lev td { height: 6.5mm; }
          .patrak-root .patrak-decl { font-size: 8.5pt; margin: 4mm 0 3mm; }

          .patrak-root,
          .patrak-root * {
            visibility: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .patrak-root .no-print { display: none !important; }
          .patrak-root .print-only { display: block !important; }
          .patrak-root .patrak-cell-inp,
          .patrak-root .patrak-hdr-dots-inp {
            background: transparent !important;
            box-shadow: none !important;
          }
        }

        @media screen {
          .patrak-root .patrak-screen-label {
            display: block;
            text-align: center;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            margin: 0 0 8px;
            letter-spacing: 0.02em;
          }
          .patrak-root {
            padding: 8px 12px 24px;
            box-sizing: border-box;
          }
          .patrak-root .patrak-sheet {
            margin-left: 0;
            margin-right: 0;
          }
          .patrak-root .patrak-portrait {
            width: 100%;
            max-width: 210mm;
            min-height: 0;
            height: auto;
            padding: 5mm 4mm;
            box-sizing: border-box;
          }
          .patrak-root .patrak-landscape {
            width: 100%;
            max-width: 297mm;
            min-height: 0;
            height: auto;
            padding: 4mm 5mm;
            box-sizing: border-box;
          }
          .patrak-root .patrak-spread {
            width: 100%;
            max-width: 297mm;
          }
        }
      `}</style>
    </div>
  );
}
