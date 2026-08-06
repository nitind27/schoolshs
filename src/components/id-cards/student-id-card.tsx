"use client";

import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { toGujaratiDigits } from "@/lib/certificates/gujarati-date";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { studentDisplayFatherName, studentFullNameGu } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import "./student-id-card.css";

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

/** ISO/IEC 7810 ID-1 portrait (CR-80) — front face only */
export const ID_CARD_WIDTH_MM = 54;
export const ID_CARD_HEIGHT_MM = 85.6;

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

export function StudentIdCard({
  student,
  settings,
  photoUrl,
  logoUrl = SCHOOL_LOGO_URL,
  signatureUrl,
  className,
}: StudentIdCardProps) {
  const crest = logoUrl || SCHOOL_LOGO_URL;
  const primary = settings.idCardPrimaryColor || "#0b3a6e";
  const accent = settings.idCardAccentColor || "#14508f";
  const nameColor = "#c4121a";

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

  const fields = [
    { label: "પિતાનું નામ", value: father },
    { label: "સરનામું", value: formatAddress(student) },
    { label: "મો.નં.", value: formatMobile(student.mobileNumber) },
    { label: "જન્મ તા.", value: formatDob(student.dateOfBirth) },
    { label: "જી.આર.નં.", value: gu(student.grNumber), emphasis: true },
  ].filter((f) => f.value);

  return (
    <article
      className={cn("id-card print:break-inside-avoid", className)}
      style={
        {
          "--id-card-primary": primary,
          "--id-card-accent": accent,
          "--id-card-name": nameColor,
        } as React.CSSProperties
      }
      aria-label={fullName || "Student ID card"}
    >
      <header className="id-card__head">
        <div className="id-card__head-row">
          <div className="id-card__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crest} alt="" />
          </div>
          <div className="id-card__school">
            <p className="id-card__tagline">{tagline}</p>
            <p className="id-card__title">{schoolTitle}</p>
          </div>
        </div>
        <div className="id-card__meta">
          <span className="id-card__badge">ઉચ્ચ માધ્યમિક</span>
          <span className="id-card__location">{locationShort}</span>
        </div>
      </header>

      <div className="id-card__body">
        <div className="id-card__photo-row">
          <div className="id-card__photo">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={fullName} />
            ) : (
              <div className="id-card__photo-empty">Photo</div>
            )}
          </div>
          {classLabel ? (
            <div className="id-card__class">
              <span className="id-card__class-label">ધોરણ</span>
              <span className="id-card__class-value">{classLabel}</span>
            </div>
          ) : null}
        </div>

        <p className="id-card__name">{fullName || "—"}</p>

        <div className="id-card__fields">
          {fields.map((field) => (
            <div key={field.label} className="id-card__field">
              <span className="id-card__field-label">{field.label}</span>
              <span
                className={cn(
                  "id-card__field-value",
                  field.emphasis && "is-emphasis",
                )}
              >
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <footer className="id-card__foot">
        <div className="id-card__meta-chips">
          <div className="id-card__chip">
            <span className="id-card__chip-label">Year</span>
            <span className="id-card__chip-value">{gu(year) || year}</span>
          </div>
          <div className="id-card__chip">
            <span className="id-card__chip-label">Seat No.</span>
            <span className="id-card__chip-value">
              {/^\d+$/.test(seatNo) ? gu(seatNo) : seatNo}
            </span>
          </div>
        </div>

        <div className="id-card__sign">
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signatureUrl} alt="" />
          ) : (
            <svg viewBox="0 0 78 22" aria-hidden>
              <path
                d="M3,15 Q14,4 24,12 Q36,20 48,8 Q60,2 74,13"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span className="id-card__sign-text">આચાર્યની સહી</span>
        </div>
      </footer>
    </article>
  );
}
