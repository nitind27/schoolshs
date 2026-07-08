"use client";

import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

interface StudentIdCardProps {
  student: Student & { schoolClass?: { name: string; standard: string; section: string } | null };
  settings: SchoolSettings;
  photoUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  className?: string;
}

/*
 * Pixel-accurate replica of Gujarat school physical ID card:
 *
 *  ┌──────────────────────────────────────┐
 *  │ [●LOGO]  small tagline text          │  ← yellow bg, logo circle left
 *  │          LARGE SCHOOL NAME           │  ← white bold, blue clipped right
 *  ├──────────────────────────────────────┤
 *  │[માધ્ય]  ફોર્ટ સોનગઢ, જિ. તાપી      │  ← dark blue/teal bar
 *  ├──────────────────────────────────────┤
 *  │                                      │
 *  │      ┌──────────┐      ┌─(9-A)─┐   │  ← photo centered-left, badge right
 *  │      │  PHOTO   │      │ class  │   │
 *  │      └──────────┘      └───────┘   │
 *  │                                      │
 *  │          આરતી શાહ                   │  ← large red bold name
 *  │  પિતાનું નામ : વિનયભાઈ શાહ           │
 *  │  સરનામું     : બ્રહ્મણ ફળિયું-સોનગઢ  │
 *  │                તા. ફોર્ટ સોનગઢ...    │
 *  │  મો.નં       : ૯૯૨૫૩ ૭૦૮૭૦         │
 *  │  જન્મ તા.    : ૧૮/૦૫/૨૦૧૨          │
 *  │  જી.આર.નં.   : ૨૩૫૫૫  (red)        │
 *  ├──────────────────────────────────────┤
 *  │ 25-2026    620    [sign] આચાર્ચ…    │  ← gold/yellow strip
 *  └──────────────────────────────────────┘
 */

