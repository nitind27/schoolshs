"use client";

import type { ReactNode } from "react";
import { studentFullNameGu } from "@/lib/student-names";
import type { ResultCardData } from "@/components/results/annual-result-card";
import {
  PRAGATI_GRADE_BANDS,
  PRAGATI_SCHOOL_BRAND,
  buildPragatiSubjectRows,
  pragatiResultLabel,
  sumPragatiColumn,
  type PragatiSubjectInput,
  type PragatiSubjectRow,
} from "@/lib/results/pragati-patrak";
import "./songadh-pragati-patrak.css";

export type PragatiPatrakCardData = ResultCardData & {
  subjects: Array<
    ResultCardData["subjects"][number] & {
      first?: number | null;
      second?: number | null;
      letterGrade?: string | null;
    }
  >;
  schoolCode?: string;
  brand?: {
    trustGu?: string;
    nameGu?: string;
    sectionGu?: string;
    diseCode?: string;
    logoPath?: string | null;
  };
};

function toGuDigits(n: number | string | null | undefined): string {
  if (n == null || n === "") return "";
  const gu = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  return String(n).replace(/\d/g, (d) => gu[parseInt(d, 10)]);
}

function dashOr(val: number | string | null | undefined, applicable: boolean) {
  if (!applicable) return "—";
  if (val == null || val === "") return "";
  return toGuDigits(val);
}

function markOnly(marks: number | null, applicable: boolean) {
  if (!applicable) return "—";
  if (marks == null) return "";
  return toGuDigits(marks);
}

function gradeOnly(grade: string, applicable: boolean) {
  if (!applicable) return "—";
  return grade || "";
}

function fmtPct(pct: number | null) {
  if (pct == null) return "";
  const rounded = Math.round(pct * 100) / 100;
  return toGuDigits(rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(2));
}

function Blank({ w = 80 }: { w?: number }) {
  return <span className="pp-blank" style={{ minWidth: w }} />;
}

function ValueOrBlank({
  value,
  w = 80,
}: {
  value?: ReactNode;
  w?: number;
}) {
  if (value == null || value === "") return <Blank w={w} />;
  return (
    <span className="pp-fill" style={{ minWidth: w }}>
      {value}
    </span>
  );
}

