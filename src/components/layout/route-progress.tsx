"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import "@/components/ui/loader.css";

/**
 * Soft client-navigation feedback only (top bar).
 * No full-screen blank / overlay — that felt like a hard page reload.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${pathname}?${searchParams?.toString() || ""}`;
  const prevKey = useRef(key);

  const start = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActive(true);
  };

  const stop = () => {
    hideTimer.current = setTimeout(() => setActive(false), 220);
  };

  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = (e.target as HTMLElement | null)?.closest?.("a");
      if (!el) return;

      // Next.js <Link> marks this; skip modified / external / hash
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (el.getAttribute("target") === "_blank" || el.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const next = `${url.pathname}${url.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next === current) return;
        start();
      } catch {
        /* ignore */
      }
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", () => start());
    return () => {
      document.removeEventListener("click", onClick, true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div className="shs-route-progress" data-active={active ? "true" : "false"} aria-hidden>
      <div className="shs-route-progress__bar" />
    </div>
  );
}

export function RouteProgressGate() {
  return <RouteProgress />;
}
