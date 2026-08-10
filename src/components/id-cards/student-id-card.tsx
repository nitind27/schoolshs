"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { studentDisplayFatherName, studentFullNameGu } from "@/lib/student-names";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";
import { buildPublicStudentIdScanUrl } from "@/lib/id-card-public-url";
import "./student-id-card.css";

interface StudentIdCardProps {
  student: Student & {
    schoolClass?: { name: string; standard: string; section: string; academicYear?: string } | null;
  };
  settings: SchoolSettings;
  photoUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  diseCode?: string | null;
  academicYear?: string | null;
  website?: string | null;
  className?: string;
}

/** Vertical school ID — matches reference mockup */
export const ID_CARD_WIDTH_IN = 2.76;
export const ID_CARD_HEIGHT_IN = 3.62;
export const ID_CARD_WIDTH_MM = 70;
export const ID_CARD_HEIGHT_MM = 92;

function formatMobile(v?: string | null) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return (v || "").trim();
}

function formatSchoolPhone(v?: string | null) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) return `${d.slice(0, 5)}-${d.slice(5)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return raw;
}

/** Footer display host from school website setting */
function resolveWebsite(raw?: string | null) {
  const cleaned = String(raw || "").trim();
  if (!cleaned) return { display: "" };
  const display = cleaned.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return { display };
}

function formatDob(v?: string | null) {
  if (!v) return "";
  return v.replace(/-/g, "/");
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

function sectionLabel(standard?: string | null): string {
  const s = parseInt(String(standard || "0"), 10);
  if (s >= 11) return "ઉચ્ચ માધ્યમિક વિભાગ";
  if (s >= 9) return "માધ્યમિક વિભાગ";
  if (s >= 6) return "ઉચ્ચ પ્રાથમિક વિભાગ";
  return "પ્રાથમિક વિભાગ";
}

function IdCardQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let alive = true;
    const text = value.trim() || "ID";
    QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
      color: { dark: "#0b2b63", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc("");
      });
    return () => {
      alive = false;
    };
  }, [value]);

  if (!src) {
    return <div className="id-card__qr id-card__qr--empty" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="id-card__qr" src={src} alt="" />
  );
}

type FieldIcon = "user" | "pin" | "phone" | "calendar" | "id";

function FieldIcon({ type }: { type: FieldIcon }) {
  if (type === "pin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "phone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8.2 4.8c.4-.4 1-.5 1.5-.3l2 1c.5.2.8.7.7 1.2l-.4 2.1c-.1.4.1.8.4 1.1l2.2 2.2c.3.3.7.5 1.1.4l2.1-.4c.5-.1 1 .2 1.2.7l1 2c.2.5.1 1.1-.3 1.5l-1.1 1.1c-.5.5-1.2.7-1.9.6-3.3-.5-6.4-2.7-8.8-5.1S4.9 9.3 4.4 6c-.1-.7.1-1.4.6-1.9l1.2-1.3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "id") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
        <path d="M13.5 10.5h4.5M13.5 13.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 19c1.8-3.2 4-4.8 7-4.8S17.2 15.8 19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StudentIdCard({
  student,
  settings,
  photoUrl,
  logoUrl = SCHOOL_LOGO_URL,
  signatureUrl,
  diseCode,
  academicYear,
  website,
  className,
}: StudentIdCardProps) {
  const crest = logoUrl || SCHOOL_LOGO_URL;
  const waveGradId = `idWaveNavy-${useId().replace(/:/g, "")}`;
  const [pageOrigin, setPageOrigin] = useState("");

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

  const fullName =
    studentFullNameGu(student) ||
    [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");

  const father = studentDisplayFatherName(student) || student.fatherName || "";

  const classLabel =
    student.standard && student.section
      ? `${student.standard}/${student.section}`
      : student.schoolClass
        ? `${student.schoolClass.standard}/${student.schoolClass.section}`
        : student.standard || "";

  const rollNo = String(student.rollNumber || "").trim();
  const year =
    academicYear ||
    student.schoolClass?.academicYear ||
    student.financialYear ||
    settings.academicYear ||
    "2025-26";

  const tagline = settings.tagline?.trim() || "સાર્વજનિક એજ્યુકેશન સંચાલિત";
  const schoolTitle = /[\u0A80-\u0AFF]/.test(settings.schoolName || "")
    ? settings.schoolName!
    : "સાર્વજનિક હાઈસ્કૂલ";

  const locationShort =
    settings.schoolAddress?.trim() || "Fort Songadh, Songadh, Tapi, Gujarat, 394670";
  const schoolPhone = formatSchoolPhone(settings.schoolPhone);
  const dise = String(diseCode || "").replace(/\D/g, "") || String(diseCode || "").trim();
  const { display: siteDisplay } = resolveWebsite(website || settings.idCardWebsite);
  const idNumber = String(student.grNumber || "").trim();

  const qrPayload = useMemo(() => {
    const scanUrl = buildPublicStudentIdScanUrl(
      website || settings.idCardWebsite,
      student.id,
      pageOrigin,
    );
    if (scanUrl) return scanUrl;
    return [
      schoolTitle,
      fullName && `Name:${fullName}`,
      idNumber && `GR:${idNumber}`,
      classLabel && `Class:${classLabel}`,
    ]
      .filter(Boolean)
      .join("|");
  }, [
    website,
    settings.idCardWebsite,
    student.id,
    pageOrigin,
    schoolTitle,
    fullName,
    idNumber,
    classLabel,
  ]);

  const fields: { label: string; value: string; icon: FieldIcon; multiline?: boolean }[] = [
    { label: "રોલ નંબર", value: rollNo, icon: "user" as const },
    { label: "પિતાનું નામ", value: father, icon: "user" as const },
    { label: "સરનામું", value: formatAddress(student), icon: "pin" as const, multiline: true },
    { label: "મો. નં.", value: formatMobile(student.mobileNumber), icon: "phone" as const },
    { label: "જન્મ તારીખ", value: formatDob(student.dateOfBirth), icon: "calendar" as const },
    { label: "ID નંબર", value: idNumber, icon: "id" as const },
  ].filter((f) => f.value);

  return (
    <article
      className={cn("id-card print:break-inside-avoid", className)}
      aria-label={fullName || "Student ID card"}
    >
      <header className="id-card__head">
        <div className="id-card__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={crest} alt="" />
        </div>

        <div className="id-card__school">
          <p className="id-card__kicker">{tagline}</p>
          <h1 className="id-card__school-name">{schoolTitle}</h1>
          <p className="id-card__addr">{locationShort}</p>
        </div>

        <div className="id-card__badge" aria-hidden>
          <span>STUDENT</span>
          <strong>ID</strong>
        </div>
      </header>

      <div className="id-card__band">
        <span className="id-card__band-sec">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="2" />
            <path d="M5 18.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {sectionLabel(student.standard)}
        </span>
        {dise ? <span className="id-card__band-udise">UDISE CODE : {dise}</span> : null}
      </div>

      <div className="id-card__body">
        <div className="id-card__watermark" aria-hidden />

        <div className="id-card__col-photo">
          <div className="id-card__photo">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={fullName} />
            ) : (
              <div className="id-card__photo-fallback" aria-hidden>
                <svg viewBox="0 0 80 96" fill="none">
                  <rect width="80" height="96" fill="#0b2a5b" />
                  <circle cx="40" cy="34" r="16" fill="#1e4d8c" />
                  <path d="M12 90c4-22 16-32 28-32s24 10 28 32" fill="#1e4d8c" />
                </svg>
              </div>
            )}
          </div>

          {/* Year above QR (stacked under photo) */}
          <div className="id-card__meta-stack">
            <div className="id-card__year">
              <span>Academic Year</span>
              <strong>{year}</strong>
            </div>
            <IdCardQr value={qrPayload} />
          </div>
        </div>

        <div className="id-card__col-info">
          <h2 className="id-card__name">{fullName || "—"}</h2>

          {classLabel ? (
            <div className="id-card__class">
              ધોરણ: <strong>{classLabel}</strong>
            </div>
          ) : null}

          <dl className="id-card__fields">
            {fields.map((f) => (
              <div key={f.label} className={cn("id-card__field", f.multiline && "is-multi")}>
                <span className="id-card__icon">
                  <FieldIcon type={f.icon} />
                </span>
                <div className="id-card__field-body">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <footer className="id-card__foot">
        {/*
          Wave layers (bottom → top):
          1) navy fill
          2) soft cyan depth under crest
          3) gold stroke ON TOP of blue (reference look)
        */}
        <svg className="id-card__wave" viewBox="0 0 700 120" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={waveGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d3a7a" />
              <stop offset="100%" stopColor="#071d45" />
            </linearGradient>
          </defs>

          {/* 1. Main navy wave body */}
          <path
            className="id-card__wave-navy"
            fill={`url(#${waveGradId})`}
            d="M0,38
               C70,58 130,68 200,58
               C270,48 320,28 380,34
               C440,40 500,62 570,54
               C630,48 670,32 700,36
               L700,120 L0,120 Z"
          />

          {/* 2. Light-blue depth stripe (under gold, above navy fill) */}
          <path
            className="id-card__wave-cyan"
            d="M0,38
               C70,58 130,68 200,58
               C270,48 320,28 380,34
               C440,40 500,62 570,54
               C630,48 670,32 700,36
               L700,48
               C670,44 630,56 570,62
               C500,70 440,50 380,44
               C320,38 270,56 200,66
               C130,76 70,66 0,50
               Z"
          />

          {/* 3. Gold border line ON TOP of blue — same crest path */}
          <path
            className="id-card__wave-gold"
            fill="none"
            stroke="#e4aa22"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M0,38
               C70,58 130,68 200,58
               C270,48 320,28 380,34
               C440,40 500,62 570,54
               C630,48 670,32 700,36"
          />
        </svg>

        <div className="id-card__foot-row">
          <div className="id-card__sign">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="" />
            ) : (
              <span className="id-card__sign-script">Principal</span>
            )}
            <p>PRINCIPAL</p>
          </div>

          <div className="id-card__crest">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crest} alt="" />
          </div>

          <div className="id-card__values">
            <div>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>DISCIPLINE</span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>EDUCATION</span>
            </div>
            <div>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.8 6.6 19.5l1.3-5.9L3.4 9.6l6-.6L12 3.5Z" />
              </svg>
              <span>EXCELLENCE</span>
            </div>
          </div>
        </div>

        {(siteDisplay || schoolPhone) && (
          <div className="id-card__contact">
            {siteDisplay ? <span>{siteDisplay}</span> : null}
            {siteDisplay && schoolPhone ? (
              <span className="id-card__contact-sep" aria-hidden="true">
                |
              </span>
            ) : null}
            {schoolPhone ? <span>Ph.: {schoolPhone}</span> : null}
          </div>
        )}
      </footer>
    </article>
  );
}