function GradeLegend() {
  return (
    <div className="pp-legend">
      <div className="pp-legend-title">પ્રગતિ મૂલ્યાંકન</div>
      <table>
        <tbody>
          {PRAGATI_GRADE_BANDS.map((b) => (
            <tr key={b.grade}>
              <td className="pp-legend-g">{b.grade}</td>
              <td className="pp-legend-colon">:</td>
              <td className="pp-legend-label">{b.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Official-style circular seal (torch) matching Songadh primary card */
function SongadhSeal() {
  return (
    <svg
      className="pp-seal"
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <path id="ppSealArc" d="M 28,108 A 72,72 0 1,1 172,108" fill="none" />
      </defs>
      <circle cx="100" cy="100" r="92" fill="#f7e7a0" stroke="#8b1a1a" strokeWidth="4" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="#8b1a1a" strokeWidth="1.5" />
      <text
        fill="#8b1a1a"
        fontSize="11.5"
        fontWeight="700"
        letterSpacing="1.2"
        fontFamily="Noto Sans Gujarati, Shruti, sans-serif"
      >
        <textPath href="#ppSealArc" xlinkHref="#ppSealArc" startOffset="50%" textAnchor="middle">
          સાર્વજનિક હાઈસ્કૂલ ફોર્ટ-સોનગઢ
        </textPath>
      </text>
      {/* torch */}
      <g transform="translate(100,118)" fill="#8b1a1a">
        <path d="M-7,-8 h14 v38 h-14 z" />
        <path d="M-11,-8 h22 l-4,-10 h-14 z" />
        <path d="M-2,30 h4 v18 h-4 z" />
        <path d="M-14,48 h28 v4 h-28 z" />
        <path
          d="M0,-18 c6,-10 14,-16 10,-28 c-8,4 -10,12 -10,20 c0,-8 -2,-16 -10,-20 c-4,12 4,18 10,28 z"
          fill="#8b1a1a"
        />
      </g>
      <text
        x="100"
        y="178"
        textAnchor="middle"
        fill="#8b1a1a"
        fontSize="11"
        fontWeight="700"
        fontFamily="Noto Sans Gujarati, Shruti, sans-serif"
      >
        જિ. તાપી
      </text>
      {/* ribbon */}
      <path
        d="M40,196 L58,188 L100,196 L142,188 L160,196 L142,204 L100,198 L58,204 Z"
        fill="#8b1a1a"
      />
      <path
        d="M58,188 L58,204 M142,188 L142,204"
        stroke="#f7e7a0"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function RemarksBlock({
  title,
  result,
  grade,
  attendancePresent,
  attendanceTotal,
  showResultDate = true,
}: {
  title?: string;
  result: string;
  grade: string;
  attendancePresent?: number | null;
  attendanceTotal?: number | null;
  showResultDate?: boolean;
}) {
  const passFail =
    result === "પાસ" || result === "નાપાસ" ? result : result || "";

  return (
    <div className="pp-remarks-section">
      {title ? <div className="pp-remarks-head">{title}</div> : null}
      <div className="pp-remarks-block">
        <div className="pp-rm-fields">
          <div className="pp-rm-line">
            <span className="pp-rm-fixed">પાસ / નાપાસ થાય છે.</span>
            {passFail ? <strong className="pp-rm-val">{passFail}</strong> : null}
          </div>

          <div className="pp-rm-line">
            <span>સરેરાશ ગ્રેડ</span>
            <span className="pp-rm-dots">
              {grade ? <strong>{grade}</strong> : null}
            </span>
          </div>

          <div className="pp-rm-line">
            <span>અભ્યાસ</span>
            <span className="pp-rm-dots" />
          </div>

          <div className="pp-rm-line">
            <span>વર્તણુંક</span>
            <span className="pp-rm-dots" />
          </div>

          <div className="pp-rm-line pp-rm-attend">
            <span>હાજરી કુલ</span>
            <span className="pp-rm-dots pp-rm-dots-sm">
              {attendanceTotal != null ? (
                <strong>{toGuDigits(attendanceTotal)}</strong>
              ) : null}
            </span>
            <span>માંથી</span>
          </div>

          <div className="pp-rm-line pp-rm-attend">
            <span className="pp-rm-dots pp-rm-dots-sm">
              {attendancePresent != null ? (
                <strong>{toGuDigits(attendancePresent)}</strong>
              ) : null}
            </span>
            <span>હાજર દિવસ</span>
          </div>

          {showResultDate ? (
            <div className="pp-rm-line">
              <span>પરિણામ તારીખ :-</span>
              <span className="pp-rm-dots" />
            </div>
          ) : null}
        </div>

        <div className="pp-rm-signs">
          <div className="pp-rm-sign">વર્ગ શિક્ષક :-</div>
          <div className="pp-rm-sign">આચાર્ય :-</div>
          <div className="pp-rm-sign">વાલી :-</div>
        </div>
      </div>
    </div>
  );
}

function MarksTable({ rows }: { rows: PragatiSubjectRow[] }) {
  const t1 = sumPragatiColumn(rows, "sem1");
  const t2 = sumPragatiColumn(rows, "sem2");
  const ty = sumPragatiColumn(rows, "annual");

  return (
    <table className="pp-table">
      <colgroup>
        <col className="pp-col-subject" />
        <col className="pp-col-max" />
        <col className="pp-col-obt" />
        <col className="pp-col-grd" />
        <col className="pp-col-max" />
        <col className="pp-col-obt" />
        <col className="pp-col-grd" />
        <col className="pp-col-max" />
        <col className="pp-col-obt" />
        <col className="pp-col-grd" />
      </colgroup>
      <thead>
        <tr>
          <th rowSpan={2} className="pp-col-detail">
            વિગત
          </th>
          <th colSpan={3}>પ્રથમ સત્ર</th>
          <th colSpan={3}>દ્વિતીય સત્ર</th>
          <th colSpan={3}>વર્ષાન્તે</th>
        </tr>
        <tr>
          <th className="pp-th-max">
            કુલ
            <br />
            ગુણ
          </th>
          <th colSpan={2} className="pp-th-obt">
            મેળવેલ ગુણ - ગ્રેડ
          </th>
          <th className="pp-th-max">
            કુલ
            <br />
            ગુણ
          </th>
          <th colSpan={2} className="pp-th-obt">
            મેળવેલ ગુણ - ગ્રેડ
          </th>
          <th className="pp-th-max">
            કુલ
            <br />
            ગુણ
          </th>
          <th colSpan={2} className="pp-th-obt">
            મેળવેલ ગુણ - ગ્રેડ
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const s1 = r.sem1Max != null;
          const s2 = r.sem2Max != null;
          const sy = r.annualMax != null;
          return (
            <tr key={r.key}>
              <td className="pp-left">{r.name}</td>
              <td>{dashOr(r.sem1Max, s1)}</td>
              <td className="pp-cell-obt">{markOnly(r.sem1Obtained, s1)}</td>
              <td className="pp-cell-grd">{gradeOnly(r.sem1Grade, s1)}</td>
              <td>{dashOr(r.sem2Max, s2)}</td>
              <td className="pp-cell-obt">{markOnly(r.sem2Obtained, s2)}</td>
              <td className="pp-cell-grd">{gradeOnly(r.sem2Grade, s2)}</td>
              <td>{dashOr(r.annualMax, sy)}</td>
              <td className="pp-cell-obt">{markOnly(r.annualObtained, sy)}</td>
              <td className="pp-cell-grd">{gradeOnly(r.annualGrade, sy)}</td>
            </tr>
          );
        })}
        <tr className="pp-sum">
          <td className="pp-left">મેળવેલ ગુણ</td>
          <td colSpan={3}>
            {t1.percentage != null || t1.obtained ? toGuDigits(t1.obtained) : ""}
          </td>
          <td colSpan={3}>
            {t2.percentage != null || t2.obtained ? toGuDigits(t2.obtained) : ""}
          </td>
          <td colSpan={3}>
            {ty.percentage != null || ty.obtained ? toGuDigits(ty.obtained) : ""}
          </td>
        </tr>
        <tr className="pp-sum">
          <td className="pp-left">કુલ ગુણ</td>
          <td colSpan={3}>{t1.max ? toGuDigits(t1.max) : ""}</td>
          <td colSpan={3}>{t2.max ? toGuDigits(t2.max) : ""}</td>
          <td colSpan={3}>{ty.max ? toGuDigits(ty.max) : ""}</td>
        </tr>
        <tr className="pp-sum">
          <td className="pp-left">ટકા (%)</td>
          <td colSpan={3}>
            {fmtPct(t1.percentage)}
            {t1.grade ? ` (${t1.grade})` : ""}
          </td>
          <td colSpan={3}>
            {fmtPct(t2.percentage)}
            {t2.grade ? ` (${t2.grade})` : ""}
          </td>
          <td colSpan={3}>
            {fmtPct(ty.percentage)}
            {ty.grade ? ` (${ty.grade})` : ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function SongadhPragatiPatrakCard({ data }: { data: PragatiPatrakCardData }) {
  const st = data.student as ResultCardData["student"] & {
    dateOfBirth?: string | null;
  };
  const rc = data.reportCard;
  const brand = {
    trustGu: data.brand?.trustGu || PRAGATI_SCHOOL_BRAND.trustGu,
    nameGu: data.brand?.nameGu || PRAGATI_SCHOOL_BRAND.nameGu,
    sectionGu: data.brand?.sectionGu || PRAGATI_SCHOOL_BRAND.sectionGu,
    diseCode: data.brand?.diseCode || data.schoolCode || "",
    logoPath: data.brand?.logoPath ?? PRAGATI_SCHOOL_BRAND.logoPath,
  };

  const inputs: PragatiSubjectInput[] = data.subjects.map((s) => ({
    name: s.name,
    maxMarks: s.maxMarks,
    first: (s as { first?: number | null }).first ?? null,
    second: (s as { second?: number | null }).second ?? null,
    obtained: s.finalMarks ?? s.marksObtained,
    letterGrade: (s as { letterGrade?: string | null }).letterGrade ?? null,
  }));

  const rows = buildPragatiSubjectRows(inputs);
  const t1 = sumPragatiColumn(rows, "sem1");
  const t2 = sumPragatiColumn(rows, "sem2");
  const ty = sumPragatiColumn(rows, "annual");

  const fullName = studentFullNameGu(st);
  const stdSec = [st.standard, st.section].filter(Boolean).join(" / ");
  const year = data.exam.academicYear || "";

  return (
    <div className="pp-sheet annual-result-card">
      {/* Use div (not header/aside) — CertificatePrintShell hides aside/header in print */}
      <div className="pp-header">
        <div className="pp-header-badge">પ્રગતિપત્રક</div>

        <div className="pp-header-grid">
          <div className="pp-logo-wrap">
            <SongadhSeal />
          </div>

          <div className="pp-head-main">
            <div className="pp-trust">{brand.trustGu}</div>
            <div className="pp-school">{brand.nameGu}</div>
            <div className="pp-section">{brand.sectionGu}</div>
            <div className="pp-year">
              વર્ષ :- <ValueOrBlank value={toGuDigits(year)} w={90} />
            </div>
          </div>

          <GradeLegend />
        </div>

        <div className="pp-header-bar">
          <div>
            શાળા ડાયસ કોડ :-{" "}
            <strong>{toGuDigits(brand.diseCode) || brand.diseCode}</strong>
          </div>
          <div>
            વિદ્યાર્થીનો UID નં :-{" "}
            <ValueOrBlank value={toGuDigits(st.childUid)} w={110} />
          </div>
        </div>
      </div>

      <div className="pp-student">
        <div className="pp-stu-row">
          <span>
            વિદ્યાર્થીનું નામ :- <ValueOrBlank value={fullName} w={280} />
          </span>
          <span>
            જન્મ તારીખ :-{" "}
            <ValueOrBlank value={toGuDigits(st.dateOfBirth || "")} w={110} />
          </span>
        </div>
        <div className="pp-stu-row">
          <span>
            ધોરણ/વર્ગ :- <ValueOrBlank value={toGuDigits(stdSec)} w={80} />
          </span>
          <span>
            પરીક્ષા નં :- <ValueOrBlank value={toGuDigits(st.rollNumber)} w={70} />
          </span>
          <span>
            વર્ગ ક્રમાંક :- <ValueOrBlank value={toGuDigits(st.rollNumber)} w={50} />
          </span>
          <span>
            જ.ર.નંબર :- <ValueOrBlank value={toGuDigits(st.grNumber)} w={90} />
          </span>
        </div>
      </div>

      <div className="pp-body">
        <div className="pp-marks-wrap">
          <MarksTable rows={rows} />
        </div>
        <div className="pp-remarks" aria-label="શેરો">
          <div className="pp-remarks-title">શેરો</div>
          {/* 1 — પ્રથમ સત્ર (full, with result date) */}
          <RemarksBlock
            title="પ્રથમ સત્ર"
            result={pragatiResultLabel(t1.percentage)}
            grade={t1.grade}
            attendancePresent={rc?.attendancePresent}
            attendanceTotal={rc?.attendanceTotal}
            showResultDate
          />
          {/* 2 — દ્વિતીય સત્ર (no result date on official form) */}
          <RemarksBlock
            title="દ્વિતીય સત્ર"
            result={pragatiResultLabel(t2.percentage)}
            grade={t2.grade}
            attendancePresent={rc?.attendancePresent}
            attendanceTotal={rc?.attendanceTotal}
            showResultDate={false}
          />
          {/* 3 — વર્ષાન્તે / final block (full, with result date) */}
          <RemarksBlock
            title="વર્ષાન્તે"
            result={
              pragatiResultLabel(ty.percentage) ||
              (rc?.result || "").replace(/\(.*?\)/g, "").trim()
            }
            grade={ty.grade || t2.grade}
            attendancePresent={rc?.attendancePresent}
            attendanceTotal={rc?.attendanceTotal}
            showResultDate
          />
        </div>
      </div>

      <div className="pp-notice">
        <div className="pp-notice-title">સૂચના :-</div>
        <ol className="pp-notice-list">
          <li>
            ઉનાળાની રજાઓ તા. <span className="pp-dotline pp-dotline-md" /> થી તા.{" "}
            <span className="pp-dotline pp-dotline-md" /> સુધીની રહેશે અને શાળા તા.{" "}
            <span className="pp-dotline pp-dotline-md">
              {toGuDigits(
                data.reportCard?.reopeningDate || data.exam.reopeningDate || "",
              )}
            </span>{" "}
            થી રાબેતા મુજબ શરૂ થશે.
          </li>
          <li>
            જે વિદ્યાર્થી નવા સત્રથી શાળા છોડવા માંગતા હોય તેમણે તા.૩૧ મે સુધીમાં
            લેખીત અરજી આપવાની રહેશે. નહિ તો જૂન તથા પ્રથમ સત્રની ફી ભરવાની રહેશે.
          </li>
          <li>
            ખુલતી શાળાએ નિયત કરેલ ગણવેશ પહેરીને ફરજીયાત આવવાનું રહેશે.
          </li>
          <li>
            ઉનાળા વેકેશન દરમ્યાન શાળાની ઓફિસનો સમય જાહેર રજા સિવાય સવારે{" "}
            <span className="pp-dotline pp-dotline-sm" /> થી{" "}
            <span className="pp-dotline pp-dotline-sm" /> વાગ્યા સુધીનો રહેશે.
          </li>
        </ol>
      </div>

      <div className="pp-footer">
        <div className="pp-sign">વર્ગ શિક્ષકની સહી</div>
        <div className="pp-sign">આચાર્યની સહી</div>
      </div>
      <div className="pp-page-rule" aria-hidden />
    </div>
  );
}

export function SongadhPragatiPatrakCards({
  cards,
}: {
  cards: PragatiPatrakCardData[];
}) {
  return (
    <>
      {cards.map((card, i) => (
        <SongadhPragatiPatrakCard
          key={(card.student as { id?: string }).id || i}
          data={card}
        />
      ))}
    </>
  );
}
