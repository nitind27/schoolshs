"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { studentFullName } from "@/lib/certificates/date-to-words";

/*
 * Character/Trial/Bonafide Certificate
 * Matches the physical document scan (Page 3 of PDF):
 *
 *  ┌──────────────────────────────────────────────┐
 *  │  Shri Sarvajanik HighSchool Fort-Songadh     │  ← large bold title
 *  │  Secondary & Higher Secondary Section        │  ← subtitle
 *  │  S.S.C. Index No. 79.018   Ph. 222186        │
 *  │  H.S.C. Index No. 28-003                     │
 *  │                                              │
 *  │              [SCHOOL LOGO]                   │  ← circular logo center
 *  │                                              │
 *  │       CHARACTER/TRIAL/BONAFIDE CERTIFICATE   │  ← heading underlined
 *  │                                              │
 *  │  G.R. No. :-  ___    Year :- 201  -201       │
 *  │                                              │
 *  │  This is to Certify that ________________    │
 *  │  Is/Was a Bonafide Student of this School.   │
 *  │  He/She Passed his/her S.S.C./H.S.C.         │
 *  │  Examination of _____ at the _____ Trial.    │
 *  │  And Good Moral Character.                   │
 *  │                                              │
 *  │  Date: __ / __       /201                    │
 *  └──────────────────────────────────────────────┘
 */

export function CharacterCertificateView({
  student,
  grNumber,
  academicYear,
  examName,
  examResult,
  issueDate,
  logoUrl,
}: {
  student: { firstName: string; middleName?: string | null; surname: string; gender: string };
  grNumber?: string;
  academicYear: string;
  examName?: string;
  examResult?: string;
  issueDate: string;
  logoUrl?: string;
}) {
  const name = studentFullName(student);
  const heShe   = student.gender === "Female" ? "she" : "he";
  const hisHer  = student.gender === "Female" ? "her" : "his";
  const [y1, y2] = (academicYear || "2025-26").split("-");
  const yearShort1 = y1?.slice(-3);          // "201"
  const yearShort2 = y2?.slice(-3) || "201"; // "201"

  return (
    <div
      className="cert-page cert-border-double"
      style={{
        minHeight: "190mm",
        padding: "20px 32px 28px",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "11px",
        position: "relative",
      }}
    >
      {/* ── School Header ──────────────────────────────── */}
      <h1 style={{
        textAlign: "center",
        fontSize: "19px",
        fontWeight: "bold",
        letterSpacing: "0.04em",
        margin: "0 0 4px",
        lineHeight: 1.2,
      }}>
        {CERTIFICATE_SCHOOL.nameEnAlt}
      </h1>

      <p style={{
        textAlign: "center",
        fontSize: "12px",
        fontWeight: "bold",
        margin: "0 0 8px",
        letterSpacing: "0.01em",
      }}>
        {CERTIFICATE_SCHOOL.section}
      </p>

      {/* Index / Phone row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "10px",
        margin: "0 0 2px",
      }}>
        <span>S.S.C. Index No. {CERTIFICATE_SCHOOL.sscIndex}</span>
        <span>Ph. {CERTIFICATE_SCHOOL.phone}</span>
      </div>
      <div style={{ fontSize: "10px", margin: "0 0 16px" }}>
        H.S.C. Index No. {CERTIFICATE_SCHOOL.hscIndex}
      </div>

      {/* ── School Logo circle (centered) ─────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        margin: "0 0 16px",
      }}>
        <div style={{
          width: "88px",
          height: "88px",
          borderRadius: "50%",
          border: "2px solid #444",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f9",
        }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            /* placeholder text matching the scan */
            <div style={{
              textAlign: "center",
              fontSize: "6px",
              lineHeight: 1.4,
              color: "#333",
              padding: "6px",
            }}>
              <div style={{ fontWeight: "bold", fontSize: "7px" }}>Shri Sarvajanik</div>
              <div>High School</div>
              <div>Fort-Songadh</div>
              <div>Dist. Tapi</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Certificate Heading ───────────────────────── */}
      <h2 style={{
        textAlign: "center",
        fontSize: "14px",
        fontWeight: "bold",
        textDecoration: "underline",
        textUnderlineOffset: "4px",
        letterSpacing: "0.06em",
        margin: "0 0 24px",
      }}>
        CHARACTER/TRIAL/BONAFIDE CERTIFICATE
      </h2>

      {/* ── GR No + Year ──────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: "40px",
        fontSize: "11px",
        marginBottom: "24px",
        alignItems: "baseline",
      }}>
        <span>
          G.R. No. :-{" "}
          <span style={{
            display: "inline-block",
            borderBottom: "1px dotted #333",
            minWidth: "80px",
            paddingBottom: "1px",
          }}>
            {grNumber || ""}
          </span>
        </span>
        <span>
          Year :- 20{yearShort1}{" "}
          &nbsp;&nbsp;-&nbsp;&nbsp;
          20{yearShort2}
        </span>
      </div>

      {/* ── Body text ────────────────────────────────── */}
      <p style={{ lineHeight: 2.5, fontSize: "11px", margin: "0 0 0" }}>
        This is to Certify that&nbsp;&nbsp;
        <span style={{
          display: "inline-block",
          borderBottom: "1px dotted #333",
          minWidth: "260px",
          paddingBottom: "1px",
          fontWeight: "600",
        }}>
          {name}
        </span>
      </p>

      <p style={{ lineHeight: 2.5, fontSize: "11px", margin: "0" }}>
        Is/Was a Bonafide Student of this School.{" "}
        {heShe.charAt(0).toUpperCase() + heShe.slice(1)} Passed {hisHer}{" "}
        S.S.C./H.S.C.
      </p>

      <p style={{ lineHeight: 2.5, fontSize: "11px", margin: "0" }}>
        Examination of&nbsp;
        <span style={{
          display: "inline-block",
          borderBottom: "1px dotted #333",
          minWidth: "160px",
          paddingBottom: "1px",
        }}>
          {examName || ""}
        </span>
        &nbsp;&nbsp;at the&nbsp;
        <span style={{
          display: "inline-block",
          borderBottom: "1px dotted #333",
          minWidth: "120px",
          paddingBottom: "1px",
        }}>
          {examResult || ""}
        </span>
      </p>

      <p style={{ lineHeight: 2.5, fontSize: "11px", margin: "0" }}>
        Trial. And Good Moral Character.
      </p>

      {/* ── Date + Signature ────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginTop: "48px",
        fontSize: "11px",
      }}>
        <div>
          <p style={{ margin: 0 }}>
            Date:&nbsp;&nbsp;
            <span style={{ borderBottom: "1px solid #333", display: "inline-block", minWidth: "24px" }}></span>
            &nbsp;/&nbsp;
            <span style={{ borderBottom: "1px solid #333", display: "inline-block", minWidth: "24px" }}></span>
            &nbsp;&nbsp;/20{yearShort1}
          </p>
        </div>
      </div>

      {/* ── Serial in bottom right ────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: "28px",
        right: "32px",
        fontSize: "11px",
      }}>
        /{yearShort1}
      </div>
    </div>
  );
}
