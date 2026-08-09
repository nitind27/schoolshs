"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMedium, Sunset } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";

interface AuthUser {
  name?: string;
}

export interface DashboardHeroProps {
  schoolName?: string;
  logoPath?: string | null;
  tagline?: string | null;
  academicYear?: string | null;
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

export function DashboardHero({
  schoolName,
  logoPath,
  tagline,
  academicYear,
}: DashboardHeroProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
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
  const brand = schoolName?.trim() || t("dashboard.defaultSchool");
  const logoSrc = logoPath?.trim()
    ? `/api/uploads/${logoPath.trim().replace(/^[/\\]+/, "")}`
    : SCHOOL_LOGO_URL;

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
    <header className="dashboard-hero dashboard-hero-v2">
      <div className="dashboard-hero-glow dashboard-hero-glow-a" aria-hidden />
      <div className="dashboard-hero-glow dashboard-hero-glow-b" aria-hidden />

      <div className="dashboard-hero-v2-inner">
        <div className="dashboard-hero-brand">
          <div className="dashboard-hero-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="dashboard-hero-logo" />
          </div>

          <div className="dashboard-hero-brand-copy min-w-0">
            <p className="dashboard-hero-kicker">
              <span className="dashboard-hero-live">
                <span className="pulse-dot" />
                {t("dashboard.livePortal")}
              </span>
              {academicYear ? (
                <span className="dashboard-hero-year">{academicYear}</span>
              ) : null}
            </p>
            <h1 className="dashboard-hero-school-name">{brand}</h1>
            <p className="dashboard-hero-greeting-line">
              <GreetingIcon hour={hour} className="h-3.5 w-3.5 shrink-0 opacity-90" />
              <span>
                {t("dashboard.greetingUser", { greeting, name: displayName })}
              </span>
            </p>
            <p className="dashboard-hero-tagline">
              {tagline?.trim() || t("dashboard.subtitle")}
            </p>
          </div>
        </div>

        <div className="dashboard-hero-clock shrink-0" aria-label={dateStr}>
          <p className="dashboard-hero-time tabular-nums">{timeStr}</p>
          <p className="dashboard-hero-date">{dateStr}</p>
        </div>
      </div>
    </header>
  );
}
