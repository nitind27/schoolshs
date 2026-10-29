import {
  buildGunPatrakPages,
  formatClassStandardLine,
  splitGunPatrakColumns,
  type GunPatrakStudent,
} from "@/lib/results/gun-patrak";
import "./gun-patrak-sheet.css";

export type GunPatrakSheetProps = {
  schoolName: string;
  examLabel: string;
  subjectName: string;
  standard: string;
  section: string;
  examDate?: string | null;
  examiner?: string | null;
  students: GunPatrakStudent[];
};

export function GunPatrakSheet({
  schoolName,
  examLabel,
  subjectName,
  standard,
  section,
  examDate,
  examiner,
  students,
}: GunPatrakSheetProps) {
  const pages = buildGunPatrakPages(students);
  const classLine = formatClassStandardLine(standard, section);
  const dateText = examDate ? String(examDate).trim() : "";

  return (
    <>
      {pages.map((page, pageIndex) => {
        const { left, right } = splitGunPatrakColumns(page);
        return (
          <article key={`${subjectName}-${pageIndex}`} className="gp-sheet">
            <h1 className="gp-title">ગુણ પત્રક</h1>
            <p className="gp-school">{schoolName || "—"}</p>
            <div className="gp-meta">
              <p>
                કસોટી: {examLabel || "—"}
              </p>
              <p>
                વિષય: {subjectName || "—"}
              </p>
              <p className="gp-wide">
                {classLine} તારીખ: {dateText}
              </p>
              <p className="gp-wide">પરીક્ષકશ્રી: {examiner || ""}</p>
            </div>
            <table className="gp-table">
              <thead>
                <tr>
                  <th className="gp-num">પરીક્ષા નંબર</th>
                  <th className="gp-marks">મેળવેલ ગુણ</th>
                  <th className="gp-num">પરીક્ષા નંબર</th>
                  <th className="gp-marks">મેળવેલ ગુણ</th>
                </tr>
              </thead>
              <tbody>
                {left.map((cell, i) => {
                  const other = right[i];
                  return (
                    <tr key={`${pageIndex}-${i}`}>
                      <td className="gp-num">{cell.examNo}</td>
                      <td className="gp-marks">{cell.marks}</td>
                      <td className="gp-num">{other?.examNo ?? ""}</td>
                      <td className="gp-marks">{other?.marks ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="gp-sign">
              <span>પરીક્ષકની સહી.................</span>
              <span>આચાર્યની સહી.................</span>
            </div>
          </article>
        );
      })}
    </>
  );
}
