"use client";

import { MonitorSmartphone, MapPin, ShieldAlert, LogOut, Layers } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export type DeviceSessionRow = {
  id: string;
  deviceLabel: string;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  createdAt: string;
  lastSeenAt: string;
};

function place(s: DeviceSessionRow) {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return s.ip || "—";
}

function when(iso: string, t: (k: string, p?: Record<string, string | number>) => string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return t("login.deviceJustNow");
  if (mins < 60) return t("login.deviceMinsAgo", { n: mins });
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return t("login.deviceHoursAgo", { n: hrs });
  return d.toLocaleString();
}

export function DeviceSessionModal({
  sessions,
  userName,
  busy,
  onKeepAll,
  onLogoutOthers,
  onCancel,
}: {
  sessions: DeviceSessionRow[];
  userName: string;
  busy?: boolean;
  onKeepAll: () => void;
  onLogoutOthers: () => void;
  onCancel: () => void;
}) {
  const t = useT();

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] cursor-pointer"
        aria-label={t("common.cancel")}
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
              <ShieldAlert className="h-5 w-5 text-sky-200" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">
                {t("login.deviceModalEyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-bold leading-tight">{t("login.deviceModalTitle")}</h2>
              <p className="mt-1 text-sm text-sky-100/85 leading-snug">
                {t("login.deviceModalHello", { name: userName })}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">{t("login.deviceModalBody")}</p>

          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-start gap-3 px-3 py-2.5 bg-slate-50/80">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <MonitorSmartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.deviceLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{place(s)}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t("login.deviceLastActive")}: {when(s.lastSeenAt, t)}
                    {s.ip ? ` · ${s.ip}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={onKeepAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60 cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              {t("login.deviceKeepAll")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onLogoutOthers}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {t("login.deviceLogoutOthers")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
            >
              {t("login.deviceCancel")}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-snug pb-1">{t("login.deviceModalHint")}</p>
        </div>
      </div>
    </div>
  );
}
