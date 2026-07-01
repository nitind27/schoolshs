"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Download, Loader2, X } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import type { Student } from "@/generated/prisma/client";
import type { SsgujaratStudentRecord } from "@/lib/ssgujarat/types";
import { detectSsgujaratSearchType } from "@/lib/ssgujarat/id-utils";
import { mergeStudentPartials } from "@/lib/ssgujarat/map-to-student";

type StudentPartial = Partial<Student>;

interface SsgujaratFetchProps {
  aadhaarNumber?: string;
  childUid?: string;
  onApply: (data: StudentPartial) => void;
}

function MappedPreview({
  mapped,
  t,
}: {
  mapped: StudentPartial;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const rows = [
    [t("common.name"), [mapped.firstName, mapped.middleName, mapped.surname].filter(Boolean).join(" ")],
    [t("fields.aadhaarName"), mapped.aadhaarName],
    [t("fields.aadhaar"), mapped.aadhaarNumber],
    [t("fields.dob"), mapped.dateOfBirth],
    [t("fields.gender"), mapped.gender],
    [t("fields.religion"), mapped.religion],
    [t("fields.category"), mapped.category],
    [t("ssg.fatherMother"), `${mapped.fatherName || ""} / ${mapped.motherName || ""}`],
    [t("fields.mobile"), mapped.mobileNumber],
    [t("fields.email"), mapped.email],
    [t("common.address"), mapped.currentAddress],
    [t("fields.currentPincode"), mapped.currentPincode],
    [t("ssg.classSchool"), `${mapped.courseName || ""} · ${mapped.institutionName || ""}`],
    [t("common.district"), mapped.currentDistrict],
    [t("fields.bank"), mapped.bankName],
    [t("fields.account"), mapped.accountNumber],
    [t("fields.ifscCode"), mapped.ifscCode],
    [t("common.scholarship"), mapped.scholarshipScheme],
  ].filter((row) => row[1]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white border border-slate-200 rounded-lg p-3 max-h-72 overflow-y-auto">
      {rows.map(([label, value]) => (
        <div key={String(label)} className="flex gap-2 py-0.5">
          <span className="text-slate-500 shrink-0 w-28">{label}:</span>
          <span className="text-slate-800 font-medium break-all">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SsgujaratFetch({ aadhaarNumber = "", childUid = "", onApply }: SsgujaratFetchProps) {
  const t = useT();
  const [searchId, setSearchId] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<SsgujaratStudentRecord[]>([]);
  const [mapped, setMapped] = useState<StudentPartial[]>([]);
  const [pasteMapped, setPasteMapped] = useState<StudentPartial | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const clean = aadhaarNumber.replace(/\s/g, "");
    const uid = childUid.replace(/\s/g, "");
    if (/^\d{18}$/.test(uid)) setSearchId(uid);
    else if (/^\d{12}$/.test(clean)) setSearchId(clean);
  }, [aadhaarNumber, childUid]);

  const searchType = detectSsgujaratSearchType(searchId);

  const searchTypeLabel =
    searchType === "aadhaar"
      ? t("ssg.searchTypeAadhaar")
      : searchType === "childUid"
        ? t("ssg.searchTypeChildUid")
        : t("ssg.searchTypeHint");

  const loadFullProfile = async (childUid: string, aadhaar?: string) => {
    const res = await fetch("/api/ssgujarat/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchId: childUid }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("ssg.profileFetchFailed"));
    const mappedStudent = data.mappedStudents?.[0] as StudentPartial | undefined;
    if (!mappedStudent) throw new Error(t("ssg.profileNotFound"));
    if (aadhaar && /^\d{12}$/.test(aadhaar)) mappedStudent.aadhaarNumber = aadhaar;
    return mappedStudent;
  };

  const parsePaste = async () => {
    if (pasteText.trim().length < 50) {
      setError(t("ssg.pasteTooShort"));
      return null;
    }
    const res = await fetch("/api/ssgujarat/parse-paste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pasteText }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("ssg.parseFailed"));
    setPasteMapped(data.mapped);
    return data.mapped as StudentPartial;
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

    try {
      const res = await fetch("/api/ssgujarat/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("ssg.fetchFailed"));
      if (!data.records?.length) {
        setError(data.message || t("ssg.noStudentFound"));
        return;
      }
      setRecords(data.records);
      setMapped(data.mappedStudents || []);
      setMessage(data.message || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ssg.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const applyAll = async (fetchMapped?: StudentPartial) => {
    setLoading(true);
    setError("");
    try {
      let result = fetchMapped || {};
      if (pasteText.trim().length >= 50) {
        const pasted = pasteMapped || (await parsePaste());
        if (pasted) result = mergeStudentPartials(result, pasted);
      }
      if (Object.keys(result).length === 0) {
        setError(t("ssg.fetchFirstOrPaste"));
        return;
      }
      onApply(result);
      setRecords([]);
      setMapped([]);
      setPasteMapped(null);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ssg.applyFailed"));
    } finally {
      setLoading(false);
    }
  };

  const pickRecord = async (index: number) => {
    const base = records[index];
    let student = mapped[index] || {};
    setLoading(true);
    setError("");
    try {
      if (base?.childUid?.length === 18) {
        student = await loadFullProfile(
          base.childUid,
          /^\d{12}$/.test(searchId.replace(/\s/g, "")) ? searchId.replace(/\s/g, "") : undefined
        );
      }
      await applyAll(student);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ssg.profileLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const previewMapped = mergeStudentPartials(
    mapped[0] || {},
    pasteMapped || {}
  );

  const hasPreview = Boolean(mapped[0] || pasteMapped);

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 space-y-3">
        <div>
          <p className="text-sm font-semibold text-emerald-900">{t("ssg.fullImportTitle")}</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {t("ssg.methodHint")}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Input
              label={t("ssg.aadhaarOrUid")}
              placeholder={t("ssg.aadhaarOrUidPlaceholder")}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.replace(/\s/g, ""))}
              maxLength={18}
            />
            {searchId && (
              <p className="text-xs text-emerald-800 mt-1">{searchTypeLabel}</p>
            )}
          </div>
          <Button type="button" variant="success" onClick={fetchFromSsg} disabled={loading || !searchType}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t("ssg.fetchOnline")}
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
        <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4" />
          {t("ssg.schoolDataPaste")}
        </p>
        <p className="text-xs text-blue-700">
          {t("ssg.pasteHint")}
        </p>
        <Textarea
          rows={6}
          placeholder={t("ssg.pastePlaceholder")}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={loading || pasteText.trim().length < 50}
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              await parsePaste();
            } catch (e) {
              setError(e instanceof Error ? e.message : t("ssg.parseFailed"));
            } finally {
              setLoading(false);
            }
          }}
        >
          {t("ssg.parsePastedData")}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {message && records.length > 1 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{message}</p>
      )}

      {hasPreview && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">{t("ssg.previewAutofill")}</p>
          <MappedPreview mapped={previewMapped} t={t} />
          <div className="flex justify-end gap-2">
            {records.length === 1 && (
              <Button type="button" size="sm" variant="outline" onClick={() => pickRecord(0)} disabled={loading}>
                {t("ssg.mergeFetchPaste")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => applyAll(mapped[0])}
              disabled={loading}
            >
              {loading ? t("common.loading") : t("ssg.useThisData")}
            </Button>
          </div>
        </div>
      )}

      {records.length > 1 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
            <p className="text-sm font-medium">{t("ssg.multipleStudents")}</p>
            <button type="button" onClick={() => { setRecords([]); setMapped([]); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {records.map((r, i) => (
              <div key={`${r.childUid}-${i}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{r.studentName} {r.surname}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {t("ssg.dobClass", {
                      dob: r.dateOfBirth || "—",
                      class: r.studyingClass,
                      school: r.schoolName,
                    })}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => pickRecord(i)} disabled={loading}>
                  {t("common.select")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
