"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cake, PartyPopper, Sparkles, Users, Briefcase, ArrowRight, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import "./birthday-celebration.css";

export type BirthdayPersonLite = {
  id: string;
  kind: "student" | "staff";
  name: string;
  nameGu?: string | null;
  dateOfBirth: string;
  age: number | null;
  detail: string;
  href: string;
  photoPath?: string | null;
};

type BirthdayPayload = {
  total: number;
  studentCount: number;
  staffCount: number;
  students: BirthdayPersonLite[];
  staff: BirthdayPersonLite[];
  all: BirthdayPersonLite[];
};

function photoUrl(path?: string | null) {
  if (!path?.trim()) return null;
  return `/api/uploads/${path.trim().replace(/^[/\\]+/, "")}`;
}

function BirthdayAvatar({ person }: { person: BirthdayPersonLite }) {
  const src = photoUrl(person.photoPath);
  const initial = (person.name || "?").charAt(0).toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="bday-avatar-img" />
    );
  }
  return (
    <span className={cn("bday-avatar-fallback", person.kind === "staff" && "is-staff")}>
      {initial}
    </span>
  );
}

function BirthdayListModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: BirthdayPayload | null;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted || !data) return null;

  const sections = [
    { key: "staff" as const, title: t("birthday.staffSection"), items: data.staff, icon: Briefcase },
    { key: "students" as const, title: t("birthday.studentsSection"), items: data.students, icon: Users },
  ].filter((s) => s.items.length > 0);

  return createPortal(
    <div className="bday-modal-root" role="dialog" aria-modal="true" aria-label={t("birthday.modalTitle")}>
      <button type="button" className="bday-modal-backdrop" onClick={onClose} aria-label={t("common.close")} />
      <div className="bday-modal-panel">
        <div className="bday-modal-confetti" aria-hidden>
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
        <header className="bday-modal-head">
          <div className="bday-modal-badge">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="bday-modal-eyebrow">{t("birthday.eyebrow")}</p>
            <h2>{t("birthday.modalTitle")}</h2>
            <p>
              {t("birthday.modalSubtitle", {
                total: String(data.total),
                staff: String(data.staffCount),
                students: String(data.studentCount),
              })}
            </p>
          </div>
          <button type="button" className="bday-modal-close" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="bday-modal-body">
          {data.total === 0 ? (
            <div className="bday-empty">
              <Cake className="h-10 w-10 opacity-40" />
              <p>{t("birthday.empty")}</p>
            </div>
          ) : (
            sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <section key={sec.key} className="bday-section">
                  <h3>
                    <Icon className="h-4 w-4" />
                    {sec.title}
                    <em>{sec.items.length}</em>
                  </h3>
                  <ul className="bday-list">
                    {sec.items.map((p) => (
                      <li key={`${p.kind}-${p.id}`}>
                        <Link href={p.href} className="bday-row" onClick={onClose}>
                          <BirthdayAvatar person={p} />
                          <span className="bday-row-main">
                            <strong>{p.name}</strong>
                            {p.nameGu && p.nameGu !== p.name ? <small>{p.nameGu}</small> : null}
                            <em>{p.detail}</em>
                          </span>
                          <span className="bday-row-meta">
                            {p.age != null ? (
                              <span className="bday-age">{t("birthday.turnsAge", { age: String(p.age) })}</span>
                            ) : null}
                            <ArrowRight className="h-4 w-4 opacity-40" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Props = {
  /** Open modal when URL has ?birthday=1 */
  autoOpen?: boolean;
  className?: string;
};

export function BirthdayCelebrationCard({ autoOpen = false, className }: Props) {
  const t = useT();
  const [data, setData] = useState<BirthdayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/birthdays/today");
      const json = await res.json();
      if (res.ok) {
        setData({
          total: json.total || 0,
          studentCount: json.studentCount || 0,
          staffCount: json.staffCount || 0,
          students: json.students || [],
          staff: json.staff || [],
          all: json.all || [],
        });
      } else {
        setData({ total: 0, studentCount: 0, staffCount: 0, students: [], staff: [], all: [] });
      }
    } catch {
      setData({ total: 0, studentCount: 0, staffCount: 0, students: [], staff: [], all: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (autoOpen && data && data.total > 0) setOpen(true);
  }, [autoOpen, data]);

  if (loading) {
    return (
      <div className={cn("bday-card is-loading", className)} aria-hidden>
        <span className="bday-card-shimmer" />
      </div>
    );
  }

  if (!data || data.total === 0) return null;

  const preview = data.all.slice(0, 4);

  return (
    <>
      <button
        type="button"
        className={cn("bday-card", className)}
        onClick={() => setOpen(true)}
      >
        <div className="bday-card-glow" aria-hidden />
        <div className="bday-card-icon">
          <Cake className="h-6 w-6" />
        </div>
        <div className="bday-card-copy">
          <p className="bday-card-eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            {t("birthday.eyebrow")}
          </p>
          <strong>
            {data.total === 1
              ? t("birthday.cardTitleOne", { name: data.all[0]?.name || "" })
              : t("birthday.cardTitleMany", { count: String(data.total) })}
          </strong>
          <span>
            {t("birthday.cardHint", {
              staff: String(data.staffCount),
              students: String(data.studentCount),
            })}
          </span>
        </div>
        <div className="bday-card-faces" aria-hidden>
          {preview.map((p) => (
            <span key={`${p.kind}-${p.id}`} className="bday-card-face">
              <BirthdayAvatar person={p} />
            </span>
          ))}
          {data.total > 4 ? <span className="bday-card-more">+{data.total - 4}</span> : null}
        </div>
        <span className="bday-card-cta">
          {t("birthday.viewList")}
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      <BirthdayListModal open={open} onClose={() => setOpen(false)} data={data} />
    </>
  );
}
