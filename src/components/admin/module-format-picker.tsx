"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MODULE_FORMAT_KEYS,
  MODULE_FORMAT_OPTIONS,
  type ModuleFormatKey,
  type ModuleFormatMap,
  type SchoolFeatureKey,
} from "@/lib/school-features";
import {
  CERTIFICATE_PACKS,
  getCertificatePack,
  isKnownCertificatePackId,
} from "@/lib/certificates/packs-registry";
import { CERTIFICATE_TYPES } from "@/lib/certificates/config";
import { CheckCircle2, LayoutGrid, ScrollText } from "lucide-react";

const FORMAT_LABELS: Record<ModuleFormatKey, string> = {
  certificates: "Certificate format pack",
  id_cards: "ID card format",
  results: "Result / report card format",
  board_records: "Board exam result format",
};

const FEATURE_FOR_FORMAT: Record<ModuleFormatKey, SchoolFeatureKey> = {
  certificates: "certificates",
  id_cards: "id_cards",
  results: "results",
  board_records: "board_records",
};

const HUB_COLUMNS: {
  id: string;
  title: string;
  feature: SchoolFeatureKey;
  items: string[];
}[] = [
  {
    id: "certificates",
    title: "CERTIFICATES",
    feature: "certificates",
    items: [
      "Bonafide",
      "Leaving certificate (LC)",
      "Character / Trial",
      "General register (GR)",
      "Class register",
      "Monthly attendance patrak",
      "Daily attendance book",
      "Monthly scholarship reports",
    ],
  },
  {
    id: "board",
    title: "BOARD — VIEW & PRINT",
    feature: "board_records",
    items: ["Result list register", "Exam result sheet", "Overall analysis"],
  },
  {
    id: "staff",
    title: "STAFF REPORTS",
    feature: "staff",
    items: [
      "Annual salary statement",
      "Employee salary slip",
      "Salary ledger",
      "Income tax form",
      "Staff service register",
      "Staff attendance",
    ],
  },
  {
    id: "school",
    title: "SCHOOL REPORTS",
    feature: "scholarship_export",
    items: ["Student attendance reports", "Accounting reports", "ID cards", "Exam ID cards", "Exam results"],
  },
];

const LC_NOTE: Record<string, string> = {
  default: "Secondary / shared LC layout",
  "24261004405": "Songadh secondary LC",
  "24261004403": "Upper Primary LC (scan format)",
  "24261004404": "Upper Primary LC (scan format)",
};

interface ModuleFormatPickerProps {
  formats: ModuleFormatMap;
  onChange: (formats: ModuleFormatMap) => void;
  enabledFeatures?: SchoolFeatureKey[];
  schoolCode?: string;
  /** When true, auto-select pack matching school code once */
  autoBindSchoolCode?: boolean;
}

