"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
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
        color: hasValue ? "#111" : "transparent",
        verticalAlign: "baseline",
      }}
    >
      {hasValue ? value : "\u00a0"}
    </span>
  );
}

function Pink({ children }: { children: React.ReactNode }) {
  return <span style={{ color: BONAFIDE_MAGENTA, fontWeight: 400 }}>{children}</span>;
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
}) {
  const name = studentFullName(student);
  const [nameLine1, nameLine2] = splitNameLines(name);
  const dobWords = dateToWords(student.dateOfBirth, "en");

  return (
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
          {CERTIFICATE_SCHOOL.nameEn}
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
          {CERTIFICATE_SCHOOL.address}
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
          BONAFIDE CERTIFICATE
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "20px",
            marginBottom: "4px",
            fontSize: "13px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px", flex: 1 }}>
            <Pink>G. R. Number</Pink>
            <DotLine value={student.grNumber || ""} minWidth={180} flex={1} />
          </span>
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
            <Pink>Sr. Number</Pink>
            <DotLine value={serialNo} minWidth={72} />
          </span>
        </div>

        <div style={{ marginTop: "4px" }}>
          <BodyLine>
            <Pink>This is to Certify that</Pink>
            <DotLine value={nameLine1} minWidth={120} flex={1} />
          </BodyLine>
          <BodyLine>
            <DotLine value={nameLine2} minWidth={160} flex={1} />
            <Pink> Is/Was a Bonafide Student of this</Pink>
          </BodyLine>
          <BodyLine>
            <Pink>School. His / Her birth date as recorded in the General Register of the</Pink>
          </BodyLine>
          <BodyLine>
            <Pink>School is </Pink>
            <DotLine value={student.dateOfBirth} minWidth={72} />
            <DotLine value="" minWidth={72} />
            <Pink> (in</Pink>
          </BodyLine>
          <BodyLine>
            <Pink>words) </Pink>
            <DotLine value={dobWords} minWidth={160} flex={1} />
            <Pink> He / She bears</Pink>
          </BodyLine>
          <BodyLine>
            <Pink>good moral character.</Pink>
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
          <Pink>Std</Pink>
          <DotLine value={student.standard || ""} minWidth={72} />
          <Pink>Divi.</Pink>
          <DotLine value={student.section || ""} minWidth={72} />
        </span>
        <span style={{ color: BONAFIDE_MAGENTA, letterSpacing: "0.02em" }}>
          {CERTIFICATE_SCHOOL.principalLabel}
        </span>
      </div>
    </BonafideBorderFrame>
  );
}
