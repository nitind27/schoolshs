"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const LETTERHEAD_ROLES = new Set(["school_admin", "clerk"]);

/** Top-navbar shortcut to Letterhead Studio (`/letterhead`). */
export function NavbarLetterheadButton({ role }: { role?: string | null }) {
  const t = useT();
  const pathname = usePathname();

  if (!role || !LETTERHEAD_ROLES.has(role)) return null;

  const isActive = pathname === "/letterhead" || pathname.startsWith("/letterhead/");

  return (
    <Link
      href="/letterhead"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white",
        "text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800",
        isActive && "border-rose-300 bg-rose-50 text-rose-800",
      )}
      aria-label={t("navExt.letterhead")}
      title={t("navExt.letterhead")}
      aria-current={isActive ? "page" : undefined}
    >
      <FileSignature className="h-4 w-4" />
    </Link>
  );
}
