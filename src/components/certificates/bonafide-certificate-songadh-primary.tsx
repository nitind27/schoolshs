"use client";

import { useEffect, useRef, useState } from "react";
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { dateToWords, studentFullName } from "@/lib/certificates/date-to-words";
import { uploadApiUrl } from "@/lib/student-documents";

/** Printed form — light greenish paper, black ink (matches physical scan) */
export const BONAFIDE_PAPER = "#ebf0e4";
export const BONAFIDE_INK = "#1a1a1a";

/** SVG viewBox 800×600 draws its outer border at 10px inset — bleed it past the sheet edge */
const FRAME_BLEED = {
  left: `${(-10 / 780) * 100}%`,
  top: `${(-10 / 580) * 100}%`,
  width: `${(800 / 780) * 100}%`,
  height: `${(600 / 580) * 100}%`,
} as const;
const FONT = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif';

/** A4 portrait edge-to-edge (@page margin 0); two half-page slots + cut line centred at 148.5mm */
const A4 = {
  printW: "210mm",
  printH: "297mm",
  cutH: "3mm",
  slotH: "147mm",
  certW: "210mm",
  certH: "147mm",
  pad: "14mm 16mm 12mm",
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
  religion?: string | null;
  category?: string | null;
  photoPath?: string | null;
  idPhotoProcessedPath?: string | null;
}

type BonafideFields = {
  school: string;
  sectionLine: string;
  address: string;
  title: string;
  grNumber: string;
  serialNo: string;
  name1: string;
  name2: string;
  dob: string;
  dobWords: string;
  subCast: string;
  standard: string;
  division: string;
  issueDate: string;
  sign: string;
};

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

function titleCase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

/** Register-style જ્ઞાતિ in English: "Hindu - Chaudhari" */
function religionCasteEn(s: CertStudent): string {
  const rel = titleCase(String(s.religion || ""));
  const caste = titleCase(String(s.caste || s.category || ""));
  if (!rel) return caste;
  if (!caste) return rel;
  if (caste.toLowerCase().startsWith(rel.toLowerCase())) return caste;
  return `${rel} - ${caste}`;
}

function initialFields(
  student: CertStudent,
  serialNo: string,
  issueDate: string | undefined,
  phone: string,
): BonafideFields {
  const [name1, name2] = splitNameLines(studentFullName(student));
  return {
    school: "SHRI SARVAJANIK HIGH SCHOOL",
    sectionLine: "( GRANTED / NON GRANTED) PRIMARI SECTION",
    address: `Navagam, Fort-Songadh, Dist. Tapi. Pin-394670 Ph.No. ${phone}`,
    title: "BONAFIDE CERTIFICATE",
    grNumber: student.grNumber || "",
    serialNo,
    name1,
    name2,
    dob: student.dateOfBirth || "",
    dobWords: student.dateOfBirth ? dateToWords(student.dateOfBirth, "en") : "",
    subCast: religionCasteEn(student),
    standard: student.standard || "",
    division: student.section || "",
    issueDate: issueDate || "",
    sign: "Principal / Head Master",
  };
}

