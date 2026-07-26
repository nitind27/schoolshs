"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const SIDEBAR_EXPANDED_W = 260;
export const SIDEBAR_ADMIN_EXPANDED_W = 270;
export const SIDEBAR_COLLAPSED_W = 72;

const STORAGE_KEY = "shs-sidebar-collapsed";

type SidebarCollapseContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  widthFor: (expandedWidth?: number) => number;
};

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(readStored());
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const widthFor = useCallback(
    (expandedWidth = SIDEBAR_EXPANDED_W) => (collapsed ? SIDEBAR_COLLAPSED_W : expandedWidth),
    [collapsed],
  );

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggle, widthFor }),
    [collapsed, setCollapsed, toggle, widthFor],
  );

  return (
    <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    return {
      collapsed: false,
      setCollapsed: () => {},
      toggle: () => {},
      widthFor: (expandedWidth = SIDEBAR_EXPANDED_W) => expandedWidth,
    };
  }
  return ctx;
}

/** Single desktop control — sits in brand header */
export function SidebarCollapseHeaderBtn({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      className={cn(
        "hidden lg:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        "text-white/70 hover:text-white hover:bg-white/12 cursor-pointer transition-colors",
        className,
      )}
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </button>
  );
}

/** @deprecated kept for import safety — use SidebarCollapseHeaderBtn */
export function SidebarCollapseEdgeBtn() {
  return null;
}

/** Footer control — compact, no heavy box */
export function SidebarCollapseToggle({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      className={cn(
        "hidden lg:flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium",
        "text-white/55 hover:text-white hover:bg-white/8 transition-colors cursor-pointer",
        collapsed && "justify-center px-2",
        className,
      )}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4 shrink-0" />
      ) : (
        <>
          <PanelLeftClose className="h-4 w-4 shrink-0" />
          <span className="truncate">Minimize</span>
        </>
      )}
    </button>
  );
}
