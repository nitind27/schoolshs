"use client";

import { useEffect, useMemo, useState } from "react";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { cn } from "@/lib/utils";
import { buildPublicExamIdScanUrl } from "@/lib/id-card-public-url";
import QRCode from "qrcode";
import "./exam-staff-id-card.css";

export type ExamStaffCardPerson = {
  id: string;
  firstName: string;
  lastName: string;
  firstNameGu?: string | null;
  lastNameGu?: string | null;
  employeeId?: string | null;
  designation: string;
  department?: string | null;
  mobileNumber: string;
  photoPath?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  qualification?: string | null;
};

export type ExamStaffCardSchool = {
  name: string;
  address?: string | null;
  district?: string | null;
  phone?: string | null;
  principalName?: string | null;
  code?: string | null;
} | null;

export type ExamStaffCardMeta = {
  examTitle: string;
  examSession?: string;
  validFrom?: string;
  validTo?: string;
  roleLabel?: string;
  academicYear?: string;
};

/** ISO ID-1 landscape (CR-80) — exam duty badge */
export const EXAM_CARD_W_MM = 85.6;
export const EXAM_CARD_H_MM = 54;

function staffName(s: ExamStaffCardPerson, preferGu = false) {
  if (preferGu && (s.firstNameGu || s.lastNameGu)) {
    return [s.firstNameGu, s.lastNameGu].filter(Boolean).join(" ");
  }
  return [s.firstName, s.lastName].filter(Boolean).join(" ");
}

function formatMobile(v?: string | null) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return v || "—";
}

function ExamQr({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    const text = value.trim();
    if (!text) {
      setSrc("");
      return;
    }
    QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
      color: { dark: "#123a5c", light: "#ffffff" },
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

  if (!src) return <div className="exam-id-card__qr exam-id-card__qr--empty" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="exam-id-card__qr" src={src} alt="" />;
}

export function ExamStaffIdCard({
  staff,
  school,
  settings,
  meta,
  photoUrl,
  logoUrl = SCHOOL_LOGO_URL,
  signatureUrl,
  website,
  className,
}: {
  staff: ExamStaffCardPerson;
  school?: ExamStaffCardSchool;
  settings?: {
    schoolName?: string | null;
    schoolAddress?: string | null;
    schoolPhone?: string | null;
    tagline?: string | null;
    academicYear?: string | null;
    idCardWebsite?: string | null;
  } | null;
  meta: ExamStaffCardMeta;
  photoUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  website?: string | null;
  className?: string;
}) {
  const schoolName = settings?.schoolName || school?.name || "School";
  const address =
    settings?.schoolAddress ||
    [school?.address, school?.district].filter(Boolean).join(", ") ||
    "";
  const phone = settings?.schoolPhone || school?.phone || "";
  const name = staffName(staff);
  const nameGu = staffName(staff, true);
  const role = meta.roleLabel || "EXAMINER / INVIGILATOR";
  const year = meta.academicYear || settings?.academicYear || "2025-26";
  const [pageOrigin, setPageOrigin] = useState("");

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

  const qrPayload = useMemo(
    () =>
      buildPublicExamIdScanUrl(
        website || settings?.idCardWebsite,
        staff.id,
        {
          examTitle: meta.examTitle,
          examSession: meta.examSession,
          academicYear: year,
          roleLabel: role,
        },
        pageOrigin,
      ),
    [
      website,
      settings?.idCardWebsite,
      staff.id,
      meta.examTitle,
      meta.examSession,
      year,
      role,
      pageOrigin,
    ],
  );

  return (
    <article
      className={cn("exam-id-card", className)}
      aria-label={`Exam ID — ${name}`}
    >
      <div className="exam-id-card__stripe" aria-hidden />
      <div className="exam-id-card__inner">
        <header className="exam-id-card__head">
          <div className="exam-id-card__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl || SCHOOL_LOGO_URL} alt="" />
          </div>
          <div className="exam-id-card__school">
            <p className="exam-id-card__kicker">
              {settings?.tagline?.trim() || "Examination Cell"}
            </p>
            <h1 className="exam-id-card__school-name">{schoolName}</h1>
            {(address || phone) && (
              <p className="exam-id-card__meta-line">
                {[address, phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="exam-id-card__badge">
            <span>EXAM</span>
            <strong>ID</strong>
          </div>
        </header>

        <div className="exam-id-card__title-bar">{role}</div>

        <div className="exam-id-card__body">
          <div className="exam-id-card__photo">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={name} />
            ) : (
              <div className="exam-id-card__photo-fallback">
                {(name.charAt(0) || "?").toUpperCase()}
              </div>
            )}
          </div>

          <div className="exam-id-card__info">
            <p className="exam-id-card__name">{name}</p>
            {nameGu && nameGu !== name ? (
              <p className="exam-id-card__name-gu">{nameGu}</p>
            ) : null}
            <dl className="exam-id-card__fields">
              <div>
                <dt>Designation</dt>
                <dd>{staff.designation || "—"}</dd>
              </div>
              <div>
                <dt>Emp. ID</dt>
                <dd>{staff.employeeId || "—"}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{staff.department || "—"}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{formatMobile(staff.mobileNumber)}</dd>
              </div>
            </dl>
          </div>

          <div className="exam-id-card__qr-wrap">
            <ExamQr value={qrPayload} />
            <span>Scan ID</span>
          </div>
        </div>

        <div className="exam-id-card__exam">
          <div>
            <span>Examination</span>
            <strong>{meta.examTitle || "School Examination"}</strong>
            {meta.examSession ? <em>{meta.examSession}</em> : null}
          </div>
          <div>
            <span>Academic Year</span>
            <strong>{year}</strong>
          </div>
          {(meta.validFrom || meta.validTo) && (
            <div>
              <span>Valid</span>
              <strong>
                {[meta.validFrom, meta.validTo].filter(Boolean).join(" → ")}
              </strong>
            </div>
          )}
        </div>

        <footer className="exam-id-card__foot">
          <div className="exam-id-card__sign">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="" className="exam-id-card__sign-img" />
            ) : (
              <span className="exam-id-card__sign-line" />
            )}
            <p>Principal</p>
          </div>
          <p className="exam-id-card__note">
            For examination duty only · Return after exam
          </p>
        </footer>
      </div>
    </article>
  );
}
