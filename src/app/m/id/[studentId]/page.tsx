"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/loader";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import type { SchoolSettings, Student } from "@/generated/prisma/client";
import "@/components/id-cards/student-id-card.css";
import { CreditCard, ShieldAlert } from "lucide-react";

type PublicPayload = {
  student: Student & {
    schoolClass?: { name: string; standard: string; section: string; academicYear?: string } | null;
  };
  settings: SchoolSettings;
  diseCode?: string;
  photoUrl?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  website?: string | null;
};

export default function PublicStudentIdPage() {
  const params = useParams();
  const studentId = String(params.studentId || "");
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/id-cards/public/${encodeURIComponent(studentId)}`);
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(json.error || "ID card not found");
          return;
        }
        if (!cancelled) {
          setData({
            student: json.student,
            settings: json.settings,
            diseCode: json.diseCode,
            photoUrl: json.photoUrl,
            logoUrl: json.logoUrl,
            signatureUrl: json.signatureUrl,
            website: json.website,
          });
        }
      } catch {
        if (!cancelled) setError("Could not load ID card");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

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
        <h1 className="text-lg font-bold text-slate-900">ID card not found</h1>
        <p className="max-w-sm text-sm text-slate-500">{error || "This link is invalid."}</p>
      </div>
    );
  }

  const year = data.student.schoolClass?.academicYear || data.settings.academicYear;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto mb-5 max-w-md text-center text-white/90">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <CreditCard className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300/90">Student ID Card</p>
        <h1 className="mt-1 truncate text-base font-bold sm:text-lg">{data.settings.schoolName}</h1>
      </div>

      <div className="mx-auto flex w-full max-w-[22rem] justify-center">
        <div className="w-full rounded-2xl bg-white/5 p-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
          <div className="flex justify-center overflow-x-auto">
            <StudentIdCard
              student={data.student}
              settings={data.settings}
              photoUrl={data.photoUrl || undefined}
              logoUrl={data.logoUrl || SCHOOL_LOGO_URL}
              signatureUrl={data.signatureUrl || undefined}
              diseCode={data.diseCode}
              academicYear={year}
              website={data.website}
            />
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-sm text-center text-[11px] leading-relaxed text-white/45">
        Official digital student identity · No login required
      </p>
    </div>
  );
}
