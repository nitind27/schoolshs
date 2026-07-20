"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { studentFullName } from "@/lib/certificates/date-to-words";

/** Matches official Character/Trial/Bonafide scan — dark navy ink */
const INK = "#1a1a55";
const FONT_SERIF = '"Times New Roman", Times, Georgia, serif';
const FONT_SANS = 'Arial, Helvetica, "Noto Sans", sans-serif';

/**
 * A4 portrait (210×297mm), 6mm margins → 198×285mm
 * Two certificates stacked: each ~198 × 140mm (with cut gap)
 */
const HALF = {
  pageW: "198mm",
  pageH: "140mm",
  gap: "5mm",
} as const;

const CHAR_CERT = {
  schoolTitle: "Shri Sarvajanik HighSchool Fort-Songadh Dist. Tapi",
  section: "Secondary & Higher Secondary Section",
  sscIndex: "79.018",
  hscIndex: "28-003",
  phone: CERTIFICATE_SCHOOL.phone || "222186",
  seal: "/certificates/character-school-seal.svg",
} as const;

type StudentLite = {
  firstName: string;
  middleName?: string | null;
  surname: string;
  gender: string;
};

function Dot({
  value,
  minWidth,
  flex,
  className = "",
}: {
  value?: string;
  minWidth?: string;
  flex?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`ctc-dot ${className}`}
      style={{
        minWidth: minWidth || "28mm",
        flex: flex ? 1 : undefined,
      }}
    >
      {value?.trim() || "\u00a0"}
    </span>
  );
}

function parseIssueDate(issueDate: string) {
  const parts = (issueDate || "").split(/[/\-.]/);
  if (parts.length >= 3) {
    return { d: parts[0], m: parts[1], y: parts[2] };
  }
  return { d: "", m: "", y: "" };
}

