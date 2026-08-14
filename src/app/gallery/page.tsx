"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { PageLoader } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { Images, Plus, CalendarDays } from "lucide-react";
import "./gallery.css";

type GalleryCard = {
  id: string;
  activityName: string;
  eventDate: string;
  titleCount: number;
  imageCount: number;
  coverUrl: string | null;
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function GalleryPage() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GalleryCard[]>([]);
  const [dashHref, setDashHref] = useState("/dashboard");
  const [role, setRole] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ activityName: "", eventDate: todayIso(), title: "" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const r = d?.user?.role;
        setRole(r || "");
        if (r === "clerk") setDashHref("/clerk");
        else if (r === "teacher") setDashHref("/teacher");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/gallery");
    const data = await res.json().catch(() => ({}));
    setEvents(Array.isArray(data.events) ? data.events : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setErr("");
    if (!form.activityName.trim()) {
      setErr(t("gallery.activityRequired"));
      return;
    }
    if (!form.eventDate) {
      setErr(t("gallery.dateRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || t("gallery.saveFailed"));
        return;
      }
      const id = data.event?.id;
      if (id) router.push(`/gallery/${id}`);
      else {
        setModal(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={t("gallery.title")}
      subtitle={t("gallery.subtitle")}
      icon={<Images className="h-6 w-6 text-teal-700" />}
      accentColor="border-teal-500"
      variant={role === "teacher" ? "teacher" : "default"}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("gallery.title") },
      ]}
      actions={
        <Button
          size="sm"
          onClick={() => {
            setErr("");
            setForm({ activityName: "", eventDate: todayIso(), title: "" });
            setModal(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("gallery.addActivity")}
        </Button>
      }
    >
      <div className="gal-wrap">
        {loading ? (
          <PageLoader />
        ) : events.length === 0 ? (
          <div className="gal-empty">
            <Images className="mx-auto h-12 w-12 text-teal-300" />
            <h3>{t("gallery.empty")}</h3>
            <p>{t("gallery.emptyHint")}</p>
            <Button className="mt-4" onClick={() => setModal(true)}>
              <Plus className="h-4 w-4" />
              {t("gallery.addActivity")}
            </Button>
          </div>
        ) : (
          <>
            <p className="gal-count">{t("gallery.count", { count: events.length })}</p>
            <div className="gal-grid">
              {events.map((e) => (
                <Link key={e.id} href={`/gallery/${e.id}`} className="gal-card">
                  <div className="gal-card__cover">
                    {e.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.coverUrl} alt={e.activityName} />
                    ) : (
                      <div className="gal-card__placeholder">
                        <Images className="h-10 w-10" />
                      </div>
                    )}
                    <span className="gal-card__badge">
                      {t("gallery.photoCount", { count: e.imageCount })}
                    </span>
                  </div>
                  <div className="gal-card__body">
                    <h3 className="gal-card__name">{e.activityName}</h3>
                    <p className="gal-card__meta">
                      <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                      {formatDate(e.eventDate)}
                      {" · "}
                      {t("gallery.titleCount", { count: e.titleCount })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {modal ? (
        <div className="gal-modal-bg" onClick={() => !saving && setModal(false)}>
          <div className="gal-modal" onClick={(ev) => ev.stopPropagation()}>
            <h3>{t("gallery.addActivity")}</h3>
            <p className="gal-modal__desc">{t("gallery.addHint")}</p>
            {err ? <p className="gal-error">{err}</p> : null}
            <div className="gal-modal__fields">
              <Input
                label={t("gallery.activityName")}
                value={form.activityName}
                placeholder={t("gallery.activityPlaceholder")}
                onChange={(e) => setForm((p) => ({ ...p, activityName: e.target.value }))}
              />
              <DateField
                label={t("gallery.eventDate")}
                value={form.eventDate}
                onChange={(v) => setForm((p) => ({ ...p, eventDate: v }))}
                outputFormat="iso"
              />
              <Input
                label={t("gallery.firstTitle")}
                value={form.title}
                placeholder={t("gallery.titlePlaceholder")}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="gal-modal__actions">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void create()}>
                {saving ? t("common.saving") : t("gallery.saveActivity")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
