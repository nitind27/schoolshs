"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import { LOCALES, type Locale } from "@/i18n/types";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "sidebar" | "login" | "compact" | "hero";
  className?: string;
}

export function LanguageSwitcher({ variant = "sidebar", className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  const isSidebar = variant === "sidebar";
  const isHero = variant === "hero";
  const hideLabel = variant === "compact" || isHero;

  return (
    <div className={cn("space-y-1.5", className)}>
      {!hideLabel && (
        <p
          className={cn(
            "text-xs font-medium flex items-center gap-1.5",
            isSidebar ? "text-blue-200 px-1" : "text-slate-500"
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          {t("lang.language")}
        </p>
      )}
      <div
        className={cn(
          "flex gap-0.5",
          isHero
            ? "rounded-full bg-white/10 backdrop-blur-sm border border-white/20 p-1 shadow-lg shadow-black/10"
            : isSidebar
              ? "rounded-lg bg-white/10 p-0.5 gap-0.5"
              : "rounded-lg bg-slate-100 border border-slate-200 p-0.5 gap-0.5"
        )}
        role="group"
        aria-label={t("lang.language")}
      >
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code as Locale)}
            className={cn(
              "flex-1 font-semibold transition-all duration-200",
              isHero
                ? "px-3.5 py-1.5 rounded-full text-xs min-w-[4.5rem]"
                : "px-2 py-1.5 rounded-md text-xs",
              locale === l.code
                ? isHero
                  ? "bg-white text-blue-900 shadow-md"
                  : isSidebar
                    ? "bg-white text-blue-900 shadow-sm"
                    : "bg-white text-blue-700 shadow-sm border border-slate-200"
                : isHero
                  ? "text-white/75 hover:text-white hover:bg-white/10"
                  : isSidebar
                    ? "text-blue-100 hover:bg-white/10"
                    : "text-slate-600 hover:bg-white/60"
            )}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
