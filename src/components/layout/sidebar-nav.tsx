"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { hrefToFeature, type SchoolFeatureKey } from "@/lib/school-features";
import { useSidebarCollapse } from "@/components/layout/sidebar-collapse";

export type NavLinkItem = {
  type: "link";
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: SchoolFeatureKey;
};

export type NavSubmenuItem = {
  type: "submenu";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  featureKey?: SchoolFeatureKey;
  children: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    featureKey?: SchoolFeatureKey;
  }[];
};

export type NavEntry = NavLinkItem | NavSubmenuItem;

const STAFF_RESERVED = new Set(["new", "attendance", "payroll", "register", "salary-statement", "salary-slip", "income-tax", "salary-ledger"]);
const STUDENTS_RESERVED = new Set(["new", "board-records"]);

function isPathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/id-cards") {
    return pathname === "/id-cards" || pathname.startsWith("/id-cards/");
  }
  if (href === "/exam-id-cards") {
    return pathname === "/exam-id-cards" || pathname.startsWith("/exam-id-cards/");
  }
  if (href === "/staff") {
    if (pathname === "/staff") return true;
    if (!pathname.startsWith("/staff/")) return false;
    const segment = pathname.split("/")[2];
    return Boolean(segment && !STAFF_RESERVED.has(segment));
  }
  if (href === "/students") {
    if (pathname === "/students") return true;
    if (!pathname.startsWith("/students/")) return false;
    const segment = pathname.split("/")[2];
    return Boolean(segment && !STUDENTS_RESERVED.has(segment));
  }
  return pathname === href || pathname.startsWith(href + "/");
}

function submenuActive(pathname: string, item: NavSubmenuItem) {
  return item.children.some((c) => isPathActive(pathname, c.href));
}

export function SidebarNavLink({
  item,
  pathname,
  onNavigate,
  accentStyle,
  inactiveTextClass,
  collapsed,
}: {
  item: NavLinkItem;
  pathname: string;
  onNavigate: () => void;
  accentStyle: (active: boolean) => React.CSSProperties | undefined;
  inactiveTextClass: string;
  collapsed?: boolean;
}) {
  const isActive = isPathActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "shell-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
        isActive ? "bg-[#047857] text-[#F9FAFB] shadow-sm hover:bg-[#065F46]" : cn(inactiveTextClass, "hover:bg-[#1F2937] hover:text-[#F9FAFB]"),
        collapsed && "justify-center px-2",
      )}
    >
      <span
        className={cn(
          "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
          isActive ? "text-white" : "text-white/50 group-hover:text-white/80",
        )}
        style={accentStyle(isActive)}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="shell-nav-label flex-1 truncate leading-tight">{item.label}</span>
      {isActive && <ChevronRight className="shell-nav-chevron shrink-0 h-3.5 w-3.5 text-white/40" />}
    </Link>
  );
}

