"use client";

import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { dateToWords, studentFullName } from "@/lib/certificates/date-to-words";
import { uploadApiUrl } from "@/lib/student-documents";

/** Printed form — light greenish paper, black ink (matches physical scan) */
export const BONAFIDE_PAPER = "#ebf0e4";
export const BONAFIDE_INK = "#1a1a1a";

const FRAME_ASPECT = "800 / 600";
const CONTENT_PAD_X = "11.5%";
const CONTENT_PAD_Y = "13.5%";
const CONTENT_PAD_EXTRA = "10px 18px";
const FRAME_INSET_PCT = 2.25;
const FONT = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif';

/** Full bonafide on A4 landscape (5mm @page margin → 287×200mm printable) */
const A4_SHEET = {
  w: "266mm",
  h: "200mm",
} as const;

export interface CertStudent {
  firstName: string;
  middleName?: string | null;
  surname: string;
  grNumber?: string | null;
  dateOfBirth: string;
  standard?: string | null;
  section?: string | null;
  gender: string;
  caste?: string | null;
  category?: string | null;
  photoPath?: string | null;
  idPhotoProcessedPath?: string | null;
}

function studentPhotoSrc(student: CertStudent): string | null {
  const path = student.idPhotoProcessedPath || student.photoPath;
  return uploadApiUrl(path);
}

function splitNameLines(name: string, firstLineMax = 38): [string, string] {
  const trimmed = name.trim();
  if (!trimmed) return ["", ""];
  if (trimmed.length <= firstLineMax) return [trimmed, ""];
  const breakAt = trimmed.lastIndexOf(" ", firstLineMax);
  if (breakAt > 8) {
    return [trimmed.slice(0, breakAt).trim(), trimmed.slice(breakAt).trim()];
  }
  return [trimmed.slice(0, firstLineMax).trim(), trimmed.slice(firstLineMax).trim()];
}

function DotLine({
  value,
  minWidth = 60,
  flex,
}: {
  value?: string;
  minWidth?: number;
  flex?: number;
}) {
  const hasValue = Boolean(value?.trim());
  return (
    <span
      className="spb-dot"
      style={{
        minWidth,
        flex: flex ?? undefined,
        flexGrow: flex ? 1 : undefined,
        fontWeight: hasValue ? 700 : 400,
        color: hasValue ? BONAFIDE_INK : "transparent",
      }}
    >
      {hasValue ? value : "\u00a0"}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="spb-label">{children}</span>;
}

function BodyLine({ children }: { children: React.ReactNode }) {
  return <div className="spb-body-line">{children}</div>;
}

function BonafideSheet({
  student,
  serialNo,
  issueDate,
  photoSrc,
}: {
  student: CertStudent;
  serialNo: string;
  issueDate?: string;
  photoSrc: string | null;
}) {
  const school = useCertificateBrand();
  const name = studentFullName(student);
  const [nameLine1, nameLine2] = splitNameLines(name);
  const dobWords = dateToWords(student.dateOfBirth, "en");
  const subCast = (student.caste || student.category || "").trim();
  const phone = (school.phone || "222186").trim() || "222186";

  return (
    <div className="bonafide-cert-sheet spb-primary-sheet spb-sheet">
      <img
        src="/certificates/bonafide-border-frame-primary.svg"
        alt=""
        aria-hidden
        className="bonafide-cert-frame-img spb-primary-frame"
      />

      <div className="spb-photo" aria-label="Student photo">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} alt="" className="spb-photo-img" />
        ) : null}
      </div>

      <div className="spb-inner">
        <div className="spb-content">
          <div>
            <h1 className="spb-school">SHRI SARVAJANIK HIGH SCHOOL</h1>
            <p className="spb-section">( GRANTED / NON GRANTED) PRIMARI SECTION</p>
            <p className="spb-address">
              Navagam, Fort-Songadh, Dist. Tapi. Pin-394670 Ph.No. {phone}
            </p>
            <h2 className="spb-title">BONAFIDE CERTIFICATE</h2>

            <div className="spb-meta-row">
              <span className="spb-meta-left">
                <Label>G. R. Number</Label>
                <DotLine value={student.grNumber || ""} minWidth={140} flex={1} />
              </span>
              <span className="spb-meta-right">
                <Label>Sr. Number</Label>
                <DotLine value={serialNo} minWidth={56} />
              </span>
            </div>

            <div className="spb-fields">
              <BodyLine>
                <Label>This is to Certify that</Label>
                <DotLine value={nameLine1} minWidth={100} flex={1} />
              </BodyLine>
              <BodyLine>
                <DotLine value={nameLine2} minWidth={140} flex={1} />
                <Label> Is/Was a Bonafide Student of this School.</Label>
              </BodyLine>
              <BodyLine>
                <Label>
                  His / Her birth date as recorded in the General Register of the
                  School is
                </Label>
                <DotLine value={student.dateOfBirth} minWidth={68} />
              </BodyLine>
              <BodyLine>
                <DotLine value="" minWidth={32} />
                <Label>(in words)</Label>
                <DotLine value={dobWords} minWidth={120} flex={1} />
              </BodyLine>
              <BodyLine>
                <Label>He / She bears good moral character.</Label>
                <span className="spb-spacer" />
                <Label>Sub-Cast</Label>
                <DotLine value={subCast} minWidth={80} />
              </BodyLine>
            </div>
          </div>

          <div className="spb-footer">
            <div className="spb-std-row">
              <Label>Std</Label>
              <DotLine value={student.standard || ""} minWidth={56} />
              <Label>Divi</Label>
              <DotLine value={student.section || ""} minWidth={56} />
            </div>
            <div className="spb-sign-row">
              <span className="spb-date">
                <Label>Date :</Label>
                <DotLine value={issueDate || ""} minWidth={90} />
              </span>
              <span className="spb-sign">Principal / Head Master</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Songadh Primary bonafide (24261004403 / 24261004404).
 * One full A4 landscape certificate per page; optional 2 pages for duplicate copy.
 */
