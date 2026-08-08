"use client";

import { cn } from "@/lib/utils";
import {
  MODULE_FORMAT_KEYS,
  MODULE_FORMAT_OPTIONS,
  type ModuleFormatKey,
  type ModuleFormatMap,
  type SchoolFeatureKey,
} from "@/lib/school-features";
import { CERTIFICATE_PACKS } from "@/lib/certificates/packs-registry";

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

interface ModuleFormatPickerProps {
  formats: ModuleFormatMap;
  onChange: (formats: ModuleFormatMap) => void;
  /** Only show format pickers for modules that are enabled */
  enabledFeatures?: SchoolFeatureKey[];
  /** Prefer matching school code pack when selecting certificates */
  schoolCode?: string;
}

export function ModuleFormatPicker({
  formats,
  onChange,
  enabledFeatures,
  schoolCode,
}: ModuleFormatPickerProps) {
  const keys = MODULE_FORMAT_KEYS.filter((key) => {
    if (!enabledFeatures) return true;
    return enabledFeatures.includes(FEATURE_FOR_FORMAT[key]);
  });

  if (!keys.length) {
    return (
      <p className="text-sm text-slate-500">
        Enable Certificates, ID Cards, Results, or Board Exam Results above to choose formats.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-800">Module formats</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Certificate packs school-code folders se aate hain. Jo pack yahan select karoge, wahi school me
          print hoga.
        </p>
      </div>

      {keys.includes("certificates") ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {FORMAT_LABELS.certificates}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CERTIFICATE_PACKS.map((pack) => {
              const selected = formats.certificates === pack.id;
              const codeMatch =
                schoolCode && pack.schoolCode && schoolCode === pack.schoolCode;
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
                        This school
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] font-mono text-violet-700 mt-1">{pack.id}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{pack.description}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    packs/{pack.folder}/ · {pack.certificateTypes.length} types
                  </p>
                </button>
              );
            })}
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
