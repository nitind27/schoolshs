"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageLoader } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import {
  CalendarDays,
  MapPin,
  PartyPopper,
  Users,
} from "lucide-react";
import "@/app/activities/activities.css";

type ActivityRow = {
  id: string;
  title: string;
  titleGu?: string | null;
  type: string;
  date: string;
  venue?: string | null;
  released?: boolean;
  _count?: { participants: number };
};

export default function TeacherActivitiesPage() {
  const t = useT();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/activities");
    const data = await res.json().catch(() => ({}));
    setRows(res.ok ? data.activities || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title={t("activities.title")}
      subtitle={t("activities.teacherSubtitle")}
      breadcrumbs={[
        { label: t("teacherNav.dashboard"), href: "/teacher" },
        { label: t("activities.title") },
      ]}
    >
      <div className="act-page">
        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="act-empty">
            <PartyPopper className="h-10 w-10 text-teal-600" />
            <p className="act-empty__title">{t("activities.teacherEmpty")}</p>
            <p className="act-empty__sub">{t("activities.teacherEmptyHint")}</p>
          </div>
        ) : (
          <div className="act-grid">
            {rows.map((row) => (
              <article key={row.id} className="act-card" data-type={row.type}>
                <div className="act-card__top">
                  <span className="act-card__type">
                    {t(`activities.type.${row.type}` as never)}
                  </span>
                  <span className="act-badge act-badge--live">
                    {t("activities.released")}
                  </span>
                </div>
                <h3 className="act-card__title">
                  <Link href={`/teacher/activities/${row.id}`}>{row.title}</Link>
                </h3>
                {row.titleGu ? (
                  <p className="act-card__gu">{row.titleGu}</p>
                ) : null}
                <div className="act-card__meta">
                  <span>
                    <CalendarDays className="h-3.5 w-3.5" /> {row.date}
                  </span>
                  {row.venue ? (
                    <span>
                      <MapPin className="h-3.5 w-3.5" /> {row.venue}
                    </span>
                  ) : null}
                  <span>
                    <Users className="h-3.5 w-3.5" />{" "}
                    {t("activities.participantCount", {
                      count: row._count?.participants ?? 0,
                    })}
                  </span>
                </div>
                <Link
                  href={`/teacher/activities/${row.id}`}
                  className="act-card__cta"
                >
                  {t("activities.viewList")}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
