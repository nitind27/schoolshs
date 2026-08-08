"use client";

import { useEffect, useState } from "react";

type LetterheadMeta = {
  schoolCode: string;
  schoolName: string;
  saved: boolean;
  message: string;
};

export default function LetterheadPage() {
  const [meta, setMeta] = useState<LetterheadMeta>({
    schoolCode: "",
    schoolName: "",
    saved: false,
    message: "Loading letterhead…",
  });

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "letterhead:loaded" || d.type === "letterhead:status") {
        setMeta((prev) => ({
          schoolCode: d.schoolCode || prev.schoolCode,
          schoolName: d.schoolName || prev.schoolName,
          saved: typeof d.saved === "boolean" ? d.saved : prev.saved,
          message: d.message || (d.type === "letterhead:loaded" ? "Ready" : prev.message),
        }));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="letterhead-page-shell fixed inset-x-0 bottom-0 top-14 z-30 flex min-h-0 flex-col bg-[#e6ebf2] lg:left-[var(--shell-sidebar-w)]">
      <div className="no-print flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Letterhead · school-wise (database)
          </p>
          <p className="truncate text-sm font-bold text-slate-900">
            {meta.schoolName || "School"}
            {meta.schoolCode ? (
              <span className="ml-2 font-mono text-xs font-semibold text-violet-700">
                {meta.schoolCode}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              meta.saved
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            {meta.saved ? "Saved in DB" : "Not saved yet — edit & Save"}
          </span>
          <span className="hidden text-slate-500 sm:inline">{meta.message}</span>
        </div>
      </div>
      <iframe
        title="Letterhead Editor"
        src="/shs/index.html?embed=1"
        className="block min-h-0 w-full flex-1 border-0 bg-[#e6ebf2]"
      />
    </div>
  );
}
