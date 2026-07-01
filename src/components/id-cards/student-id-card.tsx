"use client";

import type { Student, SchoolSettings } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

interface StudentIdCardProps {
  student: Student & { schoolClass?: { name: string; standard: string; section: string } | null };
  settings: SchoolSettings;
  photoUrl?: string;
  className?: string;
}

export function StudentIdCard({ student, settings, photoUrl, className }: StudentIdCardProps) {
  const t = useT();
  const primary = settings.idCardPrimaryColor || "#e91e8c";
  const accent = settings.idCardAccentColor || "#1e3a8a";
  const fullName = [student.firstName, student.middleName, student.surname].filter(Boolean).join(" ");
  const classLabel =
    student.schoolClass?.name ||
    (student.standard
      ? t("idCard.classPrefix", {
          standard: student.standard,
          section: student.section ? `-${student.section}` : "",
        })
      : student.courseName);

  const validDate = student.idCardValidUpto || `Mar ${settings.academicYear.split("-")[1] || "2026"}`;

  return (
    <div
      className={cn(
        "id-card relative w-[340px] h-[540px] rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:break-inside-avoid",
        className
      )}
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div
        className="relative h-[130px] px-4 pt-3 pb-2 text-white"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, ${primary} 100%)` }}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 border-2 border-white/40">
            <span className="text-xl font-black">🎓</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold leading-tight uppercase tracking-wide truncate">
              {settings.schoolName}
            </h2>
            {settings.tagline && (
              <p className="text-[10px] opacity-90 mt-0.5 truncate">{settings.tagline}</p>
            )}
            {settings.schoolAddress && (
              <p className="text-[9px] opacity-80 mt-1 line-clamp-2">{settings.schoolAddress}</p>
            )}
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${primary}, white, ${primary})` }}
        />
      </div>

      <div className="relative flex flex-col items-center -mt-6 px-4">
        <div
          className="w-[148px] h-[192px] rounded-lg overflow-hidden border-4 border-white shadow-lg bg-white"
          style={{ boxShadow: `0 8px 24px ${primary}40` }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={fullName}
              className="w-full h-full object-cover object-top"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs text-center p-2">
              {t("idCard.uploadPhoto")}
            </div>
          )}
        </div>
        <div
          className="mt-3 px-4 py-1 rounded-full text-white text-xs font-bold tracking-wider"
          style={{ background: primary }}
        >
          {t("idCard.studentIdCard")}
        </div>
      </div>

      <div className="px-5 pt-3 pb-4 space-y-2">
        <div className="text-center border-b pb-2" style={{ borderColor: `${primary}30` }}>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">{fullName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{student.aadhaarName}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <Detail label={t("idCard.class")} value={classLabel || "—"} highlight={primary} />
          <Detail label={t("idCard.rollNo")} value={student.rollNumber || "—"} />
          <Detail label={t("idCard.grNo")} value={student.grNumber || "—"} />
          <Detail label={t("fields.dob")} value={student.dateOfBirth} />
          <Detail label={t("idCard.bloodGrShort")} value={student.bloodGroup || "—"} />
          <Detail label={t("idCard.gender")} value={student.gender} />
          <Detail label={t("idCard.father")} value={student.fatherName} span={2} />
          <Detail label={t("fields.mobileNumber")} value={student.mobileNumber} span={2} />
          {student.childUid && (
            <Detail label={t("idCard.ssgUid")} value={student.childUid} span={2} mono />
          )}
        </div>

        <div
          className="mt-2 pt-2 border-t flex items-center justify-between text-[9px] text-slate-500"
          style={{ borderColor: `${primary}20` }}
        >
          <span>{t("idCard.academicYear", { year: settings.academicYear })}</span>
          <span>{t("idCard.validLabel", { date: validDate })}</span>
        </div>

        {settings.schoolPhone && (
          <p className="text-center text-[9px] text-slate-400">📞 {settings.schoolPhone}</p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: `linear-gradient(90deg, ${accent}, ${primary}, ${accent})` }} />
    </div>
  );
}

function Detail({
  label,
  value,
  span,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  span?: number;
  mono?: boolean;
  highlight?: string;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <span className="text-slate-400 block text-[9px] uppercase tracking-wide">{label}</span>
      <span
        className={cn("font-semibold text-slate-800 truncate block", mono && "font-mono text-[10px]")}
        style={highlight ? { color: highlight } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
