"use client";

import { usePathname } from "next/navigation";
import { MainLayout } from "@/components/layout/sidebar";
import { AdminLayout } from "@/components/layout/admin-sidebar";
import { LocaleProvider } from "@/i18n/locale-provider";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/m/")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/admin")) {
    return <AdminLayout>{children}</AdminLayout>;
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
