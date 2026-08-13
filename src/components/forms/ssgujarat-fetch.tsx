"use client";

import { Spinner } from "@/components/ui/loader";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronDown, ClipboardPaste, Download, X } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import type { Student } from "@/generated/prisma/client";
import type { SsgujaratStudentRecord } from "@/lib/ssgujarat/types";
import { detectSsgujaratSearchType } from "@/lib/ssgujarat/id-utils";
import { mergeStudentPartials } from "@/lib/ssgujarat/map-to-student";
import { isSsgMessageCode, SSG_MSG, SSG_MSG_I18N } from "@/lib/ssgujarat/message-codes";
import { cn } from "@/lib/utils";

type StudentPartial = Partial<Student>;

function looksLikeBrowserCrash(raw: string) {
  return (
    raw.includes("browserType.launch") ||
    raw.includes("libatk") ||
    raw.includes("shared libraries") ||
    raw.includes("Call log:") ||
    raw.includes("Target page, context or browser has been closed")
  );
}

function resolveSsgText(
  raw: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
  params?: Record<string, string | number>,
): string {
  if (!raw) return "";
  if (looksLikeBrowserCrash(raw)) return t(SSG_MSG_I18N[SSG_MSG.BROWSER_UNAVAILABLE], params);
  if (isSsgMessageCode(raw)) return t(SSG_MSG_I18N[raw], params);
  return raw;
}

/** Never auto-treat GR draft placeholders as a real search ID */
function isGrDraftAadhaar(value: string) {
  const clean = value.replace(/\s/g, "");
  // Only the synthetic pattern used by stableDraftAadhaarFromGr / generateDraftAadhaar
  // is blocked from being *auto-copied*; user may still type a real ID starting with 8/9.
  return /^9\d{11}$/.test(clean);
}

interface SsgujaratFetchProps {
  aadhaarNumber?: string;
  childUid?: string;
  onApply: (data: StudentPartial) => void;
}