export function BonafideCertificateView({
  student,
  serialNo,
  issueDate,
  copies = 1,
}: {
  student: CertStudent;
  serialNo: string;
  issueDate?: string;
  /** 1 = single page; 2 = two full A4 pages (duplicate for cut & keep) */
  copies?: 1 | 2;
}) {
  const photoSrc = studentPhotoSrc(student);
  const sheetProps = { student, serialNo, issueDate, photoSrc };
  const pageCount = copies === 2 ? 2 : 1;

  return (
    <div className="spb-root spb-print">
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className={`spb-a4-page${i < pageCount - 1 ? " spb-a4-page--break" : ""}`}
        >
          <BonafideSheet {...sheetProps} />
        </div>
      ))}

      <style jsx global>{`
        .spb-root {
          color: ${BONAFIDE_INK};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .spb-a4-page {
          width: ${A4_SHEET.w};
          max-width: 100%;
          margin: 0 auto 16px;
          box-sizing: border-box;
        }
        .spb-a4-page:last-child {
          margin-bottom: 0;
        }
        .bonafide-cert-sheet.spb-sheet {
          width: 100%;
          height: ${A4_SHEET.h};
          position: relative;
          aspect-ratio: ${FRAME_ASPECT};
          background: ${BONAFIDE_PAPER};
          box-sizing: border-box;
          font-family: ${FONT};
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
        }
        .spb-sheet .bonafide-cert-frame-img {
          position: absolute;
          top: ${FRAME_INSET_PCT}%;
          left: ${FRAME_INSET_PCT}%;
          width: ${100 - FRAME_INSET_PCT * 2}%;
          height: ${100 - FRAME_INSET_PCT * 2}%;
          pointer-events: none;
          object-fit: fill;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .spb-photo {
          position: absolute;
          top: 14%;
          right: 13%;
          width: 11%;
          height: 22%;
          border: 1.4px solid ${BONAFIDE_INK};
          background: ${BONAFIDE_PAPER};
          z-index: 2;
          box-sizing: border-box;
          overflow: hidden;
        }
        .spb-photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .spb-inner {
          position: relative;
          z-index: 1;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          padding: ${CONTENT_PAD_Y} ${CONTENT_PAD_X};
          color: ${BONAFIDE_INK};
          display: flex;
          flex-direction: column;
        }
        .spb-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: ${CONTENT_PAD_EXTRA};
          box-sizing: border-box;
          min-height: 0;
        }
        .spb-school {
          text-align: center;
          font-size: 16pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${BONAFIDE_INK};
          margin: 0 0 2px;
          line-height: 1.15;
          padding-right: 12%;
        }
        .spb-section {
          text-align: center;
          font-size: 9pt;
          color: ${BONAFIDE_INK};
          margin: 0 0 2px;
          letter-spacing: 0.02em;
          line-height: 1.35;
          padding-right: 12%;
        }
        .spb-address {
          text-align: center;
          font-size: 8.5pt;
          color: ${BONAFIDE_INK};
          margin: 0 0 12px;
          letter-spacing: 0.01em;
          line-height: 1.35;
          padding-right: 12%;
        }
        .spb-title {
          text-align: center;
          font-size: 11pt;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 3px;
          color: ${BONAFIDE_INK};
          margin: 0 0 14px;
          letter-spacing: 0.08em;
          padding-right: 12%;
        }
        .spb-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 16px;
          margin-bottom: 2px;
          font-size: 10pt;
        }
        .spb-meta-left,
        .spb-meta-right {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
        }
        .spb-meta-left {
          flex: 1;
          min-width: 0;
        }
        .spb-fields {
          margin-top: 2px;
        }
        .spb-body-line {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          font-size: 10pt;
          line-height: 2.35;
          letter-spacing: 0.015em;
          gap: 2px;
        }
        .spb-label {
          color: ${BONAFIDE_INK};
          font-weight: 400;
          white-space: nowrap;
        }
        .spb-dot {
          display: inline-block;
          border-bottom: 1.5px dotted ${BONAFIDE_INK};
          min-height: 1.15em;
          line-height: 1.2;
          padding: 0 3px 2px;
          vertical-align: baseline;
        }
        .spb-spacer {
          flex: 1;
          min-width: 16px;
        }
        .spb-footer {
          margin-top: 6px;
        }
        .spb-std-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 10pt;
        }
        .spb-sign-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 10pt;
          margin-top: 10px;
        }
        .spb-date {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
        }
        .spb-sign {
          color: ${BONAFIDE_INK};
          letter-spacing: 0.02em;
          font-weight: 700;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          html,
          body {
            background: #fff !important;
          }
          .spb-root {
            margin: 0 !important;
            padding: 0 !important;
          }
          .spb-a4-page {
            width: ${A4_SHEET.w} !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .spb-a4-page--break {
            page-break-after: always;
            break-after: page;
          }
          .bonafide-cert-sheet.spb-sheet {
            width: ${A4_SHEET.w} !important;
            height: ${A4_SHEET.h} !important;
            background: ${BONAFIDE_PAPER} !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .spb-primary-sheet,
          .spb-primary-sheet * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
