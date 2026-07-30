"use client";

import type { ReactNode } from "react";
import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { toGujaratiDigits } from "@/lib/certificates/gujarati-date";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { studentDisplayFatherName, studentFullNameGu } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CreditCard,
  Home,
  Phone,
  ScrollText,
  Users,
  UserRound,
} from "lucide-react";

interface StudentIdCardProps {
  student: Student & {
    schoolClass?: { name: string; standard: string; section: string } | null;
  };
  settings: SchoolSettings;
  photoUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  className?: string;
}

const CARD_W = 340;
const NAVY = "#0b3a6e";
const NAVY_DEEP = "#082a52";
const NAME_RED = "#c4121a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

function gu(v?: string | null) {
  if (!v) return "";
  return toGujaratiDigits(String(v).trim());
}

function formatMobile(v?: string | null) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 10) return gu(`${d.slice(0, 5)} ${d.slice(5)}`);
  return gu(v);
}

function formatDob(v?: string | null) {
  if (!v) return "";
  return gu(v.replace(/-/g, "/"));
}

function formatAddress(student: Student) {
  const raw = (student.currentAddress || "").trim();
  const city = (student.currentCity || "").trim();
  const dist = (student.currentDistrict || "").trim();
  if (raw && (raw.includes("તા.") || raw.includes("જિ.") || raw.includes("મુ."))) {
    return raw.replace(/\s+/g, " ");
  }
  const parts: string[] = [];
  if (raw) parts.push(raw.startsWith("મુ") ? raw : `મુ.${raw}`);
  if (city) parts.push(city.startsWith("તા") ? city : `તા.${city}`);
  if (dist) parts.push(dist.startsWith("જિ") ? dist : `જિ.${dist}`);
  return parts.join(", ");
}

/**
 * Modern front ID card UI matching school reference:
 * navy header · photo + ધોરણ chip · red name · icon rows · year/seat + signature footer
 */
