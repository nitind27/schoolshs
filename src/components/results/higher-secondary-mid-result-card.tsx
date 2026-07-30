"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { studentFullNameGu } from "@/lib/student-names";

export type HigherSecondaryTermPrintData = {
  class: {
    id: string;
    name: string;
    standard: string;
    section: string;
    stream?: string | null;
    academicYear: string;
  };
  term: {
    key: string;
    labelEn: string;
    labelGu: string;
    role: "component" | "final";
    maxMarks: number;
    internalMax?: number;
    totalMax?: number;
  };
  students: HigherSecondaryTermStudent[];
};

type HigherSecondaryTermStudent = {
  studentId: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  rollNumber?: string | null;
  grNumber?: string | null;
  dateOfBirth?: string | null;
  subjectMarks: Array<{
    subjectCode: string;
    subjectName: string;
    subjectType: "numeric" | "grade";
    termValue: number | null;
    internalValue?: number | null;
  }>;
};

const GU_DIGITS = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];

function toGuDigits(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value).replace(/\d/g, (digit) => GU_DIGITS[Number(digit)] || digit);
}

function streamLabel(stream?: string | null): string {
  const normalized = String(stream || "").trim().toLowerCase();
  if (normalized === "commerce") return "વાણિજ્ય પ્રવાહ";
  if (normalized === "science") return "વિજ્ઞાન પ્રવાહ";
  if (normalized === "arts" || normalized === "general") return "સામાન્ય પ્રવાહ";
  return stream || "સામાન્ય પ્રવાહ";
}

function obtainedMark(mark: HigherSecondaryTermStudent["subjectMarks"][number]): number | null {
  if (mark.termValue == null && mark.internalValue == null) return null;
  return Number(mark.termValue || 0) + Number(mark.internalValue || 0);
}

function studentSummary(
  student: HigherSecondaryTermStudent,
  perSubjectMax: number,
) {
  const numeric = student.subjectMarks.filter((subject) => subject.subjectType === "numeric");
  const values = numeric.map(obtainedMark);
  const complete = numeric.length > 0 && values.every((value) => value != null);
  const total = values.reduce<number>((sum, value) => sum + Number(value || 0), 0);
  const passed =
    complete &&
    values.every((value) => Number(value) >= Math.ceil(perSubjectMax * 0.33));
  return {
    complete,
    passed,
    total,
    max: numeric.length * perSubjectMax,
  };
}

