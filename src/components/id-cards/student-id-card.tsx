"use client";

import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { toGujaratiDigits } from "@/lib/certificates/gujarati-date";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { cn } from "@/lib/utils";

interface StudentIdCardProps {
  student: Student & { schoolClass?: { name: string; standard: string; section: string } | null };
  settings: SchoolSettings;
  photoUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  className?: string;
}

/**
 * Physical Gujarat school ID card layout (portrait):
 * yellow/navy header + logo · માધ્યમિક / location bar · photo + class badge ·
 * red name · fields · yellow footer (year / roll / આચાર્યની સહી)
 */
export function StudentIdCard({
  student,
  settings,
  photoUrl,
  logoUrl = SCHOOL_LOGO_URL,
  signatureUrl,
  className,
}: StudentIdCardProps) {
  const accent = "#0b2a5b";
  const primary = "#1e5aa8";
  const crest = logoUrl || SCHOOL_LOGO_URL;

  const fullName = [student.firstName, student.middleName, student.surname]
    .filter(Boolean)
    .join(" ");

  const classLabel =
    student.standard && student.section
      ? `${student.standard}-${student.section}`
      : student.schoolClass
        ? `${student.schoolClass.standard}-${student.schoolClass.section}`
        : student.standard || "";

  // Prefer full year like 2025-2026 for footer
  const yearParts = (settings.academicYear || "2025-26").split("-");
  const footerYear =
    yearParts.length === 2 && yearParts[1].length === 2
      ? `${yearParts[0]}-20${yearParts[1]}`
      : settings.academicYear || "2025-2026";

  const addr1 = student.currentAddress || "";
  const addr2 = [
    student.currentCity ? `તા. ${student.currentCity}` : "",
    student.currentDistrict ? `જિ. ${student.currentDistrict}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const locationLine = settings.schoolAddress
    ? settings.schoolAddress.split(",").slice(-2).join(",").trim()
    : "ફોર્ટ સોનગઢ, જિ. તાપી";

  // ID card branding (Gujarati title like physical card)
  const schoolTitle =
    /[\u0A80-\u0AFF]/.test(settings.schoolName || "")
      ? settings.schoolName!
      : "સાર્વજનિક હાઈસ્કૂલ";
  const tagline = settings.tagline || "સાર્વજનિક એજ્યુકેશન સંચાલિત";

  const gu = (v?: string | null) => (v ? toGujaratiDigits(String(v)) : "");
  const rawCenter = String(student.rollNumber || student.grNumber || "—");
  const centerNo =
    rawCenter.length > 10 && /^\d+$/.test(rawCenter)
      ? rawCenter.slice(-6)
      : rawCenter.length > 12
        ? rawCenter.slice(0, 10)
        : rawCenter;

  return (
    <div
      className={cn("id-card print:break-inside-avoid print:shadow-none", className)}
      style={{
        width: "340px",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 8px 28px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.08)",
        fontFamily:
          "'Noto Sans Gujarati', 'Shruti', 'Lohit Gujarati', 'Arial Unicode MS', sans-serif",
        background: "#fff",
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          position: "relative",
          height: "92px",
          background: "linear-gradient(165deg, #f7c91a 0%, #f0b400 48%, #e8a800 100%)",
          overflow: "hidden",
        }}
      >
        {/* Navy curved block (right) */}
        <svg
          viewBox="0 0 340 92"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          aria-hidden
        >
          <path
            d="M118,0 C160,8 175,38 168,92 L340,92 L340,0 Z"
            fill={accent}
          />
          <path
            d="M0,70 C40,88 90,92 130,92 L0,92 Z"
            fill="#1a9b4a"
            opacity="0.85"
          />
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "8px 12px 10px 10px",
            gap: "10px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              border: "3px solid #fff",
              background: "#fff",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 2px 10px rgba(0,0,0,.28)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={crest}
              alt="School logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
            <p
              style={{
                fontSize: "9.5px",
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                lineHeight: 1.25,
                letterSpacing: "0.02em",
                textShadow: "0 1px 2px rgba(0,0,0,.35)",
              }}
            >
              {tagline}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "22px",
                fontWeight: 900,
                color: "#ffe566",
                lineHeight: 1.05,
                textShadow: "0 2px 4px rgba(0,0,0,.5)",
                letterSpacing: "0.01em",
              }}
            >
              {schoolTitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-bar: માધ્યમિક | location ── */}
      <div style={{ display: "flex", minHeight: "28px" }}>
        <div
          style={{
            background: accent,
            color: "#fff",
            fontSize: "12px",
            fontWeight: 800,
            padding: "5px 14px",
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            letterSpacing: "0.04em",
          }}
        >
          માધ્યમિક
        </div>
        <div
          style={{
            flex: 1,
            background: primary,
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
            padding: "5px 12px",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {locationLine}
        </div>
      </div>

      {/* ── Body ── */}
      <div
        style={{
          position: "relative",
          padding: "12px 14px 10px",
          background: "#fff",
          minHeight: "280px",
        }}
      >
        {/* Watermark crest */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={crest}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            width: "200px",
            height: "200px",
            objectFit: "contain",
            opacity: 0.07,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Photo + class badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              position: "relative",
              marginBottom: "10px",
              paddingRight: classLabel ? "36px" : 0,
            }}
          >
            <div
              style={{
                width: "112px",
                height: "138px",
                borderRadius: "8px",
                border: "2.5px solid #111",
                overflow: "hidden",
                background: "#eef2f7",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={fullName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    fontSize: "11px",
                  }}
                >
                  Photo
                </div>
              )}
            </div>

            {classLabel && (
              <div
                className="id-card-class-badge"
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "-2px",
                  width: "76px",
                  height: "76px",
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(15,23,42,.14), 0 0 0 1px rgba(15,23,42,.06)",
                }}
              >
                {/*
                  Class ring — matches physical card badge:
                  red left arc, blue bottom-right arc, blue + orange dots (1 & 2 o'clock)
                */}
                <svg
                  viewBox="0 0 80 80"
                  width="76"
                  height="76"
                  style={{ position: "absolute", inset: 0, display: "block" }}
                  aria-hidden
                >
                  {/* Red arc — left side ~10:30 → 7:30 */}
                  <path
                    d="M 18.1 18.1 A 31 31 0 0 0 18.1 61.9"
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  {/* Blue arc — bottom-right ~4 → 6 */}
                  <path
                    d="M 66.8 55.5 A 31 31 0 0 1 40 71"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  {/* Blue dot — 1 o'clock */}
                  <circle cx="55.5" cy="13.2" r="3.1" fill="#2563eb" />
                  {/* Orange dot — 2 o'clock */}
                  <circle cx="66.8" cy="24.5" r="4" fill="#f97316" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.5px",
                    fontFamily:
                      "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {classLabel}
                </div>
              </div>
            )}
          </div>

          {/* Name — red */}
          <p
            style={{
              margin: "0 0 8px",
              textAlign: "center",
              fontSize: "22px",
              fontWeight: 900,
              color: "#d11a2a",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
            }}
          >
            {fullName || "—"}
          </p>

          {/* Fields */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <InfoRow label="પિતાનું નામ" value={student.fatherName || ""} />
              {addr1 ? <InfoRow label="સરનામું" value={addr1} /> : null}
              {addr2 ? <InfoRow label="" value={addr2} indent /> : null}
              <InfoRow label="મો. નં" value={gu(student.mobileNumber)} />
              <InfoRow label="જન્મ તા." value={gu(student.dateOfBirth)} />
              {student.grNumber ? (
                <InfoRow label="જી.આર. નં." value={gu(student.grNumber)} />
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Yellow wavy footer ── */}
      <div style={{ position: "relative", marginTop: "-2px" }}>
        <svg
          viewBox="0 0 340 18"
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "16px" }}
          aria-hidden
        >
          <path
            d="M0,18 L0,10 C40,2 80,16 120,10 C160,4 200,14 240,8 C280,2 310,12 340,6 L340,18 Z"
            fill="#f5c518"
          />
        </svg>
        <div
          style={{
            background: "linear-gradient(90deg, #f5c518 0%, #f8d84a 50%, #f5c518 100%)",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "end",
            padding: "2px 12px 8px",
            minHeight: "48px",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#0b2a5b",
              whiteSpace: "nowrap",
              justifySelf: "start",
            }}
          >
            {footerYear}
          </span>

          <span
            style={{
              fontSize: "18px",
              fontWeight: 900,
              color: "#111",
              letterSpacing: "0.04em",
              maxWidth: "110px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {/^\d/.test(centerNo) || /[૦-૯]/.test(centerNo)
              ? toGujaratiDigits(centerNo)
              : centerNo}
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifySelf: "end",
              minWidth: "72px",
            }}
          >
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt=""
                style={{ height: "22px", objectFit: "contain" }}
              />
            ) : (
              <svg width="70" height="22" viewBox="0 0 70 22" aria-hidden>
                <path
                  d="M3,15 Q14,4 24,12 Q34,18 44,8 Q54,2 66,12"
                  fill="none"
                  stroke="#222"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#1e3a8a",
                marginTop: "1px",
                whiteSpace: "nowrap",
              }}
            >
              આચાર્યની સહી
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  indent,
}: {
  label: string;
  value: string;
  indent?: boolean;
}) {
  if (!value && !indent) return null;

  return (
    <tr>
      <td
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "#111",
          verticalAlign: "top",
          paddingBottom: "4px",
          whiteSpace: "nowrap",
          width: indent ? 0 : "92px",
          paddingLeft: indent ? "92px" : 0,
        }}
      >
        {label}
        {label ? " :" : ""}
      </td>
      <td
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "#111",
          verticalAlign: "top",
          paddingBottom: "4px",
          lineHeight: 1.35,
          paddingLeft: label ? "4px" : 0,
        }}
        colSpan={indent ? 1 : 1}
      >
        {value}
      </td>
    </tr>
  );
}
