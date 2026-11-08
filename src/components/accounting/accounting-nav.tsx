"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale-provider";

const ITEMS = [
  { href: "/accounting", key: "home", labelKey: "accounting.title" },
  { href: "/accounting/ledgers", key: "ledgers", labelKey: "accounting.ledgersPageTitle" },
  { href: "/accounting/vouchers", key: "vouchers", labelKey: "accounting.voucherRegister" },
  { href: "/accounting/monthly", key: "month", labelKey: "accounting.monthCheckTitle" },
  { href: "/accounting/day-book", key: "day", labelKey: "accounting.dayBook" },
  { href: "/accounting/trial-balance", key: "tb", labelKey: "accounting.trialBalance" },
  { href: "/accounting/reports", key: "reports", labelKey: "accounting.financialReports" },
] as const;

export function AccountingNav({ current }: { current: (typeof ITEMS)[number]["key"] }) {
  const t = useT();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={t("accounting.title")}>
      {ITEMS.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800"
            }`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
