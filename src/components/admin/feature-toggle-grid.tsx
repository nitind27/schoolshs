"use client";

import { cn } from "@/lib/utils";
import {
  SCHOOL_FEATURES,
  PLAN_PRESETS,
  type SchoolFeatureKey,
} from "@/lib/school-features";
import { Check, Sparkles } from "lucide-react";

interface FeatureToggleGridProps {
  selected: SchoolFeatureKey[];
  onChange: (features: SchoolFeatureKey[]) => void;
  planName?: string;
  onPlanChange?: (plan: string) => void;
}

export function FeatureToggleGrid({
  selected,
  onChange,
  planName = "standard",
  onPlanChange,
}: FeatureToggleGridProps) {
  const groups = SCHOOL_FEATURES.reduce<Record<string, typeof SCHOOL_FEATURES>>((acc, f) => {
    if (!acc[f.group]) acc[f.group] = [];
    acc[f.group].push(f);
    return acc;
  }, {});

  const toggle = (key: SchoolFeatureKey) => {
    if (selected.includes(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  };

  const applyPlan = (plan: string) => {
    onPlanChange?.(plan);
    onChange([...PLAN_PRESETS[plan].features]);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-800 mb-2">Subscription Plan Presets</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(PLAN_PRESETS).map(([key, plan]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPlan(key)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                planName === key
                  ? "border-violet-500 bg-violet-50 ring-2 ring-violet-500/20"
                  : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className={cn("h-3.5 w-3.5", planName === key ? "text-violet-600" : "text-slate-400")} />
                <span className="text-sm font-bold text-slate-800">{plan.label}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{plan.priceHint}</p>
              <p className="text-[10px] text-violet-600 mt-1">{plan.features.length} panels</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Panel & Feature Access</p>
        <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2.5 py-1 rounded-full">
          {selected.length} enabled
        </span>
      </div>

      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((f) => {
              const on = selected.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggle(f.key)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all",
                    on
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{f.label}</span>
                    {f.description && (
                      <span className="block text-[11px] text-slate-500 mt-0.5">{f.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