export function SsgujaratFetch({ onApply }: SsgujaratFetchProps) {
  const t = useT();
  // Always start empty — do not pull draft/default Aadhaar into this box
  const [searchId, setSearchId] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<SsgujaratStudentRecord[]>([]);
  const [mapped, setMapped] = useState<StudentPartial[]>([]);
  const [message, setMessage] = useState("");
  const [appliedName, setAppliedName] = useState("");
  /** Paste unlocked after successful online fetch; open controls expand/collapse */
  const [pasteUnlocked, setPasteUnlocked] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [lastFetchedPartial, setLastFetchedPartial] = useState<StudentPartial | null>(null);

  const searchType = detectSsgujaratSearchType(searchId);

  const searchTypeLabel =
    searchType === "aadhaar"
      ? t("ssg.searchTypeAadhaar")
      : searchType === "childUid"
        ? t("ssg.searchTypeChildUid")
        : t("ssg.searchTypeHint");

  const loadFullProfile = async (uid: string, aadhaar?: string) => {
    const res = await fetch("/api/ssgujarat/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchId: uid }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(resolveSsgText(data.error, t) || t("ssg.profileFetchFailed"));
    const mappedStudent = data.mappedStudents?.[0] as StudentPartial | undefined;
    if (!mappedStudent) throw new Error(t("ssg.profileNotFound"));
    if (aadhaar && /^\d{12}$/.test(aadhaar) && !isGrDraftAadhaar(aadhaar)) {
      mappedStudent.aadhaarNumber = aadhaar;
    }
    return mappedStudent;
  };

  const fillForm = (data: StudentPartial) => {
    if (!data || Object.keys(data).length === 0) {
      setError(t("ssg.fetchFirstOrPaste"));
      return false;
    }
    onApply(data);
    const name = [data.firstName, data.middleName, data.surname].filter(Boolean).join(" ");
    setAppliedName(name || data.aadhaarName || t("ssg.dataApplied"));
    setLastFetchedPartial(data);
    setRecords([]);
    setMapped([]);
    setMessage("");
    setError("");
    setPasteUnlocked(true);
    setPasteOpen(true);
    return true;
  };

  const fetchFromSsg = async () => {
    const clean = searchId.replace(/\s/g, "");
    if (!detectSsgujaratSearchType(clean)) {
      setError(t("ssg.invalidSearchId"));
      return;
    }

    setLoading(true);
    setError("");
    setRecords([]);
    setMapped([]);
    setMessage("");
    setAppliedName("");

    try {
      const res = await fetch("/api/ssgujarat/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(resolveSsgText(data.error, t) || t("ssg.fetchFailed"));
      if (!data.records?.length) {
        setError(resolveSsgText(data.message, t) || t("ssg.noStudentFound"));
        return;
      }

      const list = (data.records || []) as SsgujaratStudentRecord[];
      const mappedList = (data.mappedStudents || []) as StudentPartial[];

      setPasteUnlocked(true);
      setPasteOpen(true);

      if (list.length === 1) {
        let student = mappedList[0] || {};
        const base = list[0];
        if (base?.childUid?.length === 18) {
          student = await loadFullProfile(
            base.childUid,
            /^\d{12}$/.test(clean) ? clean : undefined,
          );
        } else if (/^\d{18}$/.test(clean)) {
          student = await loadFullProfile(clean);
        }
        fillForm(student);
        return;
      }

      setRecords(list);
      setMapped(mappedList);
      setLastFetchedPartial(mappedList[0] || null);
      setMessage(
        resolveSsgText(data.message, t, { count: data.matchCount || list.length }) || "",
      );
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(raw ? resolveSsgText(raw, t) || t("ssg.fetchFailed") : t("ssg.fetchFailed"));
      if (!raw || looksLikeBrowserCrash(raw) || raw === SSG_MSG.BROWSER_UNAVAILABLE) {
        setPasteUnlocked(true);
        setPasteOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const pickRecord = async (index: number) => {
    const base = records[index];
    let student = mapped[index] || {};
    setLoading(true);
    setError("");
    setAppliedName("");
    try {
      if (base?.childUid?.length === 18) {
        student = await loadFullProfile(
          base.childUid,
          /^\d{12}$/.test(searchId.replace(/\s/g, "")) &&
            !isGrDraftAadhaar(searchId)
            ? searchId.replace(/\s/g, "")
            : undefined,
        );
      }
      fillForm(student);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ssg.profileLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const parseAndFillPaste = async () => {
    if (pasteText.trim().length < 50) {
      setError(t("ssg.pasteTooShort"));
      return;
    }
    setLoading(true);
    setError("");
    setAppliedName("");
    try {
      const res = await fetch("/api/ssgujarat/parse-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(resolveSsgText(data.error, t) || t("ssg.parseFailed"));
      const pasted = data.mapped as StudentPartial;
      const merged = mergeStudentPartials(lastFetchedPartial || {}, pasted || {});
      fillForm(merged);
      setPasteText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ssg.parseFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold text-emerald-900">{t("ssg.fullImportTitle")}</p>
          <p className="mt-0.5 text-xs text-emerald-700">{t("ssg.methodHint")}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 w-full flex-1">
            <Input
              label={t("ssg.aadhaarOrUid")}
              placeholder={t("ssg.aadhaarOrUidPlaceholder")}
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value.replace(/\s/g, ""));
                setAppliedName("");
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void fetchFromSsg();
                }
              }}
              maxLength={18}
              autoComplete="off"
            />
            {searchId ? (
              <p className="mt-1 text-xs text-emerald-800">{searchTypeLabel}</p>
            ) : (
              <p className="mt-1 text-xs text-emerald-700/80">{t("ssg.searchEmptyHint")}</p>
            )}
          </div>
          <Button
            type="button"
            variant="success"
            className="h-10 w-full cursor-pointer sm:w-auto"
            onClick={() => void fetchFromSsg()}
            disabled={loading || !searchType}
          >
            {loading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
            {t("ssg.fetchOnline")}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50">
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition",
            pasteUnlocked ? "cursor-pointer hover:bg-blue-100/50" : "cursor-default opacity-85",
            pasteOpen && pasteUnlocked && "border-b border-blue-200",
          )}
          onClick={() => {
            if (!pasteUnlocked) return;
            setPasteOpen((v) => !v);
          }}
          aria-expanded={pasteOpen && pasteUnlocked}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ClipboardPaste className="h-4 w-4 shrink-0 text-blue-800" />
            <span>
              <span className="block text-sm font-semibold text-blue-900">
                {t("ssg.schoolDataPaste")}
              </span>
              <span className="block text-xs text-blue-700">
                {pasteUnlocked ? t("ssg.pasteHint") : t("ssg.pasteLockedHint")}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-blue-700 transition-transform",
              pasteOpen && pasteUnlocked && "rotate-180",
              !pasteUnlocked && "opacity-40",
            )}
          />
        </button>

        {pasteUnlocked && pasteOpen && (
          <div className="space-y-3 px-4 py-3">
            <Textarea
              rows={5}
              placeholder={t("ssg.pastePlaceholder")}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setAppliedName("");
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 cursor-pointer"
              disabled={loading || pasteText.trim().length < 50}
              onClick={() => void parseAndFillPaste()}
            >
              {loading ? <Spinner size="sm" /> : <ClipboardPaste className="h-4 w-4" />}
              {t("ssg.parseAndFill")}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {appliedName && !error && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{t("ssg.filledIntoForm")}</p>
            <p className="text-xs text-emerald-700">
              {t("ssg.filledStudentName", { name: appliedName })}
            </p>
          </div>
        </div>
      )}

      {message && records.length > 1 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </p>
      )}

      {records.length > 1 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
            <p className="text-sm font-medium">{t("ssg.multipleStudents")}</p>
            <button
              type="button"
              onClick={() => {
                setRecords([]);
                setMapped([]);
                setMessage("");
              }}
              className="cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-64 divide-y overflow-y-auto">
            {records.map((r, i) => (
              <div
                key={`${r.childUid}-${i}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"
              >
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">
                    {r.studentName} {r.surname}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {t("ssg.dobClass", {
                      dob: r.dateOfBirth || "—",
                      class: r.studyingClass,
                      school: r.schoolName,
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => void pickRecord(i)}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : t("ssg.fillForm")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
