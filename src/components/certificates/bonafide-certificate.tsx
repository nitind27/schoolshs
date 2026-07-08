"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { dateToWords, studentFullName } from "@/lib/certificates/date-to-words";

/** Magenta ink color matching the school official scan */
export const BONAFIDE_MAGENTA = "#D81B60";

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

/*
 * Decorative border — repeating diamond-chain motif (CSS only, no SVG file needed).
 * Matches the physical scan's double ornamental border.
 */
function BonafideBorderFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%",
      minHeight: "185mm",
      boxSizing: "border-box",
      padding: "8px",
      background: "#fff",
      border: `2.5px solid ${BONAFIDE_MAGENTA}`,
      printColorAdjust: "exact",
      WebkitPrintColorAdjust: "exact",
    }}>
      {/* Inner ornament ring — uses repeating linear gradient to simulate the chain border */}
      <div style={{
        border: `6px solid transparent`,
        backgroundImage: `
          repeating-linear-gradient(90deg,  ${BONAFIDE_MAGENTA} 0, ${BONAFIDE_MAGENTA} 4px, transparent 4px, transparent 10px),
          repeating-linear-gradient(90deg,  ${BONAFIDE_MAGENTA} 0, ${BONAFIDE_MAGENTA} 4px, transparent 4px, transparent 10px),
          repeating-linear-gradient(180deg, ${BONAFIDE_MAGENTA} 0, ${BONAFIDE_MAGENTA} 4px, transparent 4px, transparent 10px),
          repeating-linear-gradient(180deg, ${BONAFIDE_MAGENTA} 0, ${BONAFIDE_MAGENTA} 4px, transparent 4px, transparent 10px)
        `,
        backgroundPosition: "top, bottom, left, right",
        backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
        backgroundSize: "14px 4px, 14px 4px, 4px 14px, 4px 14px",
        minHeight: "calc(185mm - 16px)",
        padding: "28px 44px 40px",
        color: BONAFIDE_MAGENTA,
        fontFamily: "Arial, Helvetica Neue, Helvetica, sans-serif",
        position: "relative",
      }}>
        {children}
      </div>
    </div>
  );
}

function DotLine({
  value,
  minWidth = 80,
  flex,
}: {
  value?: string;
  minWidth?: number;
  flex?: number;
}) {
  return (
    <span style={{
      display: "inline-block",
      borderBottom: `1.5px dotted ${BONAFIDE_MAGENTA}`,
      minWidth,
      flex,
      minHeight: "1.2em",
      lineHeight: 1.3,
      padding: "0 2px 1px",
      fontWeight: 600,
      color: "#1a1a1a",
      verticalAlign: "baseline",
    }}>
      {value?.trim() || ""}
    </span>
  );
}

function TextRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      fontSize: "15px",
      lineHeight: 2.6,
      letterSpacing: "0.01em",
    }}>
      {children}
    </div>
  );
}

function Pink({ children }: { children: React.ReactNode }) {
  return <span style={{ color: BONAFIDE_MAGENTA }}>{children}</span>;
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
  const dobWords = dateToWords(student.dateOfBirth, "en");

  return (
    <BonafideBorderFrame>
      {/* School heading */}
      <h1 style={{
        textAlign: "center",
        fontSize: "26px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: BONAFIDE_MAGENTA,
        margin: "0 0 6px",
        lineHeight: 1.2,
      }}>
        {CERTIFICATE_SCHOOL.nameEn}
      </h1>
      <p style={{
        textAlign: "center",
        fontSize: "13px",
        color: BONAFIDE_MAGENTA,
        margin: "0 0 22px",
        letterSpacing: "0.02em",
      }}>
        {CERTIFICATE_SCHOOL.address}
      </p>
      <h2 style={{
        textAlign: "center",
        fontSize: "17px",
        fontWeight: 700,
        textDecoration: "underline",
        textUnderlineOffset: "4px",
        color: BONAFIDE_MAGENTA,
        margin: "0 0 28px",
        letterSpacing: "0.06em",
      }}>
        BONAFIDE CERTIFICATE
      </h2>

      {/* GR / Serial row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "24px",
        marginBottom: "8px",
        fontSize: "15px",
      }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <Pink>G. R. Number</Pink>
          <DotLine value={student.grNumber || ""} minWidth={200} />
        </span>
        <span style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <Pink>Sr. Number</Pink>
          <DotLine value={serialNo} minWidth={80} />
        </span>
      </div>

      {/* Body */}
      <div style={{ marginTop: "12px" }}>
        <TextRow>
          <Pink>This is to Certify that&nbsp;&nbsp;</Pink>
          <DotLine value={name} minWidth={320} flex={3} />
        </TextRow>
        <TextRow>
          <Pink>Is/Was a Bonafide Student of this</Pink>
        </TextRow>
        <TextRow>
          <Pink>School. His / Her birth date as recorded in the General Register of the</Pink>
        </TextRow>
        <TextRow>
          <Pink>School is&nbsp;</Pink>
          <DotLine value={student.dateOfBirth} minWidth={120} />
          &nbsp;<Pink>(in words)&nbsp;</Pink>
          <DotLine value={dobWords} minWidth={200} flex={2} />
        </TextRow>
        <TextRow>
          <DotLine value="" minWidth={200} flex={1} />
          &nbsp;<Pink>He / She bears</Pink>
        </TextRow>
        <TextRow>
          <Pink>good moral character.</Pink>
        </TextRow>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: "36px",
        left: "44px",
        right: "44px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        fontSize: "15px",
      }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <Pink>Std</Pink>
          <DotLine value={student.standard || ""} minWidth={80} />
          <Pink>Divi.</Pink>
          <DotLine value={student.section || ""} minWidth={80} />
        </span>
        <span style={{ fontWeight: 500, color: BONAFIDE_MAGENTA }}>
          {CERTIFICATE_SCHOOL.principalLabel}
        </span>
      </div>
    </BonafideBorderFrame>
  );
}
