"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { REPORTS_CERTS_MEGA_MENU } from "@/lib/nav-mega-menu";

export function NavbarMegaMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tn-mega-trigger inline-flex items-center"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="tn-mega-icon">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        <span className="hidden sm:inline">{t("megaMenu.trigger")}</span>
        <span className="sm:hidden">{t("megaMenu.triggerShort")}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <div
            className={cn(
              "fixed inset-x-0 top-[3.5rem] z-50 border-b border-slate-200 bg-white shadow-xl",
              "max-h-[calc(100vh-3.5rem)] overflow-y-auto lg:hidden",
            )}
          >
            <MegaPanel onNavigate={() => setOpen(false)} />
          </div>

          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-2.5 hidden lg:block",
              "w-[min(920px,calc(100vw-var(--shell-sidebar-w,260px)-2rem))]",
            )}
          >
            <div className="tn-mega-panel overflow-hidden rounded-2xl">
              <MegaPanel onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MegaPanel({ onNavigate }: { onNavigate: () => void }) {
  const t = useT();

  return (
    <div>
      <div className="tn-mega-head flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-white">
            {t("megaMenu.panelTitle")}
          </p>
          <p className="mt-0.5 text-xs text-white/65">{t("megaMenu.panelSubtitle")}</p>
        </div>
        <Link
          href="/certificates"
          onClick={onNavigate}
          className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20 sm:inline-flex"
        >
          {t("megaMenu.viewAll")}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS_CERTS_MEGA_MENU.map((col, colIdx) => {
          const ColIcon = col.icon;
          return (
            <div
              key={col.id}
              className={cn(
                "border-b border-slate-100 p-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
                colIdx % 2 === 1 && "bg-slate-50/50",
              )}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    col.accent,
                  )}
                >
                  <ColIcon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {t(col.titleKey)}
                </p>
              </div>
              <ul className="space-y-0.5">
                {col.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onNavigate}
                        className="tn-mega-link group flex items-start gap-2.5 rounded-lg px-2 py-2"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 group-hover:text-teal-700">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium text-slate-800 group-hover:text-slate-950">
                            {t(link.labelKey)}
                          </span>
                          {link.descKey && (
                            <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">
                              {t(link.descKey)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
