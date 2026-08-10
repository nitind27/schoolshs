"use client";

import { useEffect, useState } from "react";
import { Moon, Sparkles, Sun, SunMedium, Sunset } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "./teacher-portal.css";

interface AuthUser {
  name?: string;
}

export interface TeacherHeroProps {
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

export function TeacherHero({ schoolName }: TeacherHeroProps) {
  const t = useT();
  const [now, setNow] = useState<Date | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .catch(() => setUser(null));
  }, []);

  const hour = (now ?? new Date()).getHours();
  const greeting = t(`dashboard.${getGreetingKey(hour)}`);
  const displayName = user?.name?.split(" ")[0] || t("dashboard.defaultUser");

  const timeStr = now
    ? now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const dateStr = now
    ? now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="teacher-hero relative rounded-xl px-3 py-3 sm:px-4 md:px-5 md:py-3.5">
      <div className="teacher-hero-glow -right-10 -top-10 h-36 w-36 bg-teal-300/25" />
      <div className="teacher-hero-glow -left-8 bottom-0 h-28 w-28 bg-indigo-400/15" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="teacher-hero-badge">
              <span
                className="pulse-dot"
                style={{ background: "#2dd4bf", boxShadow: "0 0 0 0 rgba(45,212,191,.4)" }}
              />
              {t("dashboard.livePortal")}
            </span>
            <span className="teacher-hero-badge teacher-hero-badge-greeting">
              <GreetingIcon hour={hour} className="h-3 w-3" />
              {greeting}
            </span>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug break-words">
            {t("dashboard.greetingUser", { greeting, name: displayName })}
          </h1>
          <div className="mt-1.5 flex flex-col gap-1 text-xs text-teal-100/90 sm:mt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-0.5">
            <span>{t("teacherPortal.dashboardSubtitle")}</span>
            {schoolName ? (
              <span className="inline-flex min-w-0 items-center gap-1 font-medium text-teal-50">
                <span className="hidden text-teal-300/50 sm:inline">·</span>
                <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                <span className="truncate">{schoolName}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="teacher-hero-clock w-full shrink-0 sm:w-auto sm:text-right">
          <p className="text-base sm:text-lg font-bold tabular-nums text-white leading-tight">{timeStr}</p>
          <p className="mt-0.5 text-[10px] font-medium text-teal-100/85">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}
