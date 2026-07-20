"use client";

import { useEffect, useState } from "react";
import { Moon, Sparkles, Sun, SunMedium, Sunset } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

interface AuthUser {
  name?: string;
}

export interface DashboardHeroProps {
  schoolName?: string;
}

function getGreetingKey(hour: number): "goodMorning" | "goodAfternoon" | "goodEvening" | "goodNight" {
  if (hour >= 5 && hour < 12) return "goodMorning";
  if (hour >= 12 && hour < 17) return "goodAfternoon";
  if (hour >= 17 && hour < 21) return "goodEvening";
  return "goodNight";
}

function GreetingIcon({ hour, className }: { hour: number; className?: string }) {
  if (hour >= 5 && hour < 12) return <SunMedium className={className} />;
  if (hour >= 12 && hour < 17) return <Sun className={className} />;
  if (hour >= 17 && hour < 21) return <Sunset className={className} />;
  return <Moon className={className} />;
}

export function DashboardHero({ schoolName }: DashboardHeroProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  const hour = now.getHours();
  const greeting = t(`dashboard.${getGreetingKey(hour)}`);
  const displayName = user?.name?.split(" ")[0] || t("dashboard.defaultUser");

  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="dashboard-hero relative rounded-xl px-4 py-3 shadow-lg shadow-blue-900/15 md:px-5 md:py-3.5">
      <div className="dashboard-hero-glow -right-12 -top-12 h-32 w-32 bg-sky-400/20" />

      <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="dashboard-hero-badge dashboard-hero-badge-live">
              <span className="pulse-dot" />
              {t("dashboard.livePortal")}
            </span>
            <span className="dashboard-hero-badge dashboard-hero-badge-greeting">
              <GreetingIcon hour={hour} className="h-3 w-3" />
              {greeting}
            </span>
          </div>
          <h1 className="dashboard-hero-greeting">
            {t("dashboard.greetingUser", { greeting, name: displayName })}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-blue-100/85">
            <span>{t("dashboard.subtitle")}</span>
            {schoolName && (
              <>
                <span className="hidden text-blue-300/50 sm:inline">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-blue-50">
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                  <span className="truncate">{schoolName}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-hero-clock shrink-0 sm:text-right">
          <p className="dashboard-hero-time tabular-nums">{timeStr}</p>
          <p className="dashboard-hero-date">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}