export function StudentIdCard({
  student,
  settings,
  photoUrl,
  logoUrl = SCHOOL_LOGO_URL,
  signatureUrl,
  className,
}: StudentIdCardProps) {
  const crest = logoUrl || SCHOOL_LOGO_URL;

  const fullName =
    studentFullNameGu(student) ||
    [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");

  const father = studentDisplayFatherName(student) || student.fatherName || "";

  const classLabel =
    student.standard && student.section
      ? `${student.standard}-${student.section}`
      : student.schoolClass
        ? `${student.schoolClass.standard}-${student.schoolClass.section}`
        : student.standard || "";

  const year = (settings.academicYear || "2025-26").split("-")[0] || "2025";
  const seatNo = String(student.rollNumber || "").trim() || "—";

  const tagline = settings.tagline?.trim() || "સાર્વજનિક એજ્યુકેશન સંચાલિત";
  const schoolTitle = /[\u0A80-\u0AFF]/.test(settings.schoolName || "")
    ? settings.schoolName!
    : "સાર્વજનિક હાઈસ્કૂલ";

  const locationShort =
    settings.schoolAddress?.trim() || "ફોર્ટ સોનગઢ, જિ. તાપી";

  return (
    <article
      className={cn("id-card print:break-inside-avoid", className)}
      style={{
        width: CARD_W,
        maxWidth: "100%",
        borderRadius: 16,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 14px 40px rgba(8,42,82,.22), 0 0 0 1px rgba(8,42,82,.08)",
        fontFamily:
          "'Noto Sans Gujarati', 'Shruti', 'Lohit Gujarati', 'Arial Unicode MS', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          background: `linear-gradient(145deg, ${NAVY_DEEP} 0%, ${NAVY} 55%, #14508f 100%)`,
          padding: "14px 14px 12px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#fff",
              border: "2.5px solid rgba(255,255,255,.85)",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,.25)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={crest}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 650,
                opacity: 0.92,
                letterSpacing: "0.02em",
                lineHeight: 1.25,
              }}
            >
              {tagline}
            </p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "0.01em",
              }}
            >
              {schoolTitle}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              background: "rgba(0,0,0,.28)",
              padding: "4px 10px",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.03em",
            }}
          >
            ઉચ્ચ માધ્યમિક
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 650,
              opacity: 0.95,
              lineHeight: 1.2,
            }}
          >
            {locationShort}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ padding: "16px 16px 12px", background: "#fff" }}>
        {/* Photo + class */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 108,
              height: 130,
              borderRadius: 10,
              border: `1.5px solid ${LINE}`,
              overflow: "hidden",
              background: "#f1f5f9",
              boxShadow: "0 2px 8px rgba(15,23,42,.08)",
              flexShrink: 0,
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
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Photo
              </div>
            )}
          </div>

          {classLabel ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                paddingTop: 8,
                minWidth: 72,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: NAVY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={18} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: MUTED }}>ધોરણ</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 56,
                  borderRadius: 8,
                  border: `1.5px solid ${LINE}`,
                  background: "#fff",
                  padding: "5px 10px",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#0f172a",
                  fontFamily: "system-ui, Segoe UI, Arial, sans-serif",
                  boxShadow: "0 1px 3px rgba(15,23,42,.06)",
                }}
              >
                {classLabel}
              </span>
            </div>
          ) : null}
        </div>

        {/* Name */}
        <p
          style={{
            margin: "0 0 12px",
            textAlign: "center",
            fontSize: 22,
            fontWeight: 900,
            color: NAME_RED,
            letterSpacing: "0.02em",
            lineHeight: 1.15,
          }}
        >
          {fullName || "—"}
        </p>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <InfoLine
            icon={<UserRound size={15} strokeWidth={2.2} />}
            label="પિતાનું નામ"
            value={father}
            divider
          />
          <InfoLine
            icon={<Home size={15} strokeWidth={2.2} />}
            label="સરનામું"
            value={formatAddress(student)}
          />
          <InfoLine
            icon={<Phone size={15} strokeWidth={2.2} />}
            label="મો.નં."
            value={formatMobile(student.mobileNumber)}
          />
          <InfoLine
            icon={<CalendarDays size={15} strokeWidth={2.2} />}
            label="જન્મ તા."
            value={formatDob(student.dateOfBirth)}
          />
          <InfoLine
            icon={<ScrollText size={15} strokeWidth={2.2} />}
            label="જી.આર.નં."
            value={gu(student.grNumber)}
            emphasize
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${LINE}`,
          background: "#f8fafc",
          padding: "12px 14px 14px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <MetaChip
            icon={<CalendarDays size={13} strokeWidth={2.2} />}
            label="Academic Year"
            value={gu(year) || year}
          />
          <MetaChip
            icon={<CreditCard size={13} strokeWidth={2.2} />}
            label="Seat No."
            value={/^\d+$/.test(seatNo) ? gu(seatNo) : seatNo}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            minWidth: 88,
          }}
        >
          {/* Holographic-style seal */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background:
                "conic-gradient(from 210deg, #93c5fd, #fef08a, #fda4af, #c4b5fd, #93c5fd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 6px rgba(15,23,42,.15)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crest}
                alt=""
                style={{ width: 20, height: 20, objectFit: "contain" }}
              />
            </div>
          </div>

          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt=""
              style={{ height: 22, maxWidth: 86, objectFit: "contain" }}
            />
          ) : (
            <svg width={78} height={22} viewBox="0 0 78 22" aria-hidden>
              <path
                d="M3,15 Q14,4 24,12 Q36,20 48,8 Q60,2 74,13"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: NAVY,
              whiteSpace: "nowrap",
            }}
          >
            આચાર્યની સહી
          </span>
        </div>
      </footer>
    </article>
  );
}

function InfoLine({
  icon,
  label,
  value,
  divider,
  emphasize,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  divider?: boolean;
  emphasize?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "7px 0",
        borderBottom: divider ? `1px solid ${LINE}` : "none",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: "#f1f5f9",
          color: NAVY,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0, flex: 1, lineHeight: 1.35 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: MUTED }}>{label}: </span>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: emphasize ? 800 : 700,
            color: emphasize ? NAME_RED : "#0f172a",
            textDecoration: emphasize ? "underline" : "none",
            textUnderlineOffset: 2,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${LINE}`,
        background: "#fff",
        padding: "7px 9px",
        minWidth: 78,
        boxShadow: "0 1px 2px rgba(15,23,42,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: MUTED,
          marginBottom: 3,
        }}
      >
        {icon}
        <span style={{ fontSize: 8.5, fontWeight: 750, letterSpacing: "0.02em" }}>
          {label}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 900,
          color: "#0f172a",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
    </div>
  );
}
