"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { sanitizeHelpHref } from "@/lib/help/engine";

type HelpLang = "en" | "hi" | "gu";

type ChatMsg = {
  id: string;
  role: "user" | "bot";
  text: string;
  title?: string;
  href?: string;
  links?: { href: string; label: string }[];
};

type Suggestion = { id: string; label: string; query: string };

export function HelpChatbot() {
  const t = useT();
  const { locale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [replyLang, setReplyLang] = useState<HelpLang>(locale === "gu" ? "gu" : "en");
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preferredLang: HelpLang = replyLang;

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const resetChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setInput("");
  }, []);

  // Keep chatbot bound to current login role — never reuse another panel's chat
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const role = d.user?.role ? String(d.user.role) : null;
        setSessionRole((prev) => {
          if (prev && role && prev !== role) {
            resetChat();
            setOpen(false);
          }
          return role;
        });
      })
      .catch(() => {
        if (alive) setSessionRole(null);
      });
    return () => {
      alive = false;
    };
  }, [pathname, resetChat]);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/help/chat?lang=${preferredLang}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.role && sessionRole && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
      setSuggestions(data.suggestions || []);
      setMessages([
        {
          id: "welcome",
          role: "bot",
          text: data.text,
          title: data.title,
          href: sanitizeHelpHref(data.href, data.role || sessionRole),
        },
      ]);
    } catch {
      /* ignore */
    }
  }, [preferredLang, sessionRole, resetChat]);

  useEffect(() => {
    if (open && messages.length === 0) void bootstrap();
  }, [open, messages.length, bootstrap]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 180);
      scrollBottom();
    }
  }, [open, messages, loading]);

  // Lock body scroll when side panel is open (touch / mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Hide on public pages
  if (pathname === "/login" || pathname === "/" || pathname.startsWith("/m/")) {
    return null;
  }

  const ask = async (raw: string) => {
    const message = raw.trim();
    if (!message || loading) return;
    setInput("");
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang: preferredLang }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "bot",
            text: data.error || t("helpBot.error"),
          },
        ]);
        return;
      }
      const role = String(data.role || sessionRole || "");
      if (sessionRole && data.role && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
      if (data.lang === "en" || data.lang === "hi" || data.lang === "gu") {
        setReplyLang(data.lang);
      }
      setSuggestions(data.suggestions || []);
      const links = Array.isArray(data.links)
        ? data.links
            .map((l: { href: string; label: string }) => {
              const h = sanitizeHelpHref(l.href, role);
              return h ? { href: h, label: l.label } : null;
            })
            .filter((x: { href: string; label: string } | null): x is { href: string; label: string } => Boolean(x))
        : undefined;
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data.text,
          title: data.title,
          href: sanitizeHelpHref(data.href, role),
          links,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "bot", text: t("helpBot.error") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fixed right-edge HELP tab — text only, opens chatbot */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "help-side-tab fixed right-0 top-1/2 z-[90] -translate-y-1/2 touch-manipulation",
          "flex min-h-[5.5rem] min-w-[2.25rem] flex-col items-center justify-center",
          "rounded-l-md border border-r-0 border-neutral-700 bg-neutral-900",
          "px-2 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
          "transition-colors duration-200 hover:bg-black active:bg-neutral-950",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          open && "pointer-events-none translate-x-full opacity-0"
        )}
        aria-label={t("helpBot.open")}
        title={t("helpBot.open")}
      >
        <span
          className="select-none font-bold uppercase text-amber-400"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            letterSpacing: "0.2em",
            fontSize: "11px",
          }}
        >
          HELP
        </span>
      </button>

      {/* Backdrop — tap to close */}
      <div
        className={cn(
          "fixed inset-0 z-[94] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Right-side vertical drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[95] flex w-full max-w-[100vw] flex-col bg-white",
          "border-l border-slate-200/90 shadow-2xl shadow-slate-900/25",
          "sm:max-w-[400px] md:max-w-[420px]",
          "transition-transform duration-300 ease-out",
          "help-bot-panel",
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t("helpBot.title")}
        aria-hidden={!open}
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-900 to-sky-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight sm:text-[15px]">{t("helpBot.title")}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-cyan-100/90">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t("helpBot.subtitle")}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-white/85 hover:bg-white/10 hover:text-white active:bg-white/15"
              aria-label={t("common.cancel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3 flex gap-1 rounded-xl bg-black/20 p-1">
            {(["en", "hi", "gu"] as HelpLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setReplyLang(l);
                  setMessages([]);
                }}
                className={cn(
                  "min-h-10 flex-1 touch-manipulation rounded-lg px-1 py-2 text-[11px] font-bold transition-colors sm:text-xs",
                  preferredLang === l
                    ? "bg-white text-slate-900 shadow"
                    : "text-white/75 hover:bg-white/10 hover:text-white active:bg-white/15"
                )}
              >
                {l === "en" ? "English" : l === "hi" ? "हिंदी" : "ગુજરાતી"}
              </button>
            ))}
          </div>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/90 px-3 py-3 [-webkit-overflow-scrolling:touch]"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "rounded-br-md bg-cyan-700 text-white"
                    : "rounded-bl-md border border-slate-200/80 bg-white text-slate-700"
                )}
              >
                {m.role === "bot" && m.title && (
                  <p className="mb-1 text-xs font-bold text-cyan-800">{m.title}</p>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.role === "bot" && (m.href || (m.links && m.links.length > 0)) && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.href && (
                      <Link
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex min-h-9 touch-manipulation items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-200 hover:bg-cyan-100 active:bg-cyan-100"
                      >
                        {t("helpBot.openPage")}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {m.links?.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="inline-flex min-h-9 touch-manipulation items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200/80 active:bg-slate-200"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500 shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
                {t("helpBot.thinking")}
              </div>
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("helpBot.suggestions")}
            </p>
            <div className="flex flex-col gap-2">
              {suggestions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void ask(s.query)}
                  className="min-h-11 w-full touch-manipulation rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-left text-xs font-semibold text-cyan-900 hover:bg-cyan-100 active:bg-cyan-100 disabled:opacity-50 sm:text-[13px]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="shrink-0 border-t border-slate-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("helpBot.placeholder")}
              className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-base text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
              disabled={loading}
              maxLength={500}
              enterKeyHint="send"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-cyan-700 text-white hover:bg-cyan-800 active:bg-cyan-900 disabled:opacity-40"
              aria-label={t("helpBot.send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-slate-400">{t("helpBot.hint")}</p>
        </form>
      </aside>
    </>
  );
}