export function ModuleFormatPicker({
  formats,
  onChange,
  enabledFeatures,
  schoolCode,
  autoBindSchoolCode = true,
}: ModuleFormatPickerProps) {
  const code = (schoolCode || "").trim();

  // Auto-bind certificate + id_cards pack when school code matches a registered pack
  useEffect(() => {
    if (!autoBindSchoolCode || !code || !isKnownCertificatePackId(code)) return;
    const next = { ...formats };
    let changed = false;
    if (formats.certificates === "default") {
      next.certificates = code;
      changed = true;
    }
    if (
      MODULE_FORMAT_OPTIONS.id_cards.some((o) => o.id === code) &&
      formats.id_cards === "default"
    ) {
      next.id_cards = code;
      changed = true;
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind when school code changes
  }, [code, autoBindSchoolCode]);

  const keys = MODULE_FORMAT_KEYS.filter((key) => {
    if (!enabledFeatures) return true;
    return enabledFeatures.includes(FEATURE_FOR_FORMAT[key]);
  });

  const selectedPack = getCertificatePack(formats.certificates);
  const matchingPack = CERTIFICATE_PACKS.find((p) => p.schoolCode === code);

  const hubPreview = useMemo(() => {
    return HUB_COLUMNS.map((col) => {
      if (!enabledFeatures) return { ...col, on: true };
      if (col.id === "school") {
        const on =
          enabledFeatures.includes("scholarship_export") ||
          enabledFeatures.includes("id_cards") ||
          enabledFeatures.includes("results") ||
          enabledFeatures.includes("attendance") ||
          enabledFeatures.includes("accounting");
        return { ...col, on };
      }
      return { ...col, on: enabledFeatures.includes(col.feature) };
    });
  }, [enabledFeatures]);

  if (!keys.length && enabledFeatures) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Upar Certificates / ID Cards / Results / Board modules ON karo — phir yahan us school ka format
        pack choose hoga. Jo ON nahi, hub me dikhega hi nahi.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-violet-600" />
          Module formats (per school)
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          School register pe jo pack / module doge,{" "}
          <strong className="font-semibold text-slate-700">sirf wahi</strong> us school ke portal me
          dikhega. Naya certificate format code karke register karoge — jab tak Super Admin us pack
          ko school ko assign nahi karega, dusre schools pe nahi dikhega.
        </p>
      </div>

      {matchingPack ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 flex gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            School code <span className="font-mono font-semibold">{code}</span> ke liye pack{" "}
            <span className="font-semibold">{matchingPack.label}</span> ready hai
            {formats.certificates === matchingPack.id
              ? " — abhi select hai."
              : ". Neeche select karo taaki isi school pe ye format chale."}
          </div>
        </div>
      ) : null}

      {/* Hub visibility preview */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5" />
          Is school ke hub me kya dikhega
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {hubPreview.map((col) => (
              <div
                key={col.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  col.on
                    ? "border-emerald-200 bg-white"
                    : "border-slate-200 bg-slate-100/80 opacity-60",
                )}
              >
                <p className="text-[11px] font-bold text-slate-800">{col.title}</p>
                <p className="text-[10px] mt-0.5 mb-1.5">
                  {col.on ? (
                    <span className="text-emerald-700 font-semibold">ON — school me dikhega</span>
                  ) : (
                    <span className="text-slate-500">OFF — hide</span>
                  )}
                </p>
                <ul className="space-y-0.5">
                  {col.items.slice(0, col.id === "certificates" ? 8 : 4).map((item) => (
                    <li key={item} className="text-[10px] text-slate-600 truncate">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>

      {keys.includes("certificates") ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {FORMAT_LABELS.certificates}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CERTIFICATE_PACKS.map((pack) => {
              const selected = formats.certificates === pack.id;
              const codeMatch = code && pack.schoolCode && code === pack.schoolCode;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => onChange({ ...formats, certificates: pack.id })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-500/20"
                      : "border-slate-200 bg-white hover:border-violet-300",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{pack.label}</span>
                    {codeMatch ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        This school code
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] font-mono text-violet-700 mt-1">{pack.id}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{pack.description}</p>
                  <p className="text-[10px] text-violet-800 mt-2 font-medium">
                    LC: {LC_NOTE[pack.id] || "Leaving Certificate"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    packs/{pack.folder}/ · {pack.certificateTypes.length} reports
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-violet-900 mb-1.5">
              Selected pack reports ({selectedPack.label})
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {CERTIFICATE_TYPES.filter((t) => selectedPack.certificateTypes.includes(t.id)).map(
                (t) => (
                  <li key={t.id} className="text-[11px] text-slate-700 flex gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-600 shrink-0 mt-0.5" />
                    <span>
                      {t.labelEn}
                      {t.id === "lc" ? (
                        <span className="text-violet-700">
                          {" "}
                          — {LC_NOTE[selectedPack.id] || "LC"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {keys
          .filter((k) => k !== "certificates")
          .map((key) => (
            <label
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {FORMAT_LABELS[key]}
              </span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={formats[key]}
                onChange={(e) => onChange({ ...formats, [key]: e.target.value })}
              >
                {MODULE_FORMAT_OPTIONS[key].map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                {MODULE_FORMAT_OPTIONS[key].find((o) => o.id === formats[key])?.description}
              </p>
            </label>
          ))}
      </div>
    </div>
  );
}
