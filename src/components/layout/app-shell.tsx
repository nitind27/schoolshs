"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/sidebar";
import { AdminLayout } from "@/components/layout/admin-sidebar";
import { TeacherLayout } from "@/components/layout/teacher-sidebar";
import { ClerkLayout } from "@/components/layout/clerk-sidebar";
import { CaLayout } from "@/components/layout/ca-sidebar";
import { StudentLayout } from "@/components/layout/student-sidebar";
import { LocaleProvider } from "@/i18n/locale-provider";
import { isUserRole, type UserRole } from "@/lib/roles";

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

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/m/")) return;

    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const resolvedRole = d.user?.role;
        setRole(resolvedRole && isUserRole(resolvedRole) ? resolvedRole : null);
      })
      .catch(() => {
        if (alive) setRole(null);
      });

    return () => {
      alive = false;
    };
  }, [pathname]);

  if (pathname === "/login" || pathname.startsWith("/m/") || pathname === "/") {
    return <>{children}</>;
  }

  if (role === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (pathname.startsWith("/admin")) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  if (role) {
    return <LayoutForRole role={role}>{children}</LayoutForRole>;
  }

  return <MainLayout>{children}</MainLayout>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppShellInner>{children}</AppShellInner>
    </LocaleProvider>
  );
}