export function SidebarNavSubmenu({
  item,
  pathname,
  onNavigate,
  accentStyle,
  inactiveTextClass,
  collapsed,
}: {
  item: NavSubmenuItem;
  pathname: string;
  onNavigate: () => void;
  accentStyle: (active: boolean) => React.CSSProperties | undefined;
  inactiveTextClass: string;
  collapsed?: boolean;
}) {
  const groupActive = submenuActive(pathname, item);
  const [open, setOpen] = useState(groupActive);
  const [flyout, setFlyout] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const Icon = item.icon;

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive, pathname]);

  useEffect(() => {
    if (!flyout) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setFlyout(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [flyout]);

  useEffect(() => {
    if (collapsed) setOpen(false);
  }, [collapsed]);

  if (collapsed) {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          title={item.label}
          onClick={() => setFlyout((v) => !v)}
          className={cn(
            "shell-nav-btn w-full flex items-center justify-center rounded-xl px-2 py-2.5 text-sm font-medium transition-all duration-150 group cursor-pointer",
            groupActive || flyout
              ? "bg-[#047857] text-[#F9FAFB] hover:bg-[#065F46]"
              : cn(inactiveTextClass, "hover:bg-[#1F2937] hover:text-[#F9FAFB]"),
          )}
        >
          <span
            className={cn(
              "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
              groupActive || flyout ? "text-white" : "text-white/50 group-hover:text-white/80",
            )}
            style={accentStyle(groupActive || flyout)}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </button>
        {flyout && (
          <div className="shell-flyout">
            <div className="shell-flyout__title">{item.label}</div>
            <div className="space-y-0.5">
              {item.children.map((child) => {
                const childActive = isPathActive(pathname, child.href);
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => {
                      setFlyout(false);
                      onNavigate();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all cursor-pointer",
                      childActive
                        ? "bg-[#047857] text-[#F9FAFB] hover:bg-[#065F46]"
                        : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]",
                    )}
                  >
                    <ChildIcon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="shell-subnav-label min-w-0 flex-1">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "shell-nav-btn w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group cursor-pointer",
          groupActive ? "bg-[#047857] text-[#F9FAFB] hover:bg-[#065F46]" : cn(inactiveTextClass, "hover:bg-[#1F2937] hover:text-[#F9FAFB]"),
        )}
      >
        <span
          className={cn(
            "shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all",
            groupActive ? "text-white" : "text-white/50 group-hover:text-white/80",
          )}
          style={accentStyle(groupActive)}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="shell-nav-label flex-1 truncate text-left leading-tight">{item.label}</span>
        <ChevronDown
          className={cn(
            "shell-nav-chevron shrink-0 h-4 w-4 text-white/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="ml-4 pl-2 border-l border-white/10 space-y-0.5 py-0.5">
          {item.children.map((child) => {
            const childActive = isPathActive(pathname, child.href);
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all cursor-pointer",
                  childActive
                    ? "bg-[#047857] text-[#F9FAFB] hover:bg-[#065F46]"
                    : cn(inactiveTextClass, "opacity-80 hover:bg-[#1F2937] hover:text-[#F9FAFB] hover:opacity-100"),
                )}
              >
                <ChildIcon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="shell-subnav-label min-w-0 flex-1">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNavEntries({
  items,
  pathname,
  onNavigate,
  accentColor = "rgba(255,255,255,.18)",
  inactiveTextClass = "text-[#9CA3AF]",
  collapsed: collapsedProp,
}: {
  items: NavEntry[];
  pathname: string;
  onNavigate: () => void;
  accentColor?: string;
  inactiveTextClass?: string;
  collapsed?: boolean;
}) {
  const { collapsed: ctxCollapsed } = useSidebarCollapse();
  const collapsed = collapsedProp ?? ctxCollapsed;
  const accentStyle = (active: boolean) => (active ? { background: accentColor } : undefined);

  return (
    <>
      {items.map((item) =>
        item.type === "submenu" ? (
          <SidebarNavSubmenu
            key={item.id}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            accentStyle={accentStyle}
            inactiveTextClass={inactiveTextClass}
            collapsed={collapsed}
          />
        ) : (
          <SidebarNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            accentStyle={accentStyle}
            inactiveTextClass={inactiveTextClass}
            collapsed={collapsed}
          />
        ),
      )}
    </>
  );
}

function resolveNavFeatureKey(
  featureKey: SchoolFeatureKey | undefined,
  href?: string,
): SchoolFeatureKey | null {
  if (featureKey) return featureKey;
  if (href) return hrefToFeature(href);
  return null;
}

export function filterNavEntries(
  items: NavEntry[],
  enabledFeatures: SchoolFeatureKey[] | null,
  isEnabled: (features: SchoolFeatureKey[], key: SchoolFeatureKey) => boolean,
): NavEntry[] {
  if (!enabledFeatures) return items;

  return items
    .map((item) => {
      if (item.type === "link") {
        const key = resolveNavFeatureKey(item.featureKey, item.href);
        if (key && !isEnabled(enabledFeatures, key)) return null;
        return item;
      }
      const parentKey = resolveNavFeatureKey(item.featureKey);
      if (parentKey && !isEnabled(enabledFeatures, parentKey)) return null;
      const children = item.children.filter((c) => {
        const key = resolveNavFeatureKey(c.featureKey, c.href);
        return !key || isEnabled(enabledFeatures, key);
      });
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter((item): item is NavEntry => item !== null);
}
