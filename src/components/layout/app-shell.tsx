"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MainLayout } from "@/components/layout/sidebar";
import { AdminLayout } from "@/components/layout/admin-sidebar";
import { TeacherLayout } from "@/components/layout/teacher-sidebar";
import { ClerkLayout } from "@/components/layout/clerk-sidebar";
import { CaLayout } from "@/components/layout/ca-sidebar";
import { StudentLayout } from "@/components/layout/student-sidebar";
import { LocaleProvider } from "@/i18n/locale-provider";
import { isUserRole, type UserRole } from "@/lib/roles";
import { AUTH_CHANGED_EVENT, notifyAuthChanged } from "@/lib/auth-client";
import { Toaster } from "@/components/ui/toast";
import { HelpChatbot } from "@/components/help/help-chatbot";
import { FeatureTourDemoSearchBridge } from "@/components/feature-tour/feature-tour-panel";
import { PageLoader } from "@/components/ui/loader";
import { RouteProgressGate } from "@/components/layout/route-progress";
import { SidebarCollapseProvider } from "@/components/layout/sidebar-collapse";
import { SchoolFeatureRouteGuard } from "@/components/school/school-feature-route-guard";

function LayoutForRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  switch (role) {
    case "super_admin":
      return <AdminLayout>{children}</AdminLayout>;
    case "teacher":
      return <TeacherLayout>{children}</TeacherLayout>;
    case "clerk":
      return <ClerkLayout>{children}</ClerkLayout>;
    case "ca":
      return <CaLayout>{children}</CaLayout>;
    case "student":
      return <StudentLayout>{children}</StudentLayout>;
    default:
      return <MainLayout>{children}</MainLayout>;
  }
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname.startsWith("/m/") ||
    pathname === "/" ||
    pathname === "/verify-email"
  );
}

declare global {
  interface Window {
    __shsSessionRedirecting?: boolean;
  }
}

async function forceLoginRedirect(pathname: string) {
  if (typeof window === "undefined") return;
  if (window.__shsSessionRedirecting) return;
  window.__shsSessionRedirecting = true;

  try {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
  } catch {
    /* ignore */
  }
  try {
    notifyAuthChanged({ role: null, userId: null });
  } catch {
    /* ignore */
  }

  window.location.replace(`/login?next=${encodeURIComponent(pathname)}&reason=session_revoked`);
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);
  const [authTick, setAuthTick] = useState(0);
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const hadSessionRef = useRef(false);
  const bootedRef = useRef(false);
  const watchRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (publicRoute) {
      window.__shsSessionRedirecting = false;
      watchRef.current?.close();
      watchRef.current = null;
    }
  }, [publicRoute]);

  useEffect(() => {
    if (publicRoute) return;
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }, [pathname, publicRoute]);

  useEffect(() => {
    const onAuthChanged = () => {
      if (window.__shsSessionRedirecting) return;
      setAuthTick((n) => n + 1);
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  // Live watch — other devices logout within ~1.5s
  useEffect(() => {
    if (publicRoute || !bootedRef.current || !hadSessionRef.current) return;
    if (window.__shsSessionRedirecting) return;

    let stopped = false;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stopped || window.__shsSessionRedirecting) return;
      es?.close();
      es = new EventSource("/api/auth/session-watch");
      watchRef.current = es;

      es.onmessage = (ev) => {
        if (stopped || window.__shsSessionRedirecting) return;
        try {
          const data = JSON.parse(ev.data) as { ok?: boolean; reason?: string };
          if (data.ok === false) {
            es?.close();
            void forceLoginRedirect(pathname);
          }
        } catch {
          /* ignore bad frames */
        }
      };

      es.onerror = () => {
        es?.close();
        watchRef.current = null;
        if (stopped || window.__shsSessionRedirecting) return;
        // Reconnect quickly; also do one immediate me-check
        void fetch("/api/auth/me", { cache: "no-store" })
          .then(async (r) => {
            if (!r.ok) {
              if (hadSessionRef.current) await forceLoginRedirect(pathname);
              return;
            }
            if (!stopped) {
              retryTimer = setTimeout(connect, 2000);
            }
          })
          .catch(() => {
            if (!stopped) retryTimer = setTimeout(connect, 3000);
          });
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      watchRef.current = null;
    };
  }, [publicRoute, pathname, role, authTick]);

  // Backup focus check (if SSE blocked by proxy)
  useEffect(() => {
    if (publicRoute) return;
    const onFocus = () => {
      if (window.__shsSessionRedirecting || document.hidden) return;
      fetch("/api/auth/me", { cache: "no-store" })
        .then(async (r) => {
          if (!r.ok && hadSessionRef.current) {
            await forceLoginRedirect(pathname);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [publicRoute, pathname]);

  const resolveRole = useCallback(() => {
    if (publicRoute) {
      setRole(null);
      hadSessionRef.current = false;
      bootedRef.current = false;
      return () => {};
    }
    if (window.__shsSessionRedirecting) return () => {};

    let alive = true;
    if (!bootedRef.current) setRole(undefined);

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive || window.__shsSessionRedirecting) return;

        if (!r.ok || !d.user) {
          if (hadSessionRef.current) {
            await forceLoginRedirect(pathname);
            return;
          }
          bootedRef.current = true;
          setRole(null);
          return;
        }

        hadSessionRef.current = true;
        bootedRef.current = true;
        const resolvedRole = d.user?.role;
        setRole(resolvedRole && isUserRole(resolvedRole) ? resolvedRole : null);
      })
      .catch(() => {
        if (!alive || window.__shsSessionRedirecting) return;
        if (!bootedRef.current) {
          bootedRef.current = true;
          setRole(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [publicRoute, pathname, authTick]);

  useEffect(() => {
    return resolveRole();
  }, [resolveRole]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (role === undefined) {
    return <PageLoader screen label="Loading portal…" />;
  }

  if (role) {
    return (
      <SchoolFeatureRouteGuard role={role}>
        <LayoutForRole key={role} role={role}>
          {children}
        </LayoutForRole>
      </SchoolFeatureRouteGuard>
    );
  }

  return <MainLayout key="guest">{children}</MainLayout>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SidebarCollapseProvider>
        <Toaster />
        <Suspense fallback={null}>
          <RouteProgressGate />
        </Suspense>
        <AppShellInner>{children}</AppShellInner>
        <HelpChatbot />
        <FeatureTourDemoSearchBridge />
      </SidebarCollapseProvider>
    </LocaleProvider>
  );
}
