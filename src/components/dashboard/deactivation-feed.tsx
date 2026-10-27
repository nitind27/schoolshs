"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserX } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

type Item = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  href: string | null;
};

export function DeactivationFeed() {
  const t = useT();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?kind=deactivation&take=6")
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (cancelled || !Array.isArray(json?.items)) return;
        setItems(json.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
          <UserX className="h-4 w-4" />
          {t("dashboard.deactivationsTitle")}
        </h2>
        <Link href="/students/inactive" className="text-xs font-semibold text-amber-900 underline">
          {t("dashboard.deactivationsOpen")}
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-amber-100 bg-white px-3 py-2">
            <p className="text-sm text-slate-800">{item.body || item.title}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
