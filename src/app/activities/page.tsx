"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import {
  CalendarDays,
  MapPin,
  PartyPopper,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import "./activities.css";

type ActivityType =
  | "party"
  | "sports"
  | "cultural"
  | "trip"
  | "competition"
  | "other";

type ActivityRow = {
  id: string;
  title: string;
  titleGu?: string | null;
  type: ActivityType | string;
  date: string;
  academicYear: string;
  venue?: string | null;
  description?: string | null;
  released?: boolean;
  _count?: { participants: number };
};

const TYPES: ActivityType[] = [
  "party",
  "sports",
  "cultural",
  "trip",
  "competition",
  "other",
];

const CUR_YEAR = new Date().getFullYear();

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ActivitiesPage() {
  const t = useT();
  const [year, setYear] = useState(String(CUR_YEAR));
  const [typeFilter, setTypeFilter] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(
    null,
  );
  const [form, setForm] = useState({
    title: "",
    titleGu: "",
    type: "party" as ActivityType,
    date: isoToday(),
    venue: "",
    description: "",
  });

  const showMsg = (text: string, tone: "ok" | "err" = "ok") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3500);
  };

  const academicYear = useMemo(() => {
    const y = parseInt(year, 10) || CUR_YEAR;
    // show activities for calendar year spanning both academic halves
    return `${y}-${String(y + 1).slice(2)}`;
  }, [year]);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    // Load by calendar year prefix on date
    const res = await fetch(
      `/api/activities?${typeFilter ? `type=${typeFilter}&` : ""}`,
    );
    const data = (await res.json()) as {
      activities?: ActivityRow[];
      error?: string;
    };
    if (!res.ok) {
      showMsg(data.error || t("activities.loadFailed"), "err");
      setRows([]);
    } else {
      const all = data.activities || [];
      setRows(all.filter((a) => a.date.startsWith(year)));
    }
    setLoading(false);
  }, [year, typeFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({
      title: "",
      titleGu: "",
      type: "party",
      date: isoToday(),
      venue: "",
      description: "",
    });
    setErr("");
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setErr(t("activities.titleRequired"));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setErr(t("activities.dateRequired"));
      return;
    }
    setSaving(true);
    setErr("");
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...form,
        academicYear,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setErr(data.error || t("activities.saveFailed"));
      return;
    }
    setModal(false);
    showMsg(t("activities.created"));
    void load();
  };

  const remove = async (row: ActivityRow) => {
    if (
      !confirm(
        t("activities.deleteConfirm", { title: row.title, date: row.date }),
      )
    ) {
      return;
    }
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: row.id }),
    });
    if (res.ok) {
      showMsg(t("activities.deleted"));
      void load();
    } else {
      showMsg(t("activities.deleteFailed"), "err");
    }
  };

  const typeLabel = (type: string) => t(`activities.type.${type}` as never);

  return (
    <PageShell
      title={t("activities.title")}
      subtitle={t("activities.subtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("activities.title") },
      ]}
      actions={
        <button type="button" className="act-btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("activities.add")}
        </button>
      }
    >
      <div className="act-page">
        {msg && (
          <div className={`act-toast act-toast--${msg.tone}`}>{msg.text}</div>
        )}

        <div className="act-toolbar">
          <Select
            label={t("activities.yearFilter")}
            className="w-28"
            value={year}
            hideEmptyOption
            onChange={(e) => setYear(e.target.value)}
            options={[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map((y) => ({
              value: String(y),
              label: String(y),
            }))}
          />
          <Select
            label={t("activities.typeFilter")}
            className="min-w-[10rem]"
            value={typeFilter}
            emptyLabel={t("activities.allTypes")}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={TYPES.map((ty) => ({
              value: ty,
              label: typeLabel(ty),
            }))}
          />
        </div>

        {loading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <div className="act-empty">
            <PartyPopper className="h-10 w-10 text-teal-600" />
            <p className="act-empty__title">{t("activities.empty")}</p>
            <p className="act-empty__sub">{t("activities.emptyHint")}</p>
          </div>
        ) : (
          <div className="act-grid">
            {rows.map((row) => (
              <article key={row.id} className="act-card" data-type={row.type}>
                <div className="act-card__top">
                  <span className="act-card__type">{typeLabel(row.type)}</span>
                  <div className="act-card__top-right">
                    <span
                      className={`act-badge ${row.released ? "act-badge--live" : "act-badge--draft"}`}
                    >
                      {row.released
                        ? t("activities.released")
                        : t("activities.draft")}
                    </span>
                    <button
                      type="button"
                      className="act-card__del"
                      onClick={() => remove(row)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="act-card__title">
                  <Link href={`/activities/${row.id}`}>{row.title}</Link>
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
                <Link href={`/activities/${row.id}`} className="act-card__cta">
                  {t("activities.manageStudents")}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="act-modal-backdrop" role="dialog" aria-modal="true">
          <div className="act-modal">
            <header className="act-modal__head">
              <div>
                <p className="act-modal__kicker">{t("activities.add")}</p>
                <h2 className="act-modal__title">{t("activities.newTitle")}</h2>
              </div>
              <button
                type="button"
                className="act-modal__close"
                onClick={() => setModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="act-modal__body space-y-3">
              <Input
                label={t("activities.fieldTitle")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("activities.titlePlaceholder")}
              />
              <Input
                label={t("activities.fieldTitleGu")}
                value={form.titleGu}
                onChange={(e) => setForm({ ...form, titleGu: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t("activities.fieldType")}
                value={form.type}
                hideEmptyOption
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as ActivityType,
                  })
                }
                options={TYPES.map((ty) => ({
                  value: ty,
                  label: typeLabel(ty),
                }))}
              />
                <Input
                  label={t("activities.fieldDate")}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <Input
                label={t("activities.fieldVenue")}
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder={t("activities.venuePlaceholder")}
              />
              <label className="block text-sm font-medium text-slate-700">
                {t("activities.fieldDescription")}
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              {err ? <p className="text-sm text-red-600">{err}</p> : null}
            </div>
            <footer className="act-modal__foot">
              <Button variant="outline" onClick={() => setModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
                {saving ? t("common.saving") : t("activities.save")}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </PageShell>
  );
}
