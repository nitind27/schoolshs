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
      className={cn("tn-btn", isActive && "tn-btn--active")}
      data-active={isActive ? "true" : "false"}
      aria-label={t("navExt.letterhead")}
      title={t("navExt.letterhead")}
      aria-current={isActive ? "page" : undefined}
    >
      <FileSignature className="h-[1.05rem] w-[1.05rem]" />
    </Link>
  );
}
