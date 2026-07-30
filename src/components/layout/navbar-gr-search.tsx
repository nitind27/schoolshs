"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  ClipboardList,
  Hash,
  Loader2,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";

type Hit = {
  id: string;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  grNumber?: string | null;
  standard?: string | null;
  section?: string | null;
  rollNumber?: string | null;
  classId?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  category?: string | null;
  caste?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  status?: string | null;
  sscSeatPrefix?: string | null;
  sscSeatNumber?: string | null;
  hscSeatPrefix?: string | null;
  hscSeatNumber?: string | null;
  schoolClass?: {
    id: string;
    name: string;
    standard: string;
    section: string;
  } | null;
};

function displayName(s: Hit) {
  return (
    [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

function classLabel(s: Hit) {
  if (s.standard && s.section) return `${s.standard}-${s.section}`;
  return s.standard || s.section || "";
}

function mergeHits(exact: Hit | null, list: Hit[]): Hit[] {
  const byId = new Map<string, Hit>();
  if (exact?.id) byId.set(exact.id, exact);
  for (const s of list) {
    if (s?.id && !byId.has(s.id)) byId.set(s.id, s);
  }
  return Array.from(byId.values()).slice(0, 8);
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

export function NavbarGrSearch({
  scope = "school",
}: {
  scope?: "school" | "teacher";
}) {
  const t = useT();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [selected, setSelected] = useState<Hit | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const searchStudents = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setHits([]);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++reqSeq.current;
      setLoading(true);

      try {
        if (scope === "teacher") {
          const response = await fetch(
            `/api/teacher/students/search?grNumber=${encodeURIComponent(trimmed)}`,
            { cache: "no-store", signal: ac.signal },
          );
          const data = await response.json();
          if (seq !== reqSeq.current) return;
          if (!response.ok) throw new Error(data.error || "Search failed");
          setHits(Array.isArray(data.students) ? data.students : []);
          setOpen(true);
          return;
        }

        const [lookupRes, listRes] = await Promise.all([
          fetch(
            `/api/students/lookup-gr?grNumber=${encodeURIComponent(trimmed)}`,
            {
              cache: "no-store",
              signal: ac.signal,
            },
          ),
          fetch(`/api/students?search=${encodeURIComponent(trimmed)}&limit=8`, {
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        if (seq !== reqSeq.current) return;

        let exact: Hit | null = null;
        if (lookupRes.ok) {
          const lookup = await lookupRes.json();
          if (lookup?.student?.id) {
            exact = lookup.student as Hit;
          }
        }

        let list: Hit[] = [];
        if (listRes.ok) {
          const data = await listRes.json();
          list = Array.isArray(data.students) ? data.students : [];
        }

        if (seq !== reqSeq.current) return;

        const merged = mergeHits(exact, list);
        setHits(merged);
        setOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (seq !== reqSeq.current) return;
        setHits([]);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => {
        if (!q.trim()) {
          abortRef.current?.abort();
          reqSeq.current += 1;
          setHits([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        void searchStudents(q);
      },
      q.trim() ? 220 : 0,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, searchStudents]);

  const openStudent = (student: Hit) => {
    abortRef.current?.abort();
    setOpen(false);
    setQ("");
    setHits([]);
    if (scope === "teacher") {
      setSelected(student);
      return;
    }
    router.push(`/students/${student.id}/analysis`);
  };

  const submitExact = async () => {
    const gr = q.trim();
    if (!gr) {
      inputRef.current?.focus();
      return;
    }

    // Prefer already-loaded hits for instant open
    if (hits.length === 1) {
      openStudent(hits[0]);
      return;
    }

    setLoading(true);
    try {
      if (scope === "teacher") {
        const response = await fetch(
          `/api/teacher/students/search?grNumber=${encodeURIComponent(gr)}`,
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t("navSearch.failed"));
        const list: Hit[] = Array.isArray(data.students) ? data.students : [];
        const exact = list.find(
          (student) =>
            String(student.grNumber || "").toLowerCase() === gr.toLowerCase(),
        );
        if (exact || list.length === 1) {
          openStudent(exact || list[0]);
          return;
        }
        if (list.length > 1) {
          setHits(list);
          setOpen(true);
          return;
        }
        toast.push({
          title: t("navSearch.notFound"),
          description: t("navSearch.notFoundDesc", { gr }),
          variant: "warning",
          duration: 4000,
        });
        return;
      }

      const res = await fetch(
        `/api/students/lookup-gr?grNumber=${encodeURIComponent(gr)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("navSearch.failed"));

      if (data.student?.id) {
        openStudent(data.student);
        return;
      }

      // Fallback: refresh search list once
      await searchStudents(gr);
      // searchStudents updates hits async — re-fetch for submit path
      const listRes = await fetch(
        `/api/students?search=${encodeURIComponent(gr)}&limit=8`,
        {
          cache: "no-store",
        },
      );
      const listData = listRes.ok ? await listRes.json() : { students: [] };
      const list: Hit[] = Array.isArray(listData.students)
        ? listData.students
        : [];

      if (list.length === 1) {
        openStudent(list[0]);
        return;
      }

      if (list.length > 1) {
        setHits(list);
        setOpen(true);
        toast.push({
          title: t("navSearch.pickStudent"),
          description: t("navSearch.pickStudentDesc"),
          variant: "info",
          duration: 3500,
        });
        return;
      }

      toast.push({
        title: t("navSearch.notFound"),
        description: t("navSearch.notFoundDesc", { gr }),
        variant: "warning",
        duration: 4000,
      });
      setHits([]);
      setOpen(true);
    } catch {
      toast.error(t("navSearch.failed"));
    } finally {
      setLoading(false);
    }
  };

  const selectedClassId = selected?.schoolClass?.id || selected?.classId || "";
  const selectedStandard =
    selected?.schoolClass?.standard || selected?.standard || "";
  const selectedSection =
    selected?.schoolClass?.section || selected?.section || "";
  const selectedBoardSeat =
    selectedStandard === "12"
      ? [selected?.hscSeatPrefix, selected?.hscSeatNumber]
          .filter(Boolean)
          .join(" ")
      : selectedStandard === "10"
        ? [selected?.sscSeatPrefix, selected?.sscSeatNumber]
            .filter(Boolean)
            .join(" ")
        : "";

  return (
    <div className="tn-gr-search" ref={rootRef}>
      <form
        className="tn-gr-search__form"
        onSubmit={(e) => {
          e.preventDefault();
          void submitExact();
        }}
        role="search"
      >
        <Search className="tn-gr-search__icon h-3.5 w-3.5" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (q.trim() || hits.length) setOpen(true);
          }}
          placeholder={t(
            scope === "teacher"
              ? "navSearch.teacherPlaceholder"
              : "navSearch.placeholder",
          )}
          aria-label={t("navSearch.aria")}
          className="tn-gr-search__input"
          autoComplete="off"
        />
        {q ? (
          <button
            type="button"
            className="tn-gr-search__clear"
            aria-label={t("common.clear")}
            onClick={() => {
              setQ("");
              setHits([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="submit"
          className="tn-gr-search__go"
          disabled={loading}
          aria-label={t("navSearch.search")}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </button>
      </form>

      {open && q.trim() ? (
        <div className="tn-gr-search__menu" role="listbox">
          {loading && hits.length === 0 ? (
            <div className="tn-gr-search__empty">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              <span>{t("navSearch.searching")}</span>
            </div>
          ) : hits.length === 0 ? (
            <div className="tn-gr-search__empty">
              {t("navSearch.noMatches")}
            </div>
          ) : (
            hits.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected="false"
                className="tn-gr-search__hit"
                onClick={() => openStudent(s)}
              >
                <span className="tn-gr-search__hit-avatar">
                  <UserRound className="h-3.5 w-3.5" />
                </span>
                <span className="tn-gr-search__hit-body">
                  <span className="tn-gr-search__hit-name">
                    {displayName(s)}
                  </span>
                  <span className="tn-gr-search__hit-meta">
                    {s.grNumber ? `GR ${s.grNumber}` : t("navSearch.noGr")}
                    {classLabel(s) ? ` · ${classLabel(s)}` : ""}
                    {s.rollNumber ? ` · Roll ${s.rollNumber}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
          <div className={cn("tn-gr-search__hint")}>
            {t(
              scope === "teacher" ? "navSearch.teacherHint" : "navSearch.hint",
            )}
          </div>
        </div>
      ) : null}

      <InfoModal
        isOpen={scope === "teacher" && selected != null}
        onClose={() => setSelected(null)}
        title={
          selected ? displayName(selected) : t("teacherPortal.studentDetails")
        }
        size="wide"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    {displayName(selected)}
                  </p>
                  <p className="text-xs text-slate-600">
                    GR {selected.grNumber || "—"} ·{" "}
                    {selected.schoolClass?.name ||
                      [selectedStandard, selectedSection]
                        .filter(Boolean)
                        .join("-") ||
                      "—"}
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800">
                {selected.status || "—"}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                label={t("fields.grNumber")}
                value={selected.grNumber}
              />
              <DetailItem
                label={t("fields.roll")}
                value={selected.rollNumber}
              />
              <DetailItem
                label={t("nav.classes")}
                value={
                  selected.schoolClass?.name ||
                  [selectedStandard, selectedSection].filter(Boolean).join("-")
                }
              />
              <DetailItem
                label={t("fields.dateOfBirth")}
                value={
                  selected.dateOfBirth
                    ? new Date(selected.dateOfBirth).toLocaleDateString()
                    : null
                }
              />
              <DetailItem label={t("fields.gender")} value={selected.gender} />
              <DetailItem
                label={t("fields.mobile")}
                value={selected.mobileNumber}
              />
              <DetailItem
                label={t("fields.fatherName")}
                value={selected.fatherName}
              />
              <DetailItem
                label={t("fields.motherName")}
                value={selected.motherName}
              />
              <DetailItem
                label={t("fields.category")}
                value={[selected.category, selected.caste]
                  .filter(Boolean)
                  .join(" / ")}
              />
              {["10", "12"].includes(selectedStandard) ? (
                <DetailItem
                  label={t("teacherPortal.boardSeatNumber")}
                  value={selectedBoardSeat}
                />
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("teacherPortal.allowedActions")}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedClassId ? (
                  <>
                    <Link
                      href={`/teacher/attendance?classId=${selectedClassId}`}
                      onClick={() => setSelected(null)}
                    >
                      <Button size="sm">
                        <ClipboardList className="h-4 w-4" />
                        {t("teacherNav.attendance")}
                      </Button>
                    </Link>
                    <Link
                      href={`/results/term?classId=${selectedClassId}`}
                      onClick={() => setSelected(null)}
                    >
                      <Button size="sm" variant="outline">
                        <Award className="h-4 w-4" />
                        {t("teacherPortal.enterMarks")}
                      </Button>
                    </Link>
                    <Link
                      href={`/teacher/roll-numbers?classId=${selectedClassId}`}
                      onClick={() => setSelected(null)}
                    >
                      <Button size="sm" variant="outline">
                        <Hash className="h-4 w-4" />
                        {t("teacherNav.rollNumbers")}
                      </Button>
                    </Link>
                  </>
                ) : null}
                {selectedClassId && ["10", "12"].includes(selectedStandard) ? (
                  <Link
                    href={`/teacher/board-records?std=${selectedStandard}&view=entry&classId=${selectedClassId}`}
                    onClick={() => setSelected(null)}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-violet-200 text-violet-700"
                    >
                      <Hash className="h-4 w-4" />
                      {t("teacherPortal.boardSeatNumber")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </InfoModal>
    </div>
  );
}