function MidResultCard({
  data,
  student,
  rank,
}: {
  data: HigherSecondaryTermPrintData;
  student: HigherSecondaryTermStudent;
  rank: number | null;
}) {
  const perSubjectMax =
    Number(data.term.totalMax) ||
    Number(data.term.maxMarks || 0) + Number(data.term.internalMax || 0);
  const numericSubjects = student.subjectMarks.filter(
    (subject) => subject.subjectType === "numeric",
  );
  const rows: Array<(typeof numericSubjects)[number] | null> = [
    ...numericSubjects,
    ...Array.from({ length: Math.max(0, 7 - numericSubjects.length) }, () => null),
  ];
  const summary = studentSummary(student, perSubjectMax);

  return (
    <article className="hs-mid-card">
      <header className="hs-mid-header">
        <p className="hs-mid-trust">સાર્વજનિક એજ્યુકેશન સોસાયટી સંચાલિત</p>
        <h2>{CERTIFICATE_SCHOOL.nameGu}</h2>
        <p>{CERTIFICATE_SCHOOL.addressGu}</p>
        <p className="hs-mid-index">
          શાળા ઇન્ડેક્સ નંબર : {toGuDigits(CERTIFICATE_SCHOOL.hscIndex)}
        </p>
        <p className="hs-mid-section">ઉચ્ચતર માધ્યમિક વિભાગ</p>
        <p className="hs-mid-exam">
          {data.term.labelGu} પરિણામ — {toGuDigits(data.class.academicYear)}
        </p>
      </header>

      <section className="hs-mid-student">
        <div className="hs-mid-full-row">
          <span>વિદ્યાર્થીનું નામ :</span>
          <strong>{studentFullNameGu(student)}</strong>
        </div>
        <div className="hs-mid-info-grid">
          <span>ગ્રુપ/વર્ગ : <b>{streamLabel(data.class.stream)}</b></span>
          <span>જન્મ તારીખ : <b>{toGuDigits(student.dateOfBirth)}</b></span>
          <span>જી.આર. નંબર : <b>{toGuDigits(student.grNumber)}</b></span>
          <span>રોલ નંબર : <b>{toGuDigits(student.rollNumber)}</b></span>
          <span>ધોરણ : <b>{toGuDigits(data.class.standard)}</b></span>
          <span>વર્ગ : <b>{data.class.section || "—"}</b></span>
        </div>
      </section>

      <table className="hs-mid-table">
        <thead>
          <tr>
            <th>વિષય</th>
            <th>ગુણ</th>
            <th>મેળવેલ ગુણ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((subject, index) => (
            <tr key={subject?.subjectCode || `blank-${index}`}>
              <td>{subject?.subjectName || ""}</td>
              <td>{subject ? toGuDigits(perSubjectMax) : ""}</td>
              <td>
                {subject ? toGuDigits(obtainedMark(subject)) : ""}
              </td>
            </tr>
          ))}
          <tr className="hs-mid-total">
            <td>કુલ ગુણ</td>
            <td>{toGuDigits(summary.max)}</td>
            <td>{toGuDigits(summary.total)}</td>
          </tr>
        </tbody>
      </table>

      <footer className="hs-mid-footer">
        <span>
          પરિણામ :{" "}
          <b>
            {!summary.complete ? "અપૂર્ણ" : summary.passed ? "પાસ" : "નાપાસ"}
          </b>
        </span>
        <span>
          રેન્ક : <b>{rank == null ? "—" : toGuDigits(rank)}</b>
        </span>
      </footer>
    </article>
  );
}

