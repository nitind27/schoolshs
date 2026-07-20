"use client";

import { Fragment, useCallback, useLayoutEffect, useRef } from "react";
import {
  ANALYSIS_GRADES,
  CATEGORY_COLS,
  marksRangeLabel,
  toGujaratiDigits,
  type AnalysisGrade,
  type BgCounts,
  type CategoryRangeRow,
  type MarksRangeKey,
  type OverallResultAnalysisPayload,
  type SubjectGradeRow,
} from "@/lib/board-records/overall-result-analysis";

const FONT = '"Noto Sans Gujarati", "Noto Sans", Arial, sans-serif';

/** A4 portrait printable area @ 5mm page margin */
const A4 = {
  pageW: "210mm",
  margin: "5mm",
  contentW: "200mm",
  contentH: "285mm",
} as const;

function N({ v }: { v: number }) {
  return <span>{v === 0 ? "" : toGujaratiDigits(v)}</span>;
}

function BgTriple({ c }: { c: BgCounts }) {
  return (
    <>
      <td className="ora-c">
        <N v={c.boys} />
      </td>
      <td className="ora-c">
        <N v={c.girls} />
      </td>
      <td className="ora-c ora-bold">
        <N v={c.total} />
      </td>
    </>
  );
}

function CategoryTable({
  titleHtml,
  rows,
}: {
  titleHtml: React.ReactNode;
  rows: CategoryRangeRow[];
}) {
  return (
    <section className="ora-section ora-section-cat">
      <div className="ora-block-title">{titleHtml}</div>
      <table className="ora-tbl ora-cat">
        <thead>
          <tr>
            <th rowSpan={2} className="ora-th ora-diag">
              <svg
                className="ora-diag-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <line x1="0" y1="0" x2="100" y2="100" stroke="#000" strokeWidth="1.8" />
              </svg>
              <div className="ora-diag-tr">વિદ્યાર્થી</div>
              <div className="ora-diag-bl">ગુણની રેન્જ</div>
            </th>
            {CATEGORY_COLS.map((c) => (
              <th key={c.key} colSpan={3} className="ora-th">
                {c.label}
              </th>
            ))}
            <th colSpan={3} className="ora-th">
              કુલ
            </th>
          </tr>
          <tr>
            {CATEGORY_COLS.map((c) => (
              <Fragment key={c.key}>
                <th className="ora-th ora-sub">કુમાર</th>
                <th className="ora-th ora-sub">કન્યા</th>
                <th className="ora-th ora-sub">કુલ</th>
              </Fragment>
            ))}
            <Fragment>
              <th className="ora-th ora-sub">કુમાર</th>
              <th className="ora-th ora-sub">કન્યા</th>
              <th className="ora-th ora-sub">કુલ</th>
            </Fragment>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.key === "total" ? "ora-tot" : undefined}>
              <td className="ora-lbl">{marksRangeLabel(r.key as MarksRangeKey)}</td>
              {CATEGORY_COLS.map((c) => (
                <BgTriple key={c.key} c={r.cells[c.key]} />
              ))}
              <BgTriple c={r.grand} />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SubjectTable({
  rows,
  totals,
}: {
  rows: SubjectGradeRow[];
  totals: Record<AnalysisGrade, number> & { total: number };
}) {
  return (
    <section className="ora-section ora-section-subj">
      <table className="ora-tbl ora-subtbl">
        <thead>
          <tr>
            <th rowSpan={2} className="ora-th ora-sr">
              ક્રમ
            </th>
            <th rowSpan={2} className="ora-th ora-subj">
              વિષય
            </th>
            <th colSpan={9} className="ora-th">
              વિદ્યાર્થીઓએ મેળવેલ ગ્રેડનું વિષયવાર વિશ્લેષણ
            </th>
            <th rowSpan={2} className="ora-th ora-totcol">
              કુલ સંખ્યા
            </th>
          </tr>
          <tr>
            {ANALYSIS_GRADES.map((g) => (
              <th key={g} className="ora-th ora-g">
                {g}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="ora-c">{toGujaratiDigits(r.serial)}</td>
              <td className="ora-subj-cell">{r.label}</td>
              {ANALYSIS_GRADES.map((g) => (
                <td key={g} className="ora-c">
                  <N v={r.grades[g]} />
                </td>
              ))}
              <td className="ora-c ora-bold">
                <N v={r.total} />
              </td>
            </tr>
          ))}
          <tr className="ora-tot">
            <td colSpan={2} className="ora-c ora-bold">
              કુલ સંખ્યા
            </td>
            {ANALYSIS_GRADES.map((g) => (
              <td key={g} className="ora-c ora-bold">
                <N v={totals[g]} />
              </td>
            ))}
            <td className="ora-c ora-bold">
              <N v={totals.total} />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

export function OverallResultAnalysisForm({
  data,
  boardResultDate,
  onBoardResultDateChange,
}: {
  data: OverallResultAnalysisPayload;
  boardResultDate?: string;
  onBoardResultDateChange?: (v: string) => void;
}) {
  const { meta, subjectRows, subjectTotals, regularRows, nonRegularRows } = data;
  const y = toGujaratiDigits(meta.yearShort);
  const em = toGujaratiDigits(meta.examMonthYear);
  const sheetRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  /** Shrink only if content overflows the bordered sheet (keeps 1 page). */
  const fitToSheet = useCallback(() => {
    const sheet = sheetRef.current;
    const inner = innerRef.current;
    if (!sheet || !inner) return;

    inner.style.zoom = "";
    inner.style.transform = "none";
    inner.style.width = "100%";
    inner.style.height = "100%";

    const availH = sheet.clientHeight;
    const needH = inner.scrollHeight;
    if (!availH || !needH) return;

    const scale = Math.min(1, availH / needH);
    if (scale >= 0.995) return;

    if (typeof CSS !== "undefined" && CSS.supports?.("zoom", "1")) {
      inner.style.zoom = String(scale);
      inner.style.height = `${100 / scale}%`;
    } else {
      inner.style.transformOrigin = "top left";
      inner.style.transform = `scale(${scale})`;
      inner.style.width = `${100 / scale}%`;
      inner.style.height = `${100 / scale}%`;
    }
  }, []);

  useLayoutEffect(() => {
    fitToSheet();
    const onPrint = () => {
      fitToSheet();
      requestAnimationFrame(() => fitToSheet());
    };
    window.addEventListener("beforeprint", onPrint);
    window.addEventListener("resize", fitToSheet);
    const t = window.setTimeout(fitToSheet, 80);
    void document.fonts?.ready?.then(() => fitToSheet());
    return () => {
      window.removeEventListener("beforeprint", onPrint);
      window.removeEventListener("resize", fitToSheet);
      window.clearTimeout(t);
    };
  }, [fitToSheet, data, boardResultDate]);

  return (
    <div className="ora-root ora-print">
      <div className="ora-paper">
        <div className="ora-sheet" ref={sheetRef}>
          <div className="ora-inner" ref={innerRef}>
            <header className="ora-header">
              <h1 className="ora-title">
                <span className="ora-orn">✥</span> પરિણામની સમગ્ર તારીખ{" "}
                <span className="ora-orn">✥</span>
              </h1>
              <div className="ora-subhead">
                <span>મુખ્ય વિષયો માટેના વાર્ષિક મૂલ્યાંકનનું વિશ્લેષણ :</span>
                <span className="ora-board-date">
                  બોર્ડના પરિણામની તારીખ :{" "}
                  {onBoardResultDateChange ? (
                    <input
                      className="ora-date-inp"
                      value={boardResultDate ?? meta.boardResultDate}
                      onChange={(e) => onBoardResultDateChange(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                  ) : (
                    <u>
                      {boardResultDate ||
                        meta.boardResultDate ||
                        "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}
                    </u>
                  )}
                </span>
              </div>
            </header>

            <SubjectTable rows={subjectRows} totals={subjectTotals} />

            <CategoryTable
              titleHtml={
                <>
                  વર્ષ : ૨૦<u>{y}</u> - ની ધો. ૧૦ ની માર્ચ : ૨૦
                  <u>{em}</u> ની બોર્ડની S.S.C. પરીક્ષામાં બેસેલા{" "}
                  <b>રેગ્યુલર</b> વિદ્યાર્થીઓએ મેળવેલ ગુણની રેન્જ પ્રમાણે વિભાજન
                </>
              }
              rows={regularRows}
            />

            <CategoryTable
              titleHtml={
                <>
                  વર્ષ : ૨૦<u>{y}</u> - ની ધો. ૧૦ ની માર્ચ : ૨૦
                  <u>{em}</u> ની બોર્ડની S.S.C. પરીક્ષામાં બેસેલા{" "}
                  <b>નોન રેગ્યુલર</b> વિદ્યાર્થીઓએ મેળવેલ ગુણની રેન્જ પ્રમાણે વિભાજન
                </>
              }
              rows={nonRegularRows}
            />

            <div className="ora-signs">
              <div className="ora-sign">
                <div className="ora-sign-line" />
                <div>વર્ગ શિક્ષકની સહી</div>
              </div>
              <div className="ora-sign">
                <div className="ora-sign-line" />
                <div>તપાસનારની સહી</div>
              </div>
              <div className="ora-sign">
                <div className="ora-sign-line" />
                <div>આચાર્યની સહી</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ora-root {
          font-family: ${FONT};
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .ora-paper {
          width: ${A4.pageW};
          margin: 0 auto 16px;
          background: #e2e8f0;
          padding: ${A4.margin};
          box-sizing: border-box;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }
        .ora-sheet {
          width: ${A4.contentW};
          height: ${A4.contentH};
          max-height: ${A4.contentH};
          box-sizing: border-box;
          background: #fff;
          border: 1.5px solid #000;
          padding: 3.5mm 3.5mm 3mm;
          overflow: hidden;
        }
        .ora-inner {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 3mm;
        }
        .ora-header {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2mm;
        }
        .ora-title {
          text-align: center;
          font-size: 14pt;
          font-weight: 800;
          margin: 0;
          line-height: 1.2;
        }
        .ora-orn {
          font-size: 12pt;
        }
        .ora-subhead {
          display: flex;
          justify-content: space-between;
          gap: 4mm;
          font-size: 8.5pt;
          font-weight: 600;
          line-height: 1.3;
        }
        .ora-board-date u,
        .ora-block-title u {
          text-decoration: none;
          border-bottom: 1px solid #000;
          min-width: 1.4em;
          display: inline-block;
          text-align: center;
        }
        .ora-date-inp {
          border: none;
          border-bottom: 1px solid #000;
          width: 26mm;
          font-size: 8.5pt;
          font-weight: 700;
          background: #fffbeb;
        }
        .ora-section {
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
          min-height: 0;
        }
        .ora-section-subj {
          flex: 1.2 1 0;
        }
        .ora-section-cat {
          flex: 1 1 0;
        }
        .ora-block-title {
          font-size: 7.5pt;
          font-weight: 600;
          margin: 0;
          line-height: 1.35;
          flex: 0 0 auto;
        }
        .ora-tbl {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          flex: 1 1 auto;
        }
        .ora-subtbl {
          font-size: 8pt;
        }
        .ora-cat {
          font-size: 7pt;
        }
        .ora-subtbl th,
        .ora-subtbl td,
        .ora-cat th,
        .ora-cat td {
          border: 1px solid #000;
          padding: 1.2mm 1mm;
          vertical-align: middle;
          box-sizing: border-box;
        }
        /* Equal row heights so tables fill their section (no blank under table) */
        .ora-subtbl tbody tr,
        .ora-cat tbody tr {
          height: 1%;
        }
        .ora-th {
          background: #e4e4e4;
          font-weight: 700;
          text-align: center;
          line-height: 1.2;
        }
        .ora-sub {
          font-size: 6.5pt;
          background: #efefef;
        }
        .ora-g {
          width: 6.5%;
          font-size: 7.5pt;
        }
        .ora-sr {
          width: 6%;
        }
        .ora-subj {
          width: 22%;
        }
        .ora-totcol {
          width: 9%;
        }
        .ora-c {
          text-align: center;
        }
        .ora-subj-cell {
          text-align: left;
          font-weight: 600;
          padding-left: 1.8mm !important;
          font-size: 7.5pt;
        }
        .ora-lbl {
          text-align: left;
          font-weight: 600;
          padding-left: 1.8mm !important;
          font-size: 7pt;
        }
        .ora-bold {
          font-weight: 800;
        }
        .ora-tot td {
          background: #ececec;
          font-weight: 800;
        }
        .ora-diag {
          position: relative;
          width: 16%;
          min-height: 11mm;
          background: #e4e4e4 !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .ora-diag-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .ora-diag-tr {
          position: absolute;
          top: 1mm;
          right: 1.3mm;
          font-size: 6.5pt;
        }
        .ora-diag-bl {
          position: absolute;
          bottom: 1mm;
          left: 1.3mm;
          font-size: 6.5pt;
        }
        .ora-signs {
          display: flex;
          justify-content: space-between;
          gap: 6mm;
          flex: 0 0 auto;
          padding-top: 1mm;
        }
        .ora-sign {
          flex: 1;
          text-align: center;
          font-size: 8.5pt;
          font-weight: 700;
        }
        .ora-sign-line {
          border-bottom: 1px solid #000;
          height: 10mm;
          margin-bottom: 1.5mm;
        }

        @media print {
          @page {
            size: A4 portrait !important;
            margin: 5mm !important;
          }
          .ora-root,
          .ora-root * {
            visibility: visible !important;
          }
          .ora-paper {
            width: ${A4.contentW} !important;
            height: ${A4.contentH} !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .ora-sheet {
            width: ${A4.contentW} !important;
            height: ${A4.contentH} !important;
            max-height: ${A4.contentH} !important;
            padding: 3.5mm 3.5mm 3mm !important;
            margin: 0 !important;
            border: 1.5px solid #000 !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .ora-inner {
            height: 100% !important;
            page-break-inside: avoid !important;
          }
          .ora-section,
          .ora-signs,
          .ora-header {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .ora-date-inp {
            background: transparent !important;
          }
          .ora-th,
          .ora-sub,
          .ora-tot td,
          .ora-diag {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ora-th {
            background: #e4e4e4 !important;
          }
          .ora-sub {
            background: #efefef !important;
          }
          .ora-tot td {
            background: #ececec !important;
          }
          .ora-diag {
            background: #e4e4e4 !important;
          }
          .ora-diag-svg {
            display: block !important;
          }
          .ora-diag-svg line {
            stroke: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
