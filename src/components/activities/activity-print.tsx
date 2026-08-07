"use client";

import { Printer } from "lucide-react";
import { useT, useLocale } from "@/i18n/locale-provider";
import "./activity-print.css";

export type ActivityPrintSchool = {
  name: string;
  address?: string | null;
  district?: string | null;
  phone?: string | null;
  code?: string | null;
} | null;

export type ActivityPrintParticipant = {
  id: string;
  student: {
    firstName: string;
    middleName?: string | null;
    surname: string;
    firstNameGu?: string | null;
    surnameGu?: string | null;
    rollNumber?: string | null;
    grNumber?: string | null;
    gender?: string | null;
    standard?: string | null;
    section?: string | null;
    schoolClass?: {
      name: string;
      standard: string;
      section: string;
    } | null;
  };
};

export type ActivityPrintData = {
  title: string;
  titleGu?: string | null;
  type: string;
  date: string;
  venue?: string | null;
  description?: string | null;
  academicYear?: string;
  released?: boolean;
  participants: ActivityPrintParticipant[];
};

function fullName(
  s: ActivityPrintParticipant["student"],
  locale: string,
): string {
  if (locale === "gu" && (s.firstNameGu || s.surnameGu)) {
    return [s.firstNameGu, s.surnameGu].filter(Boolean).join(" ");
  }
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ");
}

function classLabel(s: ActivityPrintParticipant["student"]): string {
  if (s.schoolClass?.name) return s.schoolClass.name;
  if (s.standard) return `${s.standard}-${s.section || ""}`.replace(/-$/, "");
  return "—";
}

export function ActivityPrintView({
  activity,
  school,
  showScreenButton = true,
}: {
  activity: ActivityPrintData;
  school?: ActivityPrintSchool;
  showScreenButton?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const printedOn = new Date().toLocaleString("en-IN");

  return (
    <>
      {showScreenButton && (
        <div className="act-print-bar no-print">
          <button
            type="button"
            className="act-print-bar__btn"
            onClick={() => window.print()}
            disabled={!activity.participants.length}
          >
            <Printer className="h-4 w-4" />
            {t("activities.print")}
          </button>
        </div>
      )}

      <div className="act-print-sheet" id="activity-print-root">
        <header className="act-print-head">
          <p className="act-print-head__school">{school?.name || "School"}</p>
          {(school?.address || school?.district || school?.phone) && (
            <p className="act-print-head__meta">
              {[school?.address, school?.district, school?.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <h1 className="act-print-head__title">
            {t("activities.printTitle")}
          </h1>
        </header>

        <section className="act-print-info">
          <div>
            <span>{t("activities.fieldTitle")}</span>
            <strong>{activity.title}</strong>
            {activity.titleGu ? <em>{activity.titleGu}</em> : null}
          </div>
          <div>
            <span>{t("activities.fieldType")}</span>
            <strong>{t(`activities.type.${activity.type}` as never)}</strong>
          </div>
          <div>
            <span>{t("activities.fieldDate")}</span>
            <strong>{activity.date}</strong>
          </div>
          {activity.venue ? (
            <div>
              <span>{t("activities.fieldVenue")}</span>
              <strong>{activity.venue}</strong>
            </div>
          ) : null}
          {activity.academicYear ? (
            <div>
              <span>{t("activities.academicYear")}</span>
              <strong>{activity.academicYear}</strong>
            </div>
          ) : null}
          <div>
            <span>{t("activities.participants")}</span>
            <strong>{activity.participants.length}</strong>
          </div>
        </section>

        {activity.description ? (
          <p className="act-print-desc">{activity.description}</p>
        ) : null}

        <table className="act-print-table">
          <thead>
            <tr>
              <th style={{ width: "2.2rem" }}>#</th>
              <th>{t("activities.colName")}</th>
              <th style={{ width: "4.5rem" }}>{t("activities.roll")}</th>
              <th style={{ width: "5rem" }}>{t("activities.gr")}</th>
              <th style={{ width: "5.5rem" }}>{t("activities.colClass")}</th>
              <th style={{ width: "4rem" }}>{t("activities.colGender")}</th>
            </tr>
          </thead>
          <tbody>
            {activity.participants.length === 0 ? (
              <tr>
                <td colSpan={6} className="act-print-empty">
                  {t("activities.noParticipants")}
                </td>
              </tr>
            ) : (
              activity.participants.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{fullName(p.student, locale)}</td>
                  <td>{p.student.rollNumber || "—"}</td>
                  <td>{p.student.grNumber || "—"}</td>
                  <td>{classLabel(p.student)}</td>
                  <td>{p.student.gender || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <footer className="act-print-foot">
          <div>
            <p>{t("activities.printPrepared")}</p>
            <span>________________</span>
          </div>
          <div>
            <p>{t("activities.printPrincipal")}</p>
            <span>________________</span>
          </div>
          <p className="act-print-foot__date">
            {t("activities.printedOn")}: {printedOn}
          </p>
        </footer>
      </div>
    </>
  );
}