/** Inline-editable text; commits on blur so both printed copies stay in sync. */
function Editable({
  value,
  onChange,
  className,
  style,
  as: Tag = "span",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`spb-edit${className ? ` ${className}` : ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e: React.FocusEvent<HTMLElement>) =>
        onChange((e.currentTarget.textContent || "").replace(/\s+/g, " ").trim())
      }
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
    />
  );
}

function DotLine({
  value,
  onChange,
  minWidth = 60,
  flex,
}: {
  value: string;
  onChange: (v: string) => void;
  minWidth?: number;
  flex?: boolean;
}) {
  return (
    <Editable
      value={value}
      onChange={onChange}
      className="spb-dot"
      style={{ minWidth, flexGrow: flex ? 1 : undefined, fontWeight: 700 }}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="spb-label">{children}</span>;
}

function BodyLine({ children }: { children: React.ReactNode }) {
  return <div className="spb-body-line">{children}</div>;
}

function BonafideSheet({
  fields,
  set,
  photoSrc,
}: {
  fields: BonafideFields;
  set: (key: keyof BonafideFields) => (v: string) => void;
  photoSrc: string | null;
}) {
  return (
    <div className="bonafide-cert-sheet spb-primary-sheet spb-sheet">
      <img
        src="/certificates/bonafide-border-frame-primary.svg"
        alt=""
        aria-hidden
        className="bonafide-cert-frame-img spb-primary-frame"
      />

      <div className="spb-inner">
        <div className="spb-content">
          <div>
            <div className="spb-top">
              <span aria-hidden />
              <div className="spb-head">
                <Editable as="h1" className="spb-school" value={fields.school} onChange={set("school")} />
                <Editable as="p" className="spb-section" value={fields.sectionLine} onChange={set("sectionLine")} />
                <Editable as="p" className="spb-address" value={fields.address} onChange={set("address")} />
                <Editable as="h2" className="spb-title" value={fields.title} onChange={set("title")} />
              </div>
              <div className="spb-photo" aria-label="Student photo">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoSrc} alt="" className="spb-photo-img" />
                ) : null}
              </div>
            </div>

            <div className="spb-meta-row">
              <span className="spb-meta-left">
                <Label>G. R. Number</Label>
                <DotLine value={fields.grNumber} onChange={set("grNumber")} minWidth={64} />
              </span>
              <span className="spb-meta-right">
                <Label>Sr. Number</Label>
                <DotLine value={fields.serialNo} onChange={set("serialNo")} minWidth={56} />
              </span>
            </div>

            <div className="spb-fields">
              <BodyLine>
                <Label>This is to Certify that</Label>
                <DotLine value={fields.name1} onChange={set("name1")} minWidth={100} flex />
              </BodyLine>
              <BodyLine>
                <DotLine value={fields.name2} onChange={set("name2")} minWidth={140} flex />
                <Label>Is/Was a Bonafide Student of this School.</Label>
              </BodyLine>
              <BodyLine>
                <Label>
                  His / Her birth date as recorded in the General Register of the
                  School is
                </Label>
                <DotLine value={fields.dob} onChange={set("dob")} minWidth={68} />
              </BodyLine>
              <BodyLine>
                <Label>(in words)</Label>
                <DotLine value={fields.dobWords} onChange={set("dobWords")} minWidth={120} flex />
              </BodyLine>
              <BodyLine>
                <Label>He / She bears good moral character.</Label>
                <span className="spb-spacer" />
                <Label>Sub-Cast</Label>
                <DotLine value={fields.subCast} onChange={set("subCast")} minWidth={80} />
              </BodyLine>
            </div>
          </div>

          <div className="spb-footer">
            <div className="spb-std-row">
              <Label>Std</Label>
              <DotLine value={fields.standard} onChange={set("standard")} minWidth={56} />
              <Label>Divi</Label>
              <DotLine value={fields.division} onChange={set("division")} minWidth={56} />
            </div>
            <div className="spb-sign-row">
              <span className="spb-date">
                <Label>Date :</Label>
                <DotLine value={fields.issueDate} onChange={set("issueDate")} minWidth={90} />
              </span>
              <Editable className="spb-sign" value={fields.sign} onChange={set("sign")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Songadh Primary bonafide (24261004403 / 24261004404).
 * A4 portrait: each certificate fills one half page, dashed cut line in the middle.
 * Every text on the certificate is click-to-edit; printed output uses the edited text.
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
  /** 1 = top half only; 2 = both halves (cut & keep duplicate) */
  copies?: 1 | 2;
}) {
  const brand = useCertificateBrand();
  const phone = (brand.phone || "222186").trim() || "222186";
  const photoSrc = studentPhotoSrc(student);

  const [fields, setFields] = useState<BonafideFields>(() =>
    initialFields(student, serialNo, issueDate, phone),
  );
  useEffect(() => {
    setFields((f) => (f.serialNo === serialNo ? f : { ...f, serialNo }));
  }, [serialNo]);
  useEffect(() => {
    setFields((f) => (f.issueDate === (issueDate || "") ? f : { ...f, issueDate: issueDate || "" }));
  }, [issueDate]);

  const set = (key: keyof BonafideFields) => (v: string) =>
    setFields((f) => (f[key] === v ? f : { ...f, [key]: v }));
  const reset = () => setFields(initialFields(student, serialNo, issueDate, phone));

  const sheetProps = { fields, set, photoSrc };

  return (
    <div className="spb-root spb-print">
      <div className="spb-edit-hint no-print">
        <span>✎ Certificate par kisi bhi text par click karke edit karo — print me wahi aayega.</span>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="spb-a4-page">
        <div className="spb-slot">
          <BonafideSheet {...sheetProps} />
        </div>
        <div className="spb-cut" aria-hidden>
          <span className="spb-cut-icon">✂</span>
          <span className="spb-cut-line" />
        </div>
        <div className="spb-slot">
          {copies === 2 ? <BonafideSheet {...sheetProps} /> : null}
        </div>
      </div>

      <style jsx global>{`
        .spb-root {
          color: ${BONAFIDE_INK};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .spb-edit-hint {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          max-width: 210mm;
          margin: 0 auto 10px;
          padding: 8px 12px;
          font-size: 13px;
          color: #1e3a8a;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
        }
        .spb-edit-hint button {
          flex: 0 0 auto;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #1e3a8a;
          background: #fff;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          cursor: pointer;
        }
        .spb-edit {
          outline: none;
          cursor: text;
          border-radius: 2px;
        }
        @media screen {
          .spb-edit:hover {
            background: rgba(59, 130, 246, 0.08);
          }
          .spb-edit:focus {
            background: rgba(59, 130, 246, 0.12);
            box-shadow: 0 0 0 1px #3b82f6;
          }
        }
        .spb-a4-page {
          width: 210mm;
          height: 297mm;
          padding: 0;
          margin: 0 auto;
          box-sizing: border-box;
          background: #fff;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
          display: flex;
          flex-direction: column;
        }
        .spb-slot {
          height: ${A4.slotH};
          width: 100%;
          display: flex;
          flex: 0 0 auto;
        }
        .spb-cut {
          height: ${A4.cutH};
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 1.5mm;
          padding: 0 4mm;
          box-sizing: border-box;
          color: #555;
        }
        .spb-cut-icon {
          font-size: 11pt;
          line-height: 1;
          font-family: "Segoe UI Symbol", "DejaVu Sans", sans-serif;
        }
        .spb-cut-line {
          flex: 1;
          border-top: 1.2px dashed #555;
        }
        .bonafide-cert-sheet.spb-sheet {
          width: ${A4.certW};
          height: ${A4.certH};
          position: relative;
          background: ${BONAFIDE_PAPER};
          box-sizing: border-box;
          font-family: ${FONT};
          overflow: hidden;
        }
        .spb-sheet .bonafide-cert-frame-img {
          position: absolute;
          top: ${FRAME_BLEED.top};
          left: ${FRAME_BLEED.left};
          width: ${FRAME_BLEED.width};
          height: ${FRAME_BLEED.height};
          max-width: none;
          pointer-events: none;
          object-fit: fill;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .spb-inner {
          position: relative;
          z-index: 1;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          padding: ${A4.pad};
          color: ${BONAFIDE_INK};
          display: flex;
          flex-direction: column;
        }
        .spb-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          min-height: 0;
        }
        .spb-top {
          display: grid;
          grid-template-columns: 22mm 1fr 22mm;
          align-items: start;
          gap: 2mm;
          margin-bottom: 1.5mm;
        }
        .spb-head {
          text-align: center;
          padding-top: 1mm;
        }
        .spb-photo {
          width: 22mm;
          height: 26mm;
          border: 1.2px solid ${BONAFIDE_INK};
          background: ${BONAFIDE_PAPER};
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
        .spb-school {
          font-size: 15pt;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${BONAFIDE_INK};
          margin: 0 0 1px;
          line-height: 1.15;
          white-space: nowrap;
        }
        .spb-section {
          font-size: 8pt;
          color: ${BONAFIDE_INK};
          margin: 0 0 1px;
          letter-spacing: 0.02em;
          line-height: 1.3;
        }
        .spb-address {
          font-size: 7.5pt;
          color: ${BONAFIDE_INK};
          margin: 0 0 2.5mm;
          line-height: 1.3;
          white-space: nowrap;
        }
        .spb-title {
          font-size: 10pt;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 3px;
          color: ${BONAFIDE_INK};
          margin: 0;
          letter-spacing: 0.08em;
        }
        .spb-meta-row {
          display: flex;
          justify-content: flex-start;
          align-items: baseline;
          gap: 5mm;
          font-size: 9pt;
        }
        .spb-meta-left,
        .spb-meta-right {
          display: inline-flex;
          align-items: baseline;
          gap: 2mm;
          flex: 0 0 auto;
        }
        .spb-fields {
          margin-top: 1px;
        }
        .spb-body-line {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          font-size: 9pt;
          line-height: 2.2;
          letter-spacing: 0.015em;
          gap: 0 2mm;
        }
        .spb-label {
          color: ${BONAFIDE_INK};
          font-weight: 400;
          white-space: nowrap;
        }
        .spb-dot {
          display: inline-block;
          border-bottom: 1.3px dotted ${BONAFIDE_INK};
          min-height: 1.15em;
          line-height: 1.2;
          padding: 0 1.5mm 2px;
          vertical-align: baseline;
        }
        .spb-spacer {
          flex: 1;
          min-width: 16px;
        }
        .spb-std-row {
          display: flex;
          align-items: baseline;
          gap: 2mm;
          font-size: 9pt;
        }
        .spb-std-row .spb-dot { margin-right: 6mm; }
        .spb-sign-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 9pt;
          margin-top: 3mm;
        }
        .spb-date {
          display: inline-flex;
          align-items: baseline;
          gap: 2mm;
        }
        .spb-sign {
          color: ${BONAFIDE_INK};
          letter-spacing: 0.02em;
          font-weight: 700;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
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
            width: ${A4.printW} !important;
            height: ${A4.printH} !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }
          .bonafide-cert-sheet.spb-sheet {
            width: ${A4.certW} !important;
            height: ${A4.certH} !important;
            background: ${BONAFIDE_PAPER} !important;
            box-shadow: none !important;
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
