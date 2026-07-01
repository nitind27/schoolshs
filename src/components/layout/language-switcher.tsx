"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import { LOCALES, type Locale } from "@/i18n/types";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "sidebar" | "login" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "sidebar", className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  const isSidebar = variant === "sidebar";
  const isLogin = variant === "login";

  return (
    <div className={cn("space-y-1.5", className)}>
      {!isCompact(variant) && (
        <p
          className={cn(
            "text-xs font-medium flex items-center gap-1.5",
            isSidebar ? "text-blue-200 px-1" : isLogin ? "text-slate-500" : "text-slate-500"
          )}
        >
          <Languages className="h-3.5 w-3.5" />
          {t("lang.language")}
        </p>
      )}
      <div
        className={cn(
          "flex rounded-lg p-0.5 gap-0.5",
          isSidebar ? "bg-white/10" : "bg-slate-100 border border-slate-200"
        )}
      >
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code as Locale)}
            className={cn(
              "flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
              locale === l.code
                ? isSidebar
                  ? "bg-white text-blue-900 shadow-sm"
                  : "bg-white text-blue-700 shadow-sm border border-slate-200"
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

function isCompact(variant: string) {
  return variant === "compact";
}
