"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/i18n/locale-provider";
import { THEME_PACKS, type ThemeId } from "@/lib/themes";
import { applySchoolTheme } from "@/components/theme/school-theme";
import { cn } from "@/lib/utils";

export default function ThemeSettingsPage() {
  const t = useT();
  const [current, setCurrent] = useState<ThemeId>("forest");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState<ThemeId | null>(null);
  const [note, setNote] = useState("");
  const canSave = role === "school_admin" || role === "supervisor";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(String(d?.user?.role || "")))
      .catch(() => {});
    fetch("/api/school/theme")
      .then((r) => r.json())
      .then((d) => {
        if (d?.themeId) setCurrent(d.themeId);
      })
      .catch(() => {});
  }, []);

  const choose = async (id: ThemeId) => {
    if (!canSave || saving) return;
    const previous = current;
    setCurrent(id);
    applySchoolTheme(id);
    setSaving(id);
    setNote("");
    try {
      const res = await fetch("/api/school/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: id }),
      });
      if (!res.ok) {
        setCurrent(previous);
        applySchoolTheme(previous);
        setNote((await res.json()).error || t("theme.failed"));
      } else {
        setNote(t("theme.saved"));
      }
    } catch {
      setCurrent(previous);
      applySchoolTheme(previous);
      setNote(t("theme.failed"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <PageShell
      title={t("theme.title")}
      subtitle={t("theme.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("theme.title") },
      ]}
    >
      {!canSave && role && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          {t("theme.adminOnly")}
        </p>
      )}
      {note && <p className="text-sm font-medium text-slate-700">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {THEME_PACKS.map((theme) => {
          const selected = current === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={!canSave || saving !== null}
              onClick={() => choose(theme.id)}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition",
                selected ? "" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md",
                !canSave && "cursor-default",
              )}
              style={
                selected
                  ? { borderColor: theme.brand600, boxShadow: `0 0 0 2px ${theme.brand600}` }
                  : undefined
              }
            >
              <div className="flex h-28">
                <div className="flex w-16 flex-col gap-1.5 p-2" style={{ background: `linear-gradient(180deg, ${theme.sidebar}, ${theme.sidebar2})` }}>
                  <span className="h-2 w-8 rounded-full" style={{ background: theme.active }} />
                  <span className="h-1.5 w-10 rounded-full bg-white/25" />
                  <span className="h-1.5 w-7 rounded-full bg-white/15" />
                  <span className="h-1.5 w-9 rounded-full bg-white/15" />
                </div>
                <div className="flex flex-1 flex-col justify-between p-3" style={{ background: `linear-gradient(160deg, #fff, ${theme.wash})` }}>
                  <div>
                    <div className="h-2 w-16 rounded-full bg-slate-200" />
                    <div className="mt-2 h-1.5 w-24 rounded-full bg-slate-100" />
                  </div>
                  <span className="inline-flex h-6 w-16 items-center justify-center rounded-md text-[10px] font-semibold text-white" style={{ background: theme.brand600 }}>
                    Save
                  </span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 px-3 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{theme.name}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{theme.blurb}</p>
                </div>
                {selected && (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: theme.brand600 }}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 px-3 pb-3">
                {[theme.sidebar, theme.brand600, theme.wash].map((color) => (
                  <span key={color} className="h-4 w-4 rounded-full border border-black/10" style={{ background: color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
