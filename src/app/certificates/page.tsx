"use client";

import Link from "next/link";
import { CERTIFICATE_TYPES } from "@/lib/certificates/config";
import { useT, useLocale } from "@/i18n/locale-provider";
import { FileText, ArrowRight, Eye, Printer, BookOpen } from "lucide-react";

const CERT_META: Record<string, {
  icon: string;
  gradient: string;
  border: string;
  iconBg: string;
  badge: string;
  badgeColor: string;
}> = {
  bonafide: {
    icon: "📜",
    gradient: "from-rose-50 to-pink-50",
    border: "border-rose-200",
    iconBg: "bg-rose-100",
    badge: "Portrait",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  lc: {
    icon: "📋",
    gradient: "from-blue-50 to-indigo-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    badge: "Portrait",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  character: {
    icon: "🏅",
    gradient: "from-amber-50 to-yellow-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    badge: "Landscape",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  "monthly-attendance": {
    icon: "📊",
    gradient: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    badge: "Portrait",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  "class-register": {
    icon: "📒",
    gradient: "from-violet-50 to-purple-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    badge: "Landscape",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  "monthly-reports": {
    icon: "📑",
    gradient: "from-sky-50 to-cyan-50",
    border: "border-sky-200",
    iconBg: "bg-sky-100",
    badge: "Portrait",
    badgeColor: "bg-sky-100 text-sky-700",
  },
};

export default function CertificatesHubPage() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page hero ──────────────────────────────── */}
      <div className="page-hero p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
              {t("certificates.title")}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{t("certificates.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* ── Certificate cards grid ─────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CERTIFICATE_TYPES.map((cert) => {
          const meta = CERT_META[cert.id] ?? {
            icon: "📄", gradient: "from-slate-50 to-gray-50", border: "border-slate-200",
            iconBg: "bg-slate-100", badge: "Print", badgeColor: "bg-slate-100 text-slate-600",
          };
          const label = locale === "gu" ? cert.labelGu : cert.labelEn;
          const desc  = t(`certificates.desc.${cert.id}`);

          return (
            <div
              key={cert.id}
              className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br ${meta.gradient} ${meta.border} overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
            >
              {/* Top accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />

              <div className="flex flex-col flex-1 p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl ${meta.iconBg} flex items-center justify-center text-xl shrink-0`}>
                    {meta.icon}
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2.5 py-1 ${meta.badgeColor} flex items-center gap-1`}>
                    <Printer className="h-3 w-3" />
                    {meta.badge}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-sm font-bold text-slate-800 leading-snug mb-1.5">{label}</h2>

                {/* Description */}
                <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-4">{desc}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/certificates/${cert.id}?preview=1`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors">
                      <Eye className="h-3.5 w-3.5" />
                      {t("certificates.preview")}
                    </button>
                  </Link>
                  <Link href={`/certificates/${cert.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors">
                      {t("certificates.open")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Print tip banner ───────────────────────── */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">{t("certificates.printTipTitle")}</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{t("certificates.printTip")}</p>
        </div>
      </div>

    </div>
  );
}
