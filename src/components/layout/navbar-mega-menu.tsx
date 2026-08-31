"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { REPORTS_CERTS_MEGA_MENU } from "@/lib/nav-mega-menu";
import { hrefToFeature, isFeatureEnabled } from "@/lib/school-features";
import { useSchoolFeatures } from "@/components/school/use-school-features";

export function NavbarMegaMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { features } = useSchoolFeatures();

  const hasAnyLink = !features
    ? true
    : REPORTS_CERTS_MEGA_MENU.some((col) =>
        col.links.some((link) => {
          const key = hrefToFeature(link.href);
          return !key || isFeatureEnabled(features, key);
        }),
      );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open || window.innerWidth >= 1024) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!hasAnyLink) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tn-mega-trigger inline-flex items-center"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("megaMenu.trigger")}
      >
        <span className="tn-mega-icon">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        <span className="hidden md:inline">{t("megaMenu.trigger")}</span>
        <span className="hidden sm:inline md:hidden">{t("megaMenu.triggerShort")}</span>
        <ChevronDown
          className={cn(
            "hidden sm:block h-3.5 w-3.5 opacity-60 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="tn-mega-backdrop lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={t("common.cancel")}
          />
          <div
            className="tn-mega-mobile lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t("megaMenu.panelTitle")}
          >
            <MegaPanel onNavigate={() => setOpen(false)} showClose />
          </div>

          <div className="tn-mega-desktop hidden lg:block">
            <div className="tn-mega-panel">
              <MegaPanel onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MegaPanel({
  onNavigate,
  showClose = false,
}: {
  onNavigate: () => void;
  showClose?: boolean;
}) {
  const t = useT();
  const { features } = useSchoolFeatures();

  const columns = REPORTS_CERTS_MEGA_MENU.map((col) => ({
    ...col,
    links: col.links.filter((link) => {
      if (!features) return true;
      const key = hrefToFeature(link.href);
      return !key || isFeatureEnabled(features, key);
    }),
  })).filter((col) => col.links.length > 0);

  if (!columns.length) {
    return (
      <div className="tn-mega-body p-4 text-sm text-slate-500">
        No report modules enabled for this school.
      </div>
    );
  }

  const primaryHref = columns[0]?.links[0]?.href ?? "/export";

  return (
    <div className="tn-mega-body">
      <header className="tn-mega-head">
        <div className="tn-mega-head-copy">
          <p className="tn-mega-kicker">{t("megaMenu.triggerShort")}</p>
          <p className="tn-mega-title">{t("megaMenu.panelTitle")}</p>
          <p className="tn-mega-sub">{t("megaMenu.panelSubtitle")}</p>
        </div>
        <div className="tn-mega-head-actions">
          <Link href={primaryHref} onClick={onNavigate} className="tn-mega-all">
            {t("megaMenu.viewAll")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {showClose ? (
            <button
              type="button"
              onClick={onNavigate}
              className="tn-mega-close"
              aria-label={t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="tn-mega-cols">
        {columns.map((col) => {
          const ColIcon = col.icon;
          const [featured, ...rest] = col.links;
          const FeatIcon = featured.icon;

          return (
            <section key={col.id} className="tn-mega-col" data-tone={col.id}>
              <div className="tn-mega-col-head">
                <span className={cn("tn-mega-col-ico", col.accent)}>
                  <ColIcon className="h-3.5 w-3.5" />
                </span>
                <h3>{t(col.titleKey)}</h3>
              </div>

              <Link
                href={featured.href}
                onClick={onNavigate}
                className="tn-mega-featured"
              >
                <span className="tn-mega-featured-ico">
                  <FeatIcon className="h-4 w-4" />
                </span>
                <span className="tn-mega-featured-copy">
                  <strong>{t(featured.labelKey)}</strong>
                  {featured.descKey ? <small>{t(featured.descKey)}</small> : null}
                </span>
                <ArrowRight className="tn-mega-featured-arrow h-3.5 w-3.5" />
              </Link>

              <ul className="tn-mega-list">
                {rest.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onNavigate}
                        className="tn-mega-link"
                        title={link.descKey ? t(link.descKey) : undefined}
                      >
                        <span className="tn-mega-link-ico">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="tn-mega-link-text">
                          <span>{t(link.labelKey)}</span>
                          {link.descKey ? <small>{t(link.descKey)}</small> : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
