"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/loader";
import { ExamStaffIdCard } from "@/components/id-cards/exam-staff-id-card";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { CreditCard, ShieldAlert } from "lucide-react";
import { Suspense } from "react";

type PublicExamPayload = {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameGu?: string | null;
    lastNameGu?: string | null;
    employeeId?: string | null;
    designation: string;
    department?: string | null;
    mobileNumber: string;
    hasPhoto?: boolean;
  };
  settings: {
    schoolName?: string | null;
    schoolAddress?: string | null;
    schoolPhone?: string | null;
    tagline?: string | null;
    academicYear?: string | null;
    idCardWebsite?: string | null;
  };
  school?: {
    name: string;
    address?: string | null;
    district?: string | null;
    phone?: string | null;
    code?: string | null;
  } | null;
  website?: string | null;
  photoUrl?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
};

function PublicExamIdInner() {
  const params = useParams();
  const search = useSearchParams();
  const staffId = String(params.staffId || "");
  const [data, setData] = useState<PublicExamPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const meta = useMemo(
    () => ({
      examTitle: search.get("t") || "School Examination",
      examSession: search.get("s") || undefined,
      academicYear: search.get("y") || undefined,
      roleLabel: search.get("r") || "EXAMINER / INVIGILATOR",
    }),
    [search],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/exam-id-cards/public/${encodeURIComponent(staffId)}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error || "Exam ID not found");
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Could not load exam ID");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-900">Exam ID not found</h1>
        <p className="max-w-sm text-sm text-slate-500">{error || "This link is invalid."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 px-3 py-8 sm:px-4">
      <div className="mx-auto mb-5 max-w-lg text-center text-white/90">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <CreditCard className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300/90">
          Examination ID
        </p>
        <h1 className="mt-1 truncate text-base font-bold sm:text-lg">
          {data.settings.schoolName || data.school?.name}
        </h1>
      </div>

      <div className="mx-auto flex w-full max-w-[26rem] justify-center overflow-x-auto">
        <div className="rounded-2xl bg-white/5 p-3 shadow-2xl ring-1 ring-white/10 sm:p-4">
          <ExamStaffIdCard
            staff={data.staff}
            school={data.school}
            settings={data.settings}
            meta={{
              ...meta,
              academicYear: meta.academicYear || data.settings.academicYear || undefined,
            }}
            photoUrl={data.photoUrl || undefined}
            logoUrl={data.logoUrl || SCHOOL_LOGO_URL}
            signatureUrl={data.signatureUrl || undefined}
            website={data.website}
          />
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-sm text-center text-[11px] leading-relaxed text-white/45">
        Official examination duty identity · No login required
      </p>
    </div>
  );
}

export default function PublicExamIdPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-950">
          <Spinner size="lg" />
        </div>
      }
    >
      <PublicExamIdInner />
    </Suspense>
  );
}
