"use client";

import { useMemo } from "react";
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { CertEdit, CertFontScope, CertFontTools, useSheetState } from "@/components/certificates/inline-cert-edit";
import { dateToWords, studentFullName } from "@/lib/certificates/date-to-words";

/** Official border & ink color (matches bonafide-border-frame.svg) */
export const BONAFIDE_MAGENTA = "#e63974";

/** Landscape certificate — compact like official scan */
const PAGE_W = "212mm";
const FRAME_ASPECT = "800 / 600";
/** Generous inner padding inside decorative border */
const CONTENT_PAD_X = "11.5%";
const CONTENT_PAD_Y = "13.5%";
const CONTENT_PAD_EXTRA = "14px 22px";
/** Border frame inset — thinner band, more white inside */
const FRAME_INSET_PCT = 2.25;

const FONT = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif';

export interface CertStudent {
  firstName: string;
  middleName?: string | null;
  surname: string;
  grNumber?: string | null;
  dateOfBirth: string;
  standard?: string | null;
  section?: string | null;
  gender: string;
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

function BonafideBorderFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bonafide-cert-sheet"
      style={{
        width: PAGE_W,
        maxWidth: "100%",
        margin: "0 auto",
        position: "relative",
        aspectRatio: FRAME_ASPECT,
        background: "#fff",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* Official decorative frame SVG */}
      <img
        src="/certificates/bonafide-border-frame.svg"
        alt=""
        aria-hidden
        className="bonafide-cert-frame-img"
        style={{
          position: "absolute",
          top: `${FRAME_INSET_PCT}%`,
          left: `${FRAME_INSET_PCT}%`,
          width: `${100 - FRAME_INSET_PCT * 2}%`,
          height: `${100 - FRAME_INSET_PCT * 2}%`,
          pointerEvents: "none",
          objectFit: "fill",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          padding: `${CONTENT_PAD_Y} ${CONTENT_PAD_X}`,
          color: BONAFIDE_MAGENTA,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: CONTENT_PAD_EXTRA,
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>

      <style jsx global>{`
        .bonafide-cert-sheet {
          font-family: ${FONT};
        }
        .bonafide-cert-frame-img {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          html,
          body {
            background: #fff !important;
          }
          .bonafide-cert-sheet {
            width: ${PAGE_W} !important;
            max-width: none !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function DotLine({
  value,
  onChange,
  sizeKey,
  minWidth = 60,
  flex,
}: {
  value: string;
  onChange: (value: string) => void;
  sizeKey: string;
  minWidth?: number;
  flex?: number;
}) {
  const hasValue = Boolean(value.trim());
  return (
    <CertEdit
      sizeKey={sizeKey}
      value={value}
      onChange={onChange}
      style={{
        display: "inline-block",
        borderBottom: `1.5px dotted ${BONAFIDE_MAGENTA}`,
        minWidth,
        flex: flex ?? undefined,
        flexGrow: flex ? 1 : undefined,
        minHeight: "1.15em",
        lineHeight: 1.2,
        padding: "0 3px 2px",
        fontWeight: hasValue ? 700 : 400,
        color: "#111",
        verticalAlign: "baseline",
      }}
    />
  );
}

function Pink({
  value,
  onChange,
  sizeKey,
}: {
  value: string;
  onChange: (value: string) => void;
  sizeKey: string;
}) {
  return (
    <CertEdit
      label
      sizeKey={sizeKey}
      value={value}
      onChange={onChange}
      style={{ color: BONAFIDE_MAGENTA, fontWeight: 400 }}
    />
  );
}

function BodyLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        fontSize: "13px",
        lineHeight: 2.45,
        letterSpacing: "0.015em",
      }}
    >
      {children}
    </div>
  );
}

export function BonafideCertificateView({
  student,
  serialNo,
}: {
  student: CertStudent;
  serialNo: string;
  issueDate?: string;
  copies?: 1 | 2;
}) {
  const school = useCertificateBrand();
  const name = studentFullName(student);
  const [nameLine1, nameLine2] = splitNameLines(name);
  const dobWords = dateToWords(student.dateOfBirth, "en");
  const seed = useMemo(
    () => ({
      schoolName: school.nameEn,
      address: school.address,
      title: "BONAFIDE CERTIFICATE",
      grLabel: "G. R. Number",
      grNumber: student.grNumber || "",
      srLabel: "Sr. Number",
      serialNo,
      lineCertify: "This is to Certify that ",
      nameLine1,
      nameLine2,
      lineStudent: " Is/Was a Bonafide Student of this",
      lineRegister: "School. His / Her birth date as recorded in the General Register of the",
      lineSchoolIs: "School is ",
      dob: student.dateOfBirth || "",
      dobGap: "",
      lineIn: " (in",
      lineWords: "words) ",
      dobWords,
      lineBears: " He / She bears",
      lineCharacter: "good moral character.",
      stdLabel: "Std",
      standard: student.standard || "",
      diviLabel: "Divi.",
      section: student.section || "",
      principal: school.principalLabel,
    }),
    [school, student, serialNo, nameLine1, nameLine2, dobWords],
  );
  const resetKey = `${student.grNumber || ""}|${student.dateOfBirth || ""}|${serialNo}`;
  const { values: f, set, reset } = useSheetState(seed, resetKey);

  return (
    <CertFontScope resetKey={resetKey}>
      <CertFontTools onReset={reset} />
      <BonafideBorderFrame>
      <div>
        <h1
          style={{
            textAlign: "center",
            fontSize: "21px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: BONAFIDE_MAGENTA,
            margin: "0 0 3px",
            lineHeight: 1.15,
          }}
        >
          <CertEdit label sizeKey="bfSchool" value={f.schoolName} onChange={set("schoolName")} />
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: BONAFIDE_MAGENTA,
            margin: "0 0 14px",
            letterSpacing: "0.02em",
            lineHeight: 1.35,
          }}
        >
          <CertEdit label sizeKey="bfAddress" value={f.address} onChange={set("address")} />
        </p>
        <h2
          style={{
            textAlign: "center",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "underline",
            textDecorationThickness: "1.5px",
            textUnderlineOffset: "3px",
            color: BONAFIDE_MAGENTA,
            margin: "0 0 18px",
            letterSpacing: "0.08em",
          }}
        >
          <CertEdit label sizeKey="bfTitle" value={f.title} onChange={set("title")} />
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "baseline",
            gap: "14px",
            marginBottom: "4px",
            fontSize: "13px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
            <Pink sizeKey="bfGrLabel" value={f.grLabel} onChange={set("grLabel")} />
            <DotLine sizeKey="bfGr" value={f.grNumber} onChange={set("grNumber")} minWidth={64} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
            <Pink sizeKey="bfSrLabel" value={f.srLabel} onChange={set("srLabel")} />
            <DotLine sizeKey="bfSerial" value={f.serialNo} onChange={set("serialNo")} minWidth={72} />
          </span>
        </div>

        <div style={{ marginTop: "4px" }}>
          <BodyLine>
            <Pink sizeKey="bfCertify" value={f.lineCertify} onChange={set("lineCertify")} />
            <DotLine sizeKey="bfName1" value={f.nameLine1} onChange={set("nameLine1")} minWidth={120} flex={1} />
          </BodyLine>
          <BodyLine>
            <DotLine sizeKey="bfName2" value={f.nameLine2} onChange={set("nameLine2")} minWidth={160} flex={1} />
            <Pink sizeKey="bfStudent" value={f.lineStudent} onChange={set("lineStudent")} />
          </BodyLine>
          <BodyLine>
            <Pink sizeKey="bfRegister" value={f.lineRegister} onChange={set("lineRegister")} />
          </BodyLine>
          <BodyLine>
            <Pink sizeKey="bfSchoolIs" value={f.lineSchoolIs} onChange={set("lineSchoolIs")} />
            <DotLine sizeKey="bfDob" value={f.dob} onChange={set("dob")} minWidth={72} />
            <DotLine sizeKey="bfDobGap" value={f.dobGap} onChange={set("dobGap")} minWidth={72} />
            <Pink sizeKey="bfIn" value={f.lineIn} onChange={set("lineIn")} />
          </BodyLine>
          <BodyLine>
            <Pink sizeKey="bfWords" value={f.lineWords} onChange={set("lineWords")} />
            <DotLine sizeKey="bfDobWords" value={f.dobWords} onChange={set("dobWords")} minWidth={160} flex={1} />
            <Pink sizeKey="bfBears" value={f.lineBears} onChange={set("lineBears")} />
          </BodyLine>
          <BodyLine>
            <Pink sizeKey="bfCharacter" value={f.lineCharacter} onChange={set("lineCharacter")} />
          </BodyLine>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: "13px",
          marginTop: "8px",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
          <Pink sizeKey="bfStdLabel" value={f.stdLabel} onChange={set("stdLabel")} />
          <DotLine sizeKey="bfStd" value={f.standard} onChange={set("standard")} minWidth={72} />
          <Pink sizeKey="bfDiviLabel" value={f.diviLabel} onChange={set("diviLabel")} />
          <DotLine sizeKey="bfSection" value={f.section} onChange={set("section")} minWidth={72} />
        </span>
        <span style={{ color: BONAFIDE_MAGENTA, letterSpacing: "0.02em" }}>
          <CertEdit label sizeKey="bfPrincipal" value={f.principal} onChange={set("principal")} />
        </span>
      </div>
      </BonafideBorderFrame>
    </CertFontScope>
  );
}
