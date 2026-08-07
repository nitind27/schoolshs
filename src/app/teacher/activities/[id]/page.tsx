"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import {
  ActivityPrintView,
  type ActivityPrintSchool,
} from "@/components/activities/activity-print";
import { ArrowLeft, Printer, Users } from "lucide-react";
import "@/app/activities/activities.css";

type ActivityDetail = {
  id: string;
  title: string;
  titleGu?: string | null;
  type: string;
  date: string;
  venue?: string | null;
  description?: string | null;
  academicYear?: string;
  participants: Parameters<typeof ActivityPrintView>[0]["activity"]["participants"];
};

export default function TeacherActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [school, setSchool] = useState<ActivityPrintSchool>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/activities?id=${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.activity) {
      setActivity(data.activity);
      setSchool(data.school || null);
    } else {
      setActivity(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;
  if (!activity) {
    return (
      <PageShell title={t("activities.title")}>
        <p className="py-12 text-center text-slate-500">
          {t("activities.notFound")}
        </p>
        <div className="text-center">
          <Link href="/teacher/activities">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("activities.back")}
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={activity.title}
      subtitle={
        activity.titleGu
          ? `${activity.date} · ${activity.titleGu}`
          : `${activity.date}${activity.venue ? ` · ${activity.venue}` : ""}`
      }
      breadcrumbs={[
        { label: t("teacherNav.dashboard"), href: "/teacher" },
        { label: t("activities.title"), href: "/teacher/activities" },
        { label: activity.title },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
            disabled={!activity.participants.length}
          >
            <Printer className="h-4 w-4" />
            {t("activities.print")}
          </Button>
          <Link href="/teacher/activities">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("activities.back")}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="act-detail">
        <div className="act-detail__banner">
          <div>
            <div className="act-detail__badges">
              <span className="act-card__type">
                {t(`activities.type.${activity.type}` as never)}
              </span>
              <span className="act-badge act-badge--live">
                {t("activities.released")}
              </span>
            </div>
            <h2 className="act-detail__title">{activity.title}</h2>
            {activity.description ? (
              <p className="act-detail__desc">{activity.description}</p>
            ) : null}
          </div>
          <div className="act-detail__stat">
            <Users className="h-5 w-5" />
            <div>
              <p className="act-detail__stat-val">
                {activity.participants.length}
              </p>
              <p className="act-detail__stat-lbl">
                {t("activities.participants")}
              </p>
            </div>
          </div>
        </div>

        <section className="act-print-wrap">
          <ActivityPrintView
            activity={activity}
            school={school}
            showScreenButton={false}
          />
        </section>
      </div>
    </PageShell>
  );
}