function CharacterHalf({
  student,
  grNumber,
  academicYear,
  examName,
  examResult,
  issueDate,
  logoUrl,
}: {
  student: StudentLite;
  grNumber?: string;
  academicYear: string;
  examName?: string;
  examResult?: string;
  issueDate: string;
  logoUrl?: string;
}) {
  const name = studentFullName(student);
  const [y1 = "2025", y2 = "26"] = (academicYear || "2025-26").split("-");
  const y1Short = y1.length === 4 ? y1 : `20${y1.slice(-2)}`;
  const y2Full = y2.length === 4 ? y2 : `${y1Short.slice(0, 2)}${y2.padStart(2, "0").slice(-2)}`;
  const date = parseIssueDate(issueDate);

  return (
    <div className="ctc-sheet">
      <div className="ctc-frame">
        <h1 className="ctc-school">{CHAR_CERT.schoolTitle}</h1>
        <p className="ctc-section">{CHAR_CERT.section}</p>

        <div className="ctc-midhead">
          <div className="ctc-indexes">
            <div>S.S.C. Index No. {CHAR_CERT.sscIndex}</div>
            <div>H.S.C. Index No. {CHAR_CERT.hscIndex}</div>
          </div>
          <div className="ctc-seal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl || CHAR_CERT.seal} alt="" className="ctc-seal-img" />
          </div>
          <div className="ctc-phone">Ph. {CHAR_CERT.phone}</div>
        </div>

        <h2 className="ctc-title">CHARACTER/TRIAL/BONAFIDE CERTIFICATE</h2>

        <div className="ctc-meta">
          <div className="ctc-gr">
            <span>G.R. No. :-</span>
            <Dot value={grNumber || ""} minWidth="24mm" />
          </div>
          <div className="ctc-year">
            <span>Year :-</span>
            <span className="ctc-year-val">
              {y1Short.slice(0, 3)}
              <span className="ctc-year-blank">{y1Short.slice(3) || "\u00a0"}</span>
              <span className="ctc-year-dash">-</span>
              {y2Full.slice(0, 3)}
              <span className="ctc-year-blank">{y2Full.slice(3) || "\u00a0"}</span>
            </span>
          </div>
        </div>

        <div className="ctc-body">
          <p className="ctc-line">
            <span>This is to Certify that</span>
            <Dot value={name} flex className="ctc-name-dot" />
          </p>
          <p className="ctc-line ctc-line-solid">
            Is/Was a Bonafide Student of this School. He she Passed his/her S.S.C./H.S.C.
          </p>
          <p className="ctc-line">
            <span>Examination of</span>
            <Dot value={examName || ""} minWidth="42mm" flex />
            <span className="ctc-at">at the</span>
            <Dot value={examResult || ""} minWidth="36mm" flex />
          </p>
          <p className="ctc-line ctc-line-solid">Trial. And Good Moral Character.</p>
        </div>

        <div className="ctc-foot">
          <div className="ctc-date">
            <span>Date:</span>
            <span className="ctc-date-box">{date.d || ""}</span>
            <span>/</span>
            <span className="ctc-date-box">{date.m || ""}</span>
            <span>/</span>
            <span className="ctc-date-year">
              {date.y ? date.y.slice(0, 3) : "201"}
              <span className="ctc-year-blank">{date.y ? date.y.slice(3) : ""}</span>
            </span>
          </div>
          <div className="ctc-sign" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/** Two identical certificates on one A4 portrait page (top + bottom) */
export function CharacterCertificateView({
  student,
  grNumber,
  academicYear,
  examName,
  examResult,
  issueDate,
  logoUrl,
}: {
  student: StudentLite;
  grNumber?: string;
  academicYear: string;
  examName?: string;
  examResult?: string;
  issueDate: string;
  logoUrl?: string;
}) {
  const props = { student, grNumber, academicYear, examName, examResult, issueDate, logoUrl };

  return (
    <div className="ctc-root ctc-print">
      <div className="ctc-a4">
        <CharacterHalf {...props} />
        <div className="ctc-cut" aria-hidden>
          <span className="ctc-cut-label">✂ cut</span>
        </div>
        <CharacterHalf {...props} />
      </div>

      <style jsx global>{`
        .ctc-root {
          color: ${INK};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .ctc-a4 {
          width: ${HALF.pageW};
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #e8ecf0;
          padding: 4mm;
          box-sizing: border-box;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
        }
        .ctc-sheet {
          width: 100%;
          height: ${HALF.pageH};
          background: #fff;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .ctc-frame {
          box-sizing: border-box;
          height: 100%;
          margin: 2mm;
          padding: 2.5mm 5mm 3mm;
          border: 2px solid ${INK};
          outline: 0.8px solid ${INK};
          outline-offset: 1.8px;
          display: flex;
          flex-direction: column;
        }
        .ctc-cut {
          height: ${HALF.gap};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
        }
        .ctc-cut::before {
          content: "";
          position: absolute;
          left: 2mm;
          right: 2mm;
          border-top: 1px dashed #94a3b8;
        }
        .ctc-cut-label {
          position: relative;
          z-index: 1;
          font-size: 7pt;
          color: #64748b;
          background: #e8ecf0;
          padding: 0 3mm;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .ctc-school {
          margin: 0;
          text-align: center;
          font-family: ${FONT_SERIF};
          font-size: 12.5pt;
          font-weight: 700;
          letter-spacing: 0.01em;
          line-height: 1.12;
          color: ${INK};
        }
        .ctc-section {
          margin: 0.8mm 0 0;
          text-align: center;
          font-family: ${FONT_SANS};
          font-size: 8.5pt;
          font-weight: 700;
          color: ${INK};
        }
        .ctc-midhead {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          margin-top: 1mm;
          min-height: 18mm;
        }
        .ctc-indexes {
          font-family: ${FONT_SANS};
          font-size: 7.5pt;
          font-weight: 600;
          line-height: 1.45;
          justify-self: start;
        }
        .ctc-phone {
          font-family: ${FONT_SANS};
          font-size: 8pt;
          font-weight: 600;
          justify-self: end;
          align-self: start;
        }
        .ctc-seal {
          width: 18mm;
          height: 21mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ctc-seal-img {
          width: 18mm;
          height: auto;
          max-height: 21mm;
          object-fit: contain;
          display: block;
        }
        .ctc-title {
          margin: 1.5mm 0 2mm;
          text-align: center;
          font-family: ${FONT_SANS};
          font-size: 10pt;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${INK};
        }
        .ctc-meta {
          display: flex;
          justify-content: flex-start;
          align-items: baseline;
          gap: 14mm;
          font-family: ${FONT_SANS};
          font-size: 8.5pt;
          font-weight: 600;
          margin-bottom: 2.5mm;
        }
        .ctc-gr,
        .ctc-year {
          display: inline-flex;
          align-items: baseline;
          gap: 1.5mm;
          white-space: nowrap;
        }
        .ctc-year-val {
          display: inline-flex;
          align-items: baseline;
        }
        .ctc-year-blank {
          display: inline-block;
          min-width: 2.8mm;
          border-bottom: 1px solid ${INK};
          text-align: center;
          margin: 0 0.2mm;
        }
        .ctc-year-dash {
          margin: 0 2mm;
        }
        .ctc-body {
          flex: 1;
          font-family: ${FONT_SANS};
          font-size: 8.5pt;
          font-weight: 500;
          color: ${INK};
        }
        .ctc-line {
          display: flex;
          align-items: baseline;
          gap: 2mm;
          margin: 0 0 2.2mm;
          line-height: 1.3;
          width: 100%;
        }
        .ctc-line-solid {
          display: block;
        }
        .ctc-at {
          flex-shrink: 0;
        }
        .ctc-dot {
          display: inline-block;
          border-bottom: 1.3px dotted ${INK};
          padding: 0 1mm 0.3mm;
          text-align: center;
          font-weight: 700;
          color: ${INK};
          box-sizing: border-box;
          line-height: 1.25;
        }
        .ctc-name-dot {
          flex: 1;
          min-width: 50mm;
          text-align: left;
          padding-left: 1.5mm;
          font-size: 9pt;
        }
        .ctc-foot {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 2mm;
          min-height: 10mm;
        }
        .ctc-date {
          display: flex;
          align-items: baseline;
          gap: 1.2mm;
          font-family: ${FONT_SANS};
          font-size: 8.5pt;
          font-weight: 600;
        }
        .ctc-date-box {
          display: inline-block;
          min-width: 6mm;
          border-bottom: 1px solid ${INK};
          text-align: center;
          padding: 0 0.8mm;
        }
        .ctc-date-year {
          display: inline-flex;
          align-items: baseline;
          min-width: 10mm;
        }
        .ctc-sign {
          width: 40mm;
          height: 10mm;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          .ctc-root,
          .ctc-root * {
            visibility: visible !important;
            color: ${INK} !important;
          }
          .ctc-a4 {
            width: ${HALF.pageW} !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          .ctc-sheet {
            height: ${HALF.pageH} !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          .ctc-cut-label {
            display: none !important;
          }
          .ctc-cut {
            height: 5mm !important;
            background: transparent !important;
          }
          .ctc-cut::before {
            border-top: 0.6px dashed #999 !important;
          }
        }
      `}</style>
    </div>
  );
}
