"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { useT, useLocale } from "@/i18n/locale-provider";
import {
  ActivityPrintView,
  type ActivityPrintSchool,
} from "@/components/activities/activity-print";
import {
  ArrowLeft,
  Check,
  Plus,
  Printer,
  Send,
  Trash2,
  Undo2,
  UserPlus,
  Users,
} from "lucide-react";
import "../activities.css";

type ClassOpt = {
  id: string;
  name: string;
  standard: string;
  section: string;
  academicYear?: string;
};

type StudentOpt = {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  firstNameGu?: string | null;
  surnameGu?: string | null;
  rollNumber?: string | null;
  grNumber?: string | null;
  gender?: string | null;
  classId?: string | null;
  standard?: string | null;
  section?: string | null;
};

type Participant = {
  id: string;
  note?: string | null;
  classId?: string | null;
  student: StudentOpt & {
    schoolClass?: {
      id: string;
      name: string;
      standard: string;
      section: string;
    } | null;
  };
};

type ActivityDetail = {
  id: string;
  title: string;
  titleGu?: string | null;
  type: string;
  date: string;
  venue?: string | null;
  description?: string | null;
  academicYear?: string;
  released?: boolean;
  releasedAt?: string | null;
  participants: Participant[];
};

function studentName(s: StudentOpt, locale: string): string {
  if (locale === "gu" && (s.firstNameGu || s.surnameGu)) {
    return [s.firstNameGu, s.surnameGu].filter(Boolean).join(" ");
  }
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ");
}

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const { locale } = useLocale();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [school, setSchool] = useState<ActivityPrintSchool>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(
    null,
  );

  const showMsg = (text: string, tone: "ok" | "err" = "ok") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3000);
  };

  const loadActivity = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/activities?id=${id}`);
    const data = await res.json();
    if (res.ok && data.activity) {
      setActivity(data.activity);
      setSchool(data.school || null);
    } else {
      setActivity(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadActivity();
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || d || []))
      .catch(() => setClasses([]));
  }, [loadActivity]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    fetch(`/api/students?classId=${classId}&limit=500`)
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [classId]);

  const participantIds = useMemo(
    () => new Set((activity?.participants || []).map((p) => p.student.id)),
    [activity],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (participantIds.has(s.id)) return false;
      if (!q) return true;
      const hay = [
        s.firstName,
        s.surname,
        s.firstNameGu,
        s.surnameGu,
        s.rollNumber,
        s.grNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [students, search, participantIds]);

  const addStudent = async (studentId: string) => {
    setAddingId(studentId);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_participant",
        id,
        studentId,
        classId: classId || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingId(null);
    if (!res.ok) {
      showMsg(data.error || t("activities.addStudentFailed"), "err");
      return;
    }
    if (activity) {
      setActivity({
        ...activity,
        participants: data.participants || activity.participants,
      });
    }
    showMsg(t("activities.studentAdded"));
  };

  const removeParticipant = async (participantId: string, studentId: string) => {
    setRemovingId(participantId);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove_participant",
        id,
        participantId,
        studentId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setRemovingId(null);
    if (!res.ok) {
      showMsg(data.error || t("activities.removeFailed"), "err");
      return;
    }
    if (activity) {
      setActivity({
        ...activity,
        participants: data.participants || [],
      });
    }
    showMsg(t("activities.studentRemoved"));
  };

  const toggleRelease = async () => {
    if (!activity) return;
    if (!activity.released && activity.participants.length === 0) {
      showMsg(t("activities.releaseNeedStudents"), "err");
      return;
    }
    setReleasing(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: activity.released ? "unrelease" : "release",
        id,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setReleasing(false);
    if (!res.ok) {
      showMsg(data.error || t("activities.releaseFailed"), "err");
      return;
    }
    if (data.activity) setActivity(data.activity);
    showMsg(
      activity.released
        ? t("activities.unreleaseOk")
        : t("activities.releaseOk"),
    );
  };

  if (loading) return <PageLoader />;
  if (!activity) {
    return (
      <PageShell title={t("activities.title")}>
        <p className="py-12 text-center text-slate-500">
          {t("activities.notFound")}
        </p>
        <div className="text-center">
          <Link href="/activities">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("activities.back")}
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={activity.title}
      subtitle={
        activity.titleGu
          ? `${activity.date} · ${activity.titleGu}`
          : `${activity.date}${activity.venue ? ` · ${activity.venue}` : ""}`
      }
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("activities.title"), href: "/activities" },
        { label: activity.title },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowPrint((v) => !v)}
            disabled={!activity.participants.length}
          >
            <Printer className="h-4 w-4" />
            {t("activities.print")}
          </Button>
          <Button
            className="gap-2"
            variant={activity.released ? "outline" : "default"}
            onClick={toggleRelease}
            disabled={releasing}
          >
            {releasing ? (
              <Spinner size="sm" />
            ) : activity.released ? (
              <Undo2 className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {activity.released
              ? t("activities.unrelease")
              : t("activities.release")}
          </Button>
          <Link href="/activities">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("activities.back")}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="act-detail">
        {msg && (
          <div className={`act-toast act-toast--${msg.tone}`}>{msg.text}</div>
        )}

        <div className="act-detail__banner">
          <div>
            <div className="act-detail__badges">
              <span className="act-card__type">
                {t(`activities.type.${activity.type}` as never)}
              </span>
              <span
                className={`act-badge ${activity.released ? "act-badge--live" : "act-badge--draft"}`}
              >
                {activity.released
                  ? t("activities.released")
                  : t("activities.draft")}
              </span>
            </div>
            <h2 className="act-detail__title">{activity.title}</h2>
            {activity.description ? (
              <p className="act-detail__desc">{activity.description}</p>
            ) : null}
          </div>
          <div className="act-detail__stat">
            <Users className="h-5 w-5" />
            <div>
              <p className="act-detail__stat-val">
                {activity.participants.length}
              </p>
              <p className="act-detail__stat-lbl">
                {t("activities.participants")}
              </p>
            </div>
          </div>
        </div>

        {showPrint && (
          <section className="act-print-wrap">
            <ActivityPrintView activity={activity} school={school} />
          </section>
        )}

        <div className="act-detail__grid">
          <section className="act-panel">
            <header className="act-panel__head">
              <h3>
                <UserPlus className="h-4 w-4" />{" "}
                {t("activities.pickStudents")}
              </h3>
              <p>{t("activities.pickStudentsHint")}</p>
            </header>
            <div className="act-panel__body space-y-3">
              <Select
                label={t("activities.selectClass")}
                value={classId}
                emptyLabel={t("activities.chooseClass")}
                onChange={(e) => setClassId(e.target.value)}
                options={classes.map((c) => ({
                  value: c.id,
                  label: c.name || `${c.standard}-${c.section}`,
                }))}
              />
              {classId ? (
                <Input
                  label={t("activities.searchStudent")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("activities.searchPlaceholder")}
                />
              ) : null}

              {!classId ? (
                <p className="act-hint">{t("activities.selectClassFirst")}</p>
              ) : studentsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="act-hint">{t("activities.noStudentsLeft")}</p>
              ) : (
                <ul className="act-student-list">
                  {filteredStudents.map((s) => (
                    <li key={s.id} className="act-student-row">
                      <div className="act-student-row__info">
                        <p className="act-student-row__name">
                          {studentName(s, locale)}
                        </p>
                        <p className="act-student-row__meta">
                          {[
                            s.rollNumber
                              ? `${t("activities.roll")} ${s.rollNumber}`
                              : null,
                            s.grNumber
                              ? `${t("activities.gr")} ${s.grNumber}`
                              : null,
                            s.gender,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="act-student-row__add"
                        disabled={addingId === s.id}
                        onClick={() => addStudent(s.id)}
                      >
                        {addingId === s.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t("activities.addOne")}</span>
                          </>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="act-panel">
            <header className="act-panel__head">
              <h3>
                <Check className="h-4 w-4" /> {t("activities.participants")}
              </h3>
              <p>
                {t("activities.participantCount", {
                  count: activity.participants.length,
                })}
              </p>
            </header>
            <div className="act-panel__body">
              {activity.participants.length === 0 ? (
                <p className="act-hint">{t("activities.noParticipants")}</p>
              ) : (
                <ul className="act-student-list">
                  {activity.participants.map((p, idx) => (
                    <li key={p.id} className="act-student-row">
                      <div className="act-student-row__sr">{idx + 1}</div>
                      <div className="act-student-row__info">
                        <p className="act-student-row__name">
                          {studentName(p.student, locale)}
                        </p>
                        <p className="act-student-row__meta">
                          {[
                            p.student.schoolClass?.name ||
                              (p.student.standard
                                ? `${p.student.standard}-${p.student.section || ""}`
                                : null),
                            p.student.rollNumber
                              ? `${t("activities.roll")} ${p.student.rollNumber}`
                              : null,
                            p.student.grNumber
                              ? `${t("activities.gr")} ${p.student.grNumber}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="act-student-row__remove"
                        disabled={removingId === p.id}
                        onClick={() =>
                          removeParticipant(p.id, p.student.id)
                        }
                        aria-label={t("common.delete")}
                      >
                        {removingId === p.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
