"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

interface StepWizardProps {
  steps: WizardStep[];
  current: number;
  onStepClick?: (index: number) => void;
}

export function StepWizard({ steps, current, onStepClick }: StepWizardProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              disabled={!onStepClick}
              className={cn(
                "flex items-center gap-2.5 min-w-0 text-left rounded-xl p-2 transition-colors",
                onStepClick && "hover:bg-violet-50 cursor-pointer",
                !onStepClick && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2",
                  done && "bg-emerald-500 border-emerald-500 text-white",
                  active && !done && "bg-violet-600 border-violet-600 text-white",
                  !active && !done && "bg-white border-slate-300 text-slate-400"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0 hidden md:block">
                <span className={cn("block text-sm font-semibold truncate", active ? "text-violet-900" : "text-slate-600")}>
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-[11px] text-slate-400 truncate">{step.description}</span>
                )}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn("hidden sm:block h-0.5 flex-1 mx-2 rounded", done ? "bg-emerald-400" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function formatINR(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function StatusBadge({ status, active }: { status?: string; active?: boolean }) {
  if (active !== undefined) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
        active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
      )}>
        <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-500")} />
        {active ? "Active" : "Inactive"}
      </span>
    );
  }
  const colors: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-slate-100 text-slate-600 border-slate-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border capitalize", colors[status || "pending"] || colors.pending)}>
      {status || "pending"}
    </span>
  );
}
