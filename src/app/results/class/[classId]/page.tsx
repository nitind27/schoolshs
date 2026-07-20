"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Award, Printer, Send, Users, CheckCircle2, Clock, AlertCircle, FileSpreadsheet,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { ExamTermDashboard, type TermStat } from "@/components/results/exam-term-dashboard";
import type { ExamTermKey } from "@/lib/results/exam-terms";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE, paginateSlice } from "@/lib/pagination";

type StudentRow = {
  id: string;
  firstName: string;
  surname: string;
  rollNumber?: string | null;
  marksStatus: "pending" | "partial" | "complete";
  marksFilled: number;
  totalSubjects: number;
  totalMarks?: number | null;
  percentage?: number | null;
  grade?: string | null;
  rank?: number | null;
  result?: string | null;
};

function StatusIcon({ status }: { status: StudentRow["marksStatus"] }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  if (status === "partial") return <Clock className="h-5 w-5 text-amber-500" />;
  return <AlertCircle className="h-5 w-5 text-slate-400" />;
}

export default function ResultsClassPage() {
  const t = useT();
  const { confirm, ConfirmDialog } = useConfirm();
  const params = useParams();
  const classId = params.classId as string;
  const [data, setData] = useState<{
    class: { id: string; name: string; standard: string; section: string; academicYear: string; studentCount: number };
    exam: { id: string; isPublished: boolean } | null;
    students: StudentRow[];
    stats: { total: number; complete: number; partial: number; pending: number; published: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [termStats, setTermStats] = useState<TermStat[]>([]);
  const [midExamCount, setMidExamCount] = useState<1 | 2>(2);
  const [busyTerm, setBusyTerm] = useState<ExamTermKey | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | StudentRow["marksStatus"]>("");
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    fetch(`/api/results/class-overview?classId=${classId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));

    fetch(`/api/results/term-marks?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.termStats) setTermStats(d.termStats);
        if (d.termMeta) setMidExamCount(d.termMeta.midExamCount);
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(["school_admin", "clerk"].includes(d.user?.role)))
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/results/class-overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure_session", classId }),
    })
      .then(() => load())
      .catch(() => load());
  }, [classId]);

  const publish = async () => {
    if (!data?.exam?.id) return;
    await confirm({
      title: t("common.confirm"),
      message: t("results.publishConfirm"),
      confirmLabel: t("common.confirm"),
      variant: "warning",
      onConfirm: async () => {
        setPublishing(true);
        const res = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish", examId: data.exam!.id }),
        });
        const payload = await res.json();
        setPublishing(false);
        if (!res.ok) {
          alert(payload.error || t("results.publishFailed"));
          return;
        }
        alert(t("results.publishedMsg"));
        load();
      },
    });
  };

  const unpublish = async () => {
    if (!data?.exam?.id) return;
    await confirm({
      title: t("common.confirm"),
      message: t("results.unpublishConfirm"),
      confirmLabel: t("common.confirm"),
      variant: "warning",
      onConfirm: async () => {
        setUnpublishing(true);
        await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unpublish", examId: data.exam!.id }),
        });
        setUnpublishing(false);
        load();
      },
    });
  };

  const publishTerm = async (term: ExamTermKey) => {
    if (!data?.exam?.id) return;
    await confirm({
      title: t("common.confirm"),
      message: t("examTerms.publishConfirm", { term: t(`examTerms.${term}`) }),
      confirmLabel: t("common.confirm"),
      variant: "warning",
      onConfirm: async () => {
        setBusyTerm(term);
        await fetch("/api/results/term-marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish_term", examId: data.exam!.id, classId, term }),
        });
        setBusyTerm(null);
        load();
      },
    });
  };

  const unpublishTerm = async (term: ExamTermKey) => {
    if (!data?.exam?.id) return;
    setBusyTerm(term);
    await fetch("/api/results/term-marks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish_term", examId: data.exam!.id, classId, term }),
    });
    setBusyTerm(null);
    load();
  };

  const students = data?.students ?? [];

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((st) => {
      if (status && st.marksStatus !== status) return false;
      if (!q) return true;
      return (
        st.firstName.toLowerCase().includes(q) ||
        st.surname.toLowerCase().includes(q) ||
        (st.rollNumber || "").toLowerCase().includes(q)
      );
    });
  }, [students, search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const pagedStudents = useMemo(
    () => paginateSlice(filteredStudents, page, PAGE_SIZE),
    [filteredStudents, page],
  );

  if (loading) {
    return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!data?.class) {
    return <div className="p-8 text-center text-slate-500">{t("results.classNotFound")}</div>;
  }

  const { class: cls, exam, stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/results"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <p className="text-slate-500">
              {t("results.classLabel", { standard: cls.standard })} • {t("results.sectionLabel", { section: cls.section })} • {cls.academicYear}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {exam && (
            <>
              <Link href={`/results/entry?examId=${exam.id}`}>
                <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4" /> {t("results.bulkEntry")}</Button>
              </Link>
              <Link href={`/results/marks-sheet?classId=${classId}`}>
                <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4" /> {t("results.marksSheet")}</Button>
              </Link>
              <Link href={`/results/print?examId=${exam.id}&classId=${classId}&mode=all`}>
                <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                  <Printer className="h-4 w-4" />
                  {t("results.printAllCount", { count: students.length })}
                </Button>
              </Link>
            </>
          )}
          {exam && !stats.published && (
            <Button size="sm" variant="outline" onClick={publish} disabled={publishing}>
              <Send className="h-4 w-4" /> {t("results.publish")}
            </Button>
          )}
          {exam && stats.published && (
            <Button size="sm" variant="outline" onClick={unpublish} disabled={unpublishing}>
              {t("results.unpublish")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">{t("results.students")}</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-emerald-600">{t("results.complete")}</p><p className="text-2xl font-bold text-emerald-700">{stats.complete}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-amber-600">{t("results.partial")}</p><p className="text-2xl font-bold text-amber-700">{stats.partial}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">{t("results.pending")}</p><p className="text-2xl font-bold">{stats.pending}</p></CardContent></Card>
      </div>

      {exam && termStats.length > 0 && (
        <ExamTermDashboard
          classId={classId}
          examId={exam.id}
          termStats={termStats}
          midExamCount={midExamCount}
          isAdmin={isAdmin}
          onPublish={publishTerm}
          onUnpublish={unpublishTerm}
          busyTerm={busyTerm}
        />
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            {t("results.studentList")}
          </CardTitle>
          <p className="text-sm text-slate-500">{t("results.clickResultIcon")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pt-3 pb-2 border-b bg-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {t("common.search")}
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`${t("results.student")} / ${t("results.roll")}`}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  {t("results.marksStatus")}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">{t("common.all")}</option>
                  <option value="pending">{t("results.statusPending")}</option>
                  <option value="partial">{t("results.statusPartial", { filled: 0, total: 0 })}</option>
                  <option value="complete">{t("results.statusComplete")}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-left text-slate-500">
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">{t("results.roll")}</th>
                  <th className="p-3">{t("results.student")}</th>
                  <th className="p-3">{t("results.marksStatus")}</th>
                  <th className="p-3 text-right">{t("results.total")}</th>
                  <th className="p-3 text-right">%</th>
                  <th className="p-3">{t("results.rank")}</th>
                  <th className="p-3 text-center min-w-[200px]">{t("results.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pagedStudents.map((st, i) => (
                  <tr key={st.id} className="border-b hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="p-3 font-mono">{st.rollNumber || "—"}</td>
                    <td className="p-3 font-medium">{st.firstName} {st.surname}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={st.marksStatus} />
                        <span className="text-xs">
                          {st.marksStatus === "complete" && t("results.statusComplete")}
                          {st.marksStatus === "partial" && t("results.statusPartial", { filled: st.marksFilled, total: st.totalSubjects })}
                          {st.marksStatus === "pending" && t("results.statusPending")}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{st.totalMarks != null ? st.totalMarks : "—"}</td>
                    <td className="p-3 text-right">{st.percentage != null ? `${st.percentage.toFixed(1)}%` : "—"}</td>
                    <td className="p-3">
                      {st.rank ? <span className="font-bold text-amber-600">#{st.rank}</span> : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <Link href={`/results/student?classId=${classId}&studentId=${st.id}`}>
                          <Button
                            size="sm"
                            variant={st.marksStatus === "complete" ? "outline" : "default"}
                            className="gap-1 h-8 text-xs"
                            title={t("results.enterMarks")}
                          >
                            <Award className="h-3.5 w-3.5" />
                            {t("results.marks")}
                          </Button>
                        </Link>
                        {exam ? (
                          <Link href={`/results/print?examId=${exam.id}&classId=${classId}&studentId=${st.id}&mode=particular`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-8 text-xs border-pink-300 text-pink-700 hover:bg-pink-50"
                              title={t("results.printParticular")}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              {t("results.printParticular")}
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="gap-1 h-8 text-xs opacity-50">
                            <Printer className="h-3.5 w-3.5" />
                            {t("results.printParticular")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-500">{t("results.noStudentsInClass")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination page={page} total={filteredStudents.length} onPageChange={setPage} />
        </CardContent>
      </Card>
      <ConfirmDialog />
    </div>
  );
}
