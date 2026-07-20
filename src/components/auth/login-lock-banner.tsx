"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

type Props = {
  lockedUntil: string;
  onExpired?: () => void;
};

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LoginLockBanner({ lockedUntil, onExpired }: Props) {
  const t = useT();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) onExpired?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil, onExpired]);

  if (secondsLeft <= 0) return null;

  return (
    <div className="auth-lock-banner" role="alert">
      <div className="auth-lock-banner-icon">
        <Lock className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="auth-lock-banner-text">
        <p className="auth-lock-banner-title">{t("login.accountLocked")}</p>
        <p className="auth-lock-banner-desc">
          {t("login.accountLockedDesc", { time: formatCountdown(secondsLeft) })}
        </p>
      </div>
    </div>
  );
}
