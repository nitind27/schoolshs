"use client";

import { cn } from "@/lib/utils";
import type { AdmissionCompleteness } from "@/lib/admissions";

const LEVEL_COLORS = {
  complete: { stroke: "#10b981", text: "text-emerald-700", bg: "bg-emerald-50" },
  partial: { stroke: "#f59e0b", text: "text-amber-700", bg: "bg-amber-50" },
  incomplete: { stroke: "#ef4444", text: "text-red-700", bg: "bg-red-50" },
};

export function ProgressRing({ percent, level }: { percent: number; level: AdmissionCompleteness["level"] }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = LEVEL_COLORS[level].stroke;

  return (
    <svg className="adm-progress-ring" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" className="fill-slate-600" style={{ fontSize: "9px", fontWeight: 700 }}>
        {percent}
      </text>
    </svg>
  );
}

export function StudentAvatar({ name, standard }: { name: string; standard?: string | null }) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const hues = ["from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];
  const idx = (standard ? parseInt(standard, 10) : name.charCodeAt(0)) % hues.length;

  return (
    <div className={cn("adm-avatar bg-gradient-to-br text-white shadow-sm", hues[idx])}>
      {initial}
    </div>
  );
}