export function HigherSecondaryMidResultCards({
  data,
}: {
  data: HigherSecondaryTermPrintData;
}) {
  const perSubjectMax =
    Number(data.term.totalMax) ||
    Number(data.term.maxMarks || 0) + Number(data.term.internalMax || 0);
  const ranked = data.students
    .map((student) => ({
      id: student.studentId,
      ...studentSummary(student, perSubjectMax),
    }))
    .filter((student) => student.complete)
    .sort((a, b) => b.total - a.total);
  const ranks = new Map<string, number>();
  ranked.forEach((student, index) => {
    const previous = ranked[index - 1];
    ranks.set(
      student.id,
      previous && previous.total === student.total
        ? ranks.get(previous.id) || index + 1
        : index + 1,
    );
  });

  const pages: HigherSecondaryTermStudent[][] = [];
  for (let index = 0; index < data.students.length; index += 3) {
    pages.push(data.students.slice(index, index + 3));
  }

  return (
    <div className="hs-mid-pages">
      {pages.map((students, pageIndex) => (
        <section className="hs-mid-page" key={`hs-mid-page-${pageIndex}`}>
          {students.map((student) => (
            <MidResultCard
              key={student.studentId}
              data={data}
              student={student}
              rank={ranks.get(student.studentId) ?? null}
            />
          ))}
        </section>
      ))}

      <style jsx global>{`
        .hs-mid-pages {
          font-family:
            "Nirmala UI", "Shruti", "Noto Sans Gujarati", sans-serif;
          color: #111827;
        }
        .hs-mid-page {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 3mm;
          width: 284mm;
          height: 194mm;
          margin: 0 auto 8mm;
          padding: 2mm;
          overflow: hidden;
          background: #fff;
          box-sizing: border-box;
        }
        .hs-mid-page::before,
        .hs-mid-page::after {
          content: "";
          position: absolute;
          top: 2mm;
          bottom: 2mm;
          border-left: 1px dashed #9ca3af;
          pointer-events: none;
        }
        .hs-mid-page::before {
          left: 33.333%;
        }
        .hs-mid-page::after {
          left: 66.666%;
        }
        .hs-mid-card {
          align-self: start;
          min-width: 0;
          border: 1.2px solid #1f2937;
          background: #fff;
          box-sizing: border-box;
          overflow: hidden;
        }
        .hs-mid-header {
          padding: 2.2mm 2mm 1.4mm;
          text-align: center;
          border-bottom: 1px solid #374151;
          line-height: 1.25;
        }
        .hs-mid-header p,
        .hs-mid-header h2 {
          margin: 0;
        }
        .hs-mid-trust {
          font-size: 7.2px;
          font-weight: 800;
        }
        .hs-mid-header h2 {
          margin-top: 0.4mm;
          font-size: 11.5px;
          font-weight: 900;
        }
        .hs-mid-header > p:not(.hs-mid-trust) {
          font-size: 7.2px;
        }
        .hs-mid-index {
          color: #7f1d1d;
          font-weight: 800;
        }
        .hs-mid-section {
          margin-top: 0.5mm !important;
          font-size: 8.5px !important;
          font-weight: 900;
          color: #7f1d1d;
        }
        .hs-mid-exam {
          margin-top: 0.7mm !important;
          padding-top: 0.7mm;
          border-top: 1px solid #d1d5db;
          font-size: 8px !important;
          font-weight: 800;
        }
        .hs-mid-student {
          font-size: 7px;
          line-height: 1.35;
        }
        .hs-mid-full-row {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1mm;
          padding: 1mm 1.5mm;
          border-bottom: 1px solid #6b7280;
        }
        .hs-mid-full-row strong {
          min-width: 0;
          font-size: 7.5px;
        }
        .hs-mid-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .hs-mid-info-grid span {
          min-width: 0;
          min-height: 5.4mm;
          padding: 0.8mm 1.2mm;
          border-right: 1px solid #6b7280;
          border-bottom: 1px solid #6b7280;
          overflow: hidden;
          white-space: nowrap;
        }
        .hs-mid-info-grid span:nth-child(even) {
          border-right: 0;
        }
        .hs-mid-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.4px;
        }
        .hs-mid-table th,
        .hs-mid-table td {
          height: 7mm;
          padding: 0.7mm 1mm;
          border-right: 1px solid #4b5563;
          border-bottom: 1px solid #4b5563;
          text-align: center;
          box-sizing: border-box;
        }
        .hs-mid-table th:last-child,
        .hs-mid-table td:last-child {
          border-right: 0;
        }
        .hs-mid-table th {
          height: 7.5mm;
          font-weight: 900;
          background: #f3f4f6;
        }
        .hs-mid-table th:first-child,
        .hs-mid-table td:first-child {
          width: 52%;
          text-align: left;
          padding-left: 1.5mm;
        }
        .hs-mid-table th:nth-child(2),
        .hs-mid-table td:nth-child(2) {
          width: 18%;
        }
        .hs-mid-total td {
          height: 8mm;
          font-weight: 900;
          background: #f9fafb;
        }
        .hs-mid-footer {
          display: grid;
          grid-template-columns: 1fr 0.65fr;
          font-size: 8px;
          font-weight: 700;
        }
        .hs-mid-footer span {
          min-height: 8mm;
          padding: 1.5mm;
          border-right: 1px solid #4b5563;
          box-sizing: border-box;
        }
        .hs-mid-footer span:last-child {
          border-right: 0;
        }
        @media print {
          .hs-mid-page {
            width: 284mm;
            height: 194mm;
            max-height: 194mm;
            margin: 0;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .hs-mid-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .hs-mid-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
