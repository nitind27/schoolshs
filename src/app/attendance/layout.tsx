"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { ClipboardList, BarChart3, BookOpen } from "lucide-react";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();

  const tabs = [
    { href: "/attendance", label: t("attendance.tabEntry"), icon: ClipboardList },
    { href: "/attendance/reports", label: t("attendance.tabReports"), icon: BarChart3 },
    { href: "/certificates/daily-attendance-book", label: t("attendance.tabDailyBook"), icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-blue-600 text-blue-700 bg-blue-50/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