export function StudentIdCard({
  student,
  settings,
  photoUrl,
  logoUrl,
  signatureUrl,
  className,
}: StudentIdCardProps) {
  const accent = settings.idCardAccentColor || "#1a3a6b";

  const fullName = [student.firstName, student.middleName, student.surname]
    .filter(Boolean).join(" ");

  const classLabel =
    student.standard && student.section
      ? `${student.standard}-${student.section}`
      : student.schoolClass
        ? `${student.schoolClass.standard}-${student.schoolClass.section}`
        : student.standard || "";

  const fyParts = (settings.academicYear || "2025-26").split("-");
  const shortFy = `${fyParts[0].slice(2)}-${fyParts[0].slice(0, 2)}${fyParts[1] || "26"}`;

  const addr1 = student.currentAddress || "";
  const addr2 = [
    student.currentCity ? `તા. ${student.currentCity}` : "",
    student.currentDistrict ? `જિ. ${student.currentDistrict}` : "",
  ].filter(Boolean).join(", ");

  return (
    <div
      className={cn("id-card print:break-inside-avoid print:shadow-none", className)}
      style={{
        width: "360px",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 6px 28px rgba(0,0,0,.32), 0 0 0 1.5px rgba(0,0,0,.1)",
        fontFamily: "'Noto Sans Gujarati', 'Shruti', 'Lohit Gujarati', 'Arial Unicode MS', sans-serif",
        background: "#ffffff",
        position: "relative",
      }}
    >

      {/* ══════════════════════════════════════
          ZONE 1 — HEADER
          ══════════════════════════════════════ */}
      <div style={{
        position: "relative",
        height: "88px",
        background: "linear-gradient(180deg, #f5c518 0%, #f8d648 45%, #f5c518 100%)",
        overflow: "hidden",
      }}>
        {/* Blue curved shape on right */}
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "55%",
          height: "100%",
          background: accent,
          clipPath: "polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)",
          borderLeft: "2px solid rgba(255,255,255,0.2)",
        }} />

        {/* Decorative green corner shape */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "60px",
          height: "60px",
          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          clipPath: "polygon(0 100%, 0 0, 100% 100%)",
          opacity: 0.6,
        }} />

        {/* Green bottom strip */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
          zIndex: 3,
        }} />

        {/* Content row */}
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          height: "84px",
          padding: "0 12px 0 10px",
          gap: "10px",
        }}>
          {/* Logo circle */}
          <div style={{
            width: "66px",
            height: "66px",
            borderRadius: "50%",
            border: "3px solid #ffffff",
            background: "#fff",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 2px 12px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "32px", lineHeight: 1 }}>🏫</span>
            )}
          </div>

          {/* Text block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Tagline — dark text on yellow */}
            <p style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#1a1a1a",
              letterSpacing: "0.03em",
              lineHeight: 1.3,
              marginBottom: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 1px 2px rgba(255,255,255,0.5)",
            }}>
              {settings.tagline || "સાર્વજનિક એજ્યુકેશન સંચાલિત"}
            </p>
            {/* School name — WHITE, large, bold with text shadow */}
            <p style={{
              fontSize: "23px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "0.01em",
              textShadow: "0 2px 6px rgba(0,0,0,.65), 0 1px 2px rgba(0,0,0,.4)",
              wordBreak: "break-word",
              whiteSpace: "normal",
              WebkitTextStroke: "0.5px rgba(0,0,0,0.1)",
            }}>
              {settings.schoolName || "સ્કૂલ"}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ZONE 2 — BLUE INFO BAR
          ══════════════════════════════════════ */}
      <div style={{
        background: accent,
        display: "flex",
        alignItems: "center",
        minHeight: "30px",
        padding: "0 2px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        {/* Left pill — school type */}
        <div style={{
          background: "#3b6fd4",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          padding: "4px 16px",
          display: "flex",
          alignItems: "center",
          borderRight: "2px solid rgba(255,255,255,.2)",
          whiteSpace: "nowrap",
          letterSpacing: "0.03em",
          height: "100%",
          borderRadius: "0 4px 4px 0",
        }}>
          માધ્યમિક
        </div>

        {/* Right — location */}
        <div style={{
          flex: 1,
          color: "#fff",
          fontSize: "12px",
          fontWeight: 500,
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          letterSpacing: "0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {settings.schoolAddress
            ? settings.schoolAddress.split(",").slice(-2).join(",").trim()
            : "ફોર્ટ સોનગઢ, જિ. તાપી"}
        </div>
      </div>

      {/* ══════════════════════════════════════
          ZONE 3 — WHITE BODY
          ══════════════════════════════════════ */}
      <div style={{
        background: "#ffffff",
        padding: "10px 14px 8px",
        position: "relative",
      }}>

        {/* Photo row — centered photo + class badge top-right */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          position: "relative",
          marginBottom: "8px",
          paddingLeft: "10px",
        }}>

          {/* Student photo — centered */}
          <div style={{
            width: "118px",
            height: "146px",
            border: `3px solid ${accent}`,
            borderRadius: "6px",
            overflow: "hidden",
            background: "#e8edf5",
            boxShadow: "0 2px 10px rgba(0,0,0,.2)",
            flexShrink: 0,
            position: "relative",
          }}>
            {/* Fingerprint background */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.06,
              background: `radial-gradient(circle at 30% 40%, ${accent} 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "#9ca3af", fontSize: "10px", gap: "4px",
                position: "relative",
                zIndex: 1,
              }}>
                <span style={{ fontSize: "36px" }}>👤</span>
                <span>Photo</span>
              </div>
            )}
          </div>

          {/* Class badge — SVG exactly like image */}
          {classLabel && (
            <div style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              width: "76px",
              height: "76px",
            }}>
              <svg viewBox="0 0 76 76" style={{
                position: "absolute",
                width: "76px",
                height: "76px",
                top: 0,
                left: 0,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
              }}>
                {/* White fill circle with border */}
                <circle cx="38" cy="38" r="35" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />

                {/* Blue arc - top-right */}
                <circle cx="38" cy="38" r="31"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="5"
                  strokeDasharray="40 160"
                  strokeDashoffset="-10"
                  strokeLinecap="round" />

                {/* Pink/Red arc - bottom */}
                <circle cx="38" cy="38" r="31"
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="5"
                  strokeDasharray="32 168"
                  strokeDashoffset="-85"
                  strokeLinecap="round" />

                {/* Orange dot - right side */}
                <circle cx="60" cy="30" r="4.5" fill="#f97316" stroke="white" strokeWidth="1.5" />

                {/* Blue dot - top right */}
                <circle cx="54" cy="17" r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
              </svg>

              {/* Class text inside */}
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 900,
                color: accent,
                letterSpacing: "-0.5px",
                zIndex: 2,
                fontFamily: "'Noto Sans Gujarati', 'Shruti', sans-serif",
              }}>
                {classLabel}
              </div>
            </div>
          )}
        </div>

        {/* ── Student name — large red bold Gujarati ── */}
        <p style={{
          fontSize: "22px",
          fontWeight: 900,
          color: "#dc2626",
          textAlign: "center",
          letterSpacing: "0.04em",
          lineHeight: 1.2,
          marginBottom: "8px",
          fontFamily: "'Noto Sans Gujarati', 'Shruti', sans-serif",
          textShadow: "0 1px 2px rgba(220,38,38,0.1)",
        }}>
          {fullName}
        </p>

        {/* ── Info table — exact label alignment ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", lineHeight: 1.5 }}>
          <tbody>
            {/* Father */}
            <InfoRow label="પિતાનું નામ" colon value={student.fatherName} />

            {/* Address line 1 */}
            {addr1 && <InfoRow label="સરનામું" colon value={addr1} />}

            {/* Address line 2 — indented, no label */}
            {addr2 && <InfoRow label="" colon={false} value={addr2} indent />}

            {/* Mobile */}
            <InfoRow label="મો.નં" colon value={student.mobileNumber} />

            {/* DOB */}
            <InfoRow label="જન્મ તા." colon value={student.dateOfBirth} />

            {/* GR Number — RED value */}
            {student.grNumber && (
              <InfoRow label="જી.આર.નં." colon value={student.grNumber} red />
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════
          ZONE 4 — GOLD FOOTER
          ══════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(90deg, #f5c518 0%, #f8d648 35%, #f5c518 65%, #f8d648 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px 6px 14px",
        borderTop: "2px solid #d4a800",
        minHeight: "42px",
        gap: "8px",
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4)",
      }}>
        {/* Left — academic year */}
        <span style={{
          fontSize: "13px",
          fontWeight: 800,
          color: "#1e3a8a",
          whiteSpace: "nowrap",
          letterSpacing: "0.04em",
          textShadow: "0 1px 2px rgba(255,255,255,0.3)",
        }}>
          {shortFy}
        </span>

        {/* Center — roll / card number */}
        <span style={{
          fontSize: "20px",
          fontWeight: 900,
          color: "#111",
          letterSpacing: "0.06em",
          textShadow: "0 1px 2px rgba(255,255,255,0.2)",
        }}>
          {student.rollNumber || student.grNumber || "—"}
        </span>

        {/* Right — signature + label */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "75px",
        }}>
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="sign"
              style={{ height: "22px", objectFit: "contain", opacity: 0.85 }} />
          ) : (
            <svg width="65" height="22" viewBox="0 0 65 22">
              <path d="M4,16 Q12,4 22,13 Q30,19 38,9 Q46,3 58,11"
                fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
          <span style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#1e3a8a",
            letterSpacing: "0.03em",
            marginTop: "1px",
            whiteSpace: "nowrap",
            textShadow: "0 1px 2px rgba(255,255,255,0.2)",
          }}>
            આચાર્યની સ
          </span>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
function InfoRow({
  label,
  colon,
  value,
  red,
  indent,
}: {
  label: string;
  colon: boolean;
  value: string;
  red?: boolean;
  indent?: boolean;
}) {
  if (!value && !indent) return null;

  return (
    <tr>
      {/* Label cell */}
      <td style={{
        fontSize: "11.5px",
        fontWeight: 700,
        color: "#1a1a1a",
        verticalAlign: "top",
        paddingBottom: "3px",
        paddingRight: "0px",
        whiteSpace: "nowrap",
        width: indent ? "0" : "88px",
        paddingLeft: indent ? "88px" : "0",
        fontFamily: "'Noto Sans Gujarati', 'Shruti', sans-serif",
      }}>
        {label}
      </td>

      {/* Colon cell */}
      {colon && !indent ? (
        <td style={{
          fontSize: "11.5px",
          fontWeight: 700,
          color: "#1a1a1a",
          verticalAlign: "top",
          paddingBottom: "3px",
          paddingRight: "4px",
          width: "10px",
          textAlign: "center",
        }}>
          :
        </td>
      ) : (
        !indent && <td style={{ width: "10px" }} />
      )}

      {/* Value cell */}
      <td style={{
        fontSize: "11.5px",
        fontWeight: indent ? 400 : 500,
        color: red ? "#dc2626" : "#111",
        verticalAlign: "top",
        paddingBottom: "3px",
        lineHeight: 1.4,
        fontFamily: "'Noto Sans Gujarati', 'Shruti', sans-serif",
      }}
        colSpan={indent ? 3 : 1}
      >
        {value}
      </td>
    </tr>
  );
}