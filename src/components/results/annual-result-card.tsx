"use client";

import { RESULT_SCHOOL, formatAcademicYearLabel, ANNUAL_RESULT_TOTAL_MARKS } from "@/lib/results/config";
import { studentFullNameGu } from "@/lib/student-names";

export type ResultCardData = {
  student: {
    id?: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    firstNameGu?: string | null;
    middleNameGu?: string | null;
    surnameGu?: string | null;
    rollNumber?: string | null;
    grNumber?: string | null;
    standard?: string | null;
    section?: string | null;
    currentAddress?: string;
    currentCity?: string;
    currentDistrict?: string;
    currentPincode?: string;
    permanentAddress?: string;
    permanentCity?: string;
    permanentDistrict?: string;
    permanentPincode?: string;
    childUid?: string | null;
    schoolClass?: { name?: string } | null;
  };
  exam: {
    academicYear: string;
    reopeningDate?: string | null;
  };
  reportCard?: {
    rank?: number | null;
    result?: string | null;
    passNumber?: string | null;
    attendancePresent?: number | null;
    attendanceTotal?: number | null;
    percentage?: number | null;
    totalMarks?: number | null;
    reopeningDate?: string | null;
  } | null;
  subjects: {
    name: string;
    maxMarks: number;
    marksObtained: number | null;
    achievementMarks?: number;
    graceMarks?: number;
    finalMarks: number | null;
  }[];
  totals?: {
    totalObtained: number;
    totalAchievement: number;
    totalGrace: number;
    totalFinal: number;
    percentage: number;
  } | null;
};

const INK = "#b83280";
const INK_LIGHT = "#c2185b";

function toGuDigits(n: number | string | null | undefined): string {
  if (n == null || n === "") return "";
  const gu = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  return String(n).replace(/\d/g, (d) => gu[parseInt(d, 10)]);
}

function Dot({ w = 100, val }: { w?: number; val?: React.ReactNode }) {
  return (
    <span className="rc-dot" style={{ minWidth: w }}>
      {val != null && val !== "" ? <strong className="rc-val">{val}</strong> : "\u00A0"}
    </span>
  );
}

function cell(val: number | string | null | undefined, bold = false) {
  if (val == null || val === "") return "";
  return bold ? val : val;
}

function ResultFront({ data }: { data: ResultCardData }) {
  const st = data.student;
  const rc = data.reportCard;
  const [yStart, yEnd] = formatAcademicYearLabel(data.exam.academicYear).split(" - ");
  const fullName = studentFullNameGu(st);
  const section = st.section || st.schoolClass?.name?.split("-").pop() || "";
  const resultText = rc?.result || "";
  const isPass = resultText.includes("પાસ") && !resultText.includes("નાપાસ");
  const isPromoted = resultText.includes("ઉપર ચઢાવવામાં");
  const isFail = resultText.includes("નાપાસ");

  return (
    <div className="rc-sheet rc-front">
      <div className="rc-header">
        <div className="rc-school">{RESULT_SCHOOL.nameGu}</div>
        <div className="rc-title">
          વાર્ષિક પરીક્ષાનું પરિણામ પત્રક સને <Dot w={28} val={yStart} /> - <Dot w={28} val={yEnd} />
        </div>
        <div className="rc-section">{RESULT_SCHOOL.sectionGu}</div>
      </div>

      <div className="rc-student">
        <div className="rc-row">નામ : <Dot w={420} val={fullName} /></div>
        <div className="rc-row rc-row-3">
          <span>ધોરણ : <Dot w={50} val={st.standard} /></span>
          <span>વર્ગ : <Dot w={50} val={section} /></span>
          <span>પરીક્ષા ક્રમાંક : <Dot w={80} val={st.rollNumber} /></span>
        </div>
        <div className="rc-row rc-row-2">
          <span>જી.આર.નં. : <Dot w={100} val={st.grNumber} /></span>
          <span>રજી. નંબર : <Dot w={140} val={st.childUid} /></span>
        </div>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th className="rc-col-subject">વિષય</th>
            <th>કુલ<br />ગુણ</th>
            <th>મેળવેલ<br />ગુણ</th>
            <th>સિધ્ધિ<br />ગુણ</th>
            <th>કૃપા<br />ગુણ</th>
            <th>કુલ<br />ગુણ</th>
            <th className="rc-col-rank">રેન્ક</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((sub, i) => (
            <tr key={i}>
              <td className="rc-col-subject rc-subject-name">{sub.name}</td>
              <td>{toGuDigits(sub.maxMarks) || sub.maxMarks}</td>
              <td className="rc-val">{cell(sub.marksObtained)}</td>
              <td className="rc-val">{sub.achievementMarks ? cell(sub.achievementMarks) : ""}</td>
              <td className="rc-val">{sub.graceMarks ? cell(sub.graceMarks) : ""}</td>
              <td className="rc-val rc-bold">{sub.finalMarks != null ? cell(sub.finalMarks) : ""}</td>
              <td />
            </tr>
          ))}
          <tr className="rc-total-row">
            <td className="rc-subject-name">કુલ માર્ક</td>
            <td className="rc-bold">{toGuDigits(ANNUAL_RESULT_TOTAL_MARKS)}</td>
            <td className="rc-val rc-bold">{data.totals?.totalObtained ?? ""}</td>
            <td className="rc-val">{data.totals?.totalAchievement || ""}</td>
            <td className="rc-val">{data.totals?.totalGrace || ""}</td>
            <td className="rc-val rc-bold">{data.totals?.totalFinal ?? rc?.totalMarks ?? ""}</td>
            <td className="rc-val rc-bold">{rc?.rank ?? ""}</td>
          </tr>
        </tbody>
      </table>

      <div className="rc-footer">
        <div>પાસ નંબર <Dot w={120} val={rc?.passNumber} /></div>
        <div>
          વર્ષ દરમ્યાન <Dot w={40} val={rc?.attendanceTotal} /> દિવસમાંથી{" "}
          <Dot w={40} val={rc?.attendancePresent} /> દિવસ હાજર
        </div>
        <div className="rc-result-line">
          પરિણામ :{" "}
          <span className={isPass && !isPromoted ? "rc-result-active" : ""}>પાસ થાય છે.</span>
          {" / "}
          <span className={isPromoted ? "rc-result-active" : ""}>ઉપર ચઢાવવામાં આવે છે.</span>
          {" / "}
          <span className={isFail ? "rc-result-active" : ""}>નાપાસ થાય છે.</span>
        </div>
      </div>
    </div>
  );
}

function ResultBack({ data }: { data: ResultCardData }) {
  const st = data.student;
  const reopening = data.reportCard?.reopeningDate || data.exam.reopeningDate || "";
  const addr = st.permanentAddress || st.currentAddress || "";
  const city = st.permanentCity || st.currentCity || "";
  const district = st.permanentDistrict || st.currentDistrict || "";
  const pin = st.permanentPincode || st.currentPincode || "";
  const fullName = studentFullNameGu(st);

  return (
    <div className="rc-sheet rc-back">
      <div className="rc-back-left">
        <div className="rc-back-msg">
          <div>(૧) રજાઓ પૂરી થતાં તા. <Dot w={70} val={reopening} /> થી</div>
          <div className="rc-back-indent"><Dot w={80} /> વાર <Dot w={60} /> થી</div>
          <div>નવું સત્ર શરૂ થશે. જેની આપને જાણ થાય છે.</div>
        </div>
        <div className="rc-back-sign">
          <div>વર્ગ શિક્ષક</div>
          <div className="rc-sign-space" />
          <div>આચાર્ય</div>
          <div className="rc-back-school">{RESULT_SCHOOL.postcardSchoolGu}</div>
        </div>
      </div>
      <div className="rc-back-right">
        <div className="rc-post-label">POST CARD</div>
        <div className="rc-stamp-box" />
        <div className="rc-address">
          <div>To,</div>
          <div>નામ : <Dot w={150} val={fullName} /></div>
          <div>ઠેકાણું : <Dot w={150} val={addr} /></div>
          <div>મુકામ : <Dot w={120} val={city} /></div>
          <div>પોસ્ટ : <Dot w={120} /></div>
          <div>જિલ્લો : <Dot w={120} val={district} /></div>
          <div>પીન : <Dot w={70} val={pin} /></div>
        </div>
      </div>
    </div>
  );
}

export function AnnualResultCard({ data }: { data: ResultCardData }) {
  return (
    <div className="annual-result-card">
      <ResultFront data={data} />
      <ResultBack data={data} />
      <style jsx global>{`
        .annual-result-card {
          font-family: "Nirmala UI", "Shruti", "Gujarati Sangam MN", "Noto Sans Gujarati", sans-serif;
        }
        .rc-sheet {
          width: 190mm;
          max-width: 100%;
          margin: 0 auto 8mm;
          padding: 8mm 10mm 10mm;
          border: 1.5px solid ${INK};
          background: #fff;
          color: ${INK};
          box-sizing: border-box;
          page-break-after: always;
        }
        .rc-front { min-height: 255mm; }
        .rc-back {
          min-height: 130mm;
          display: flex;
          padding: 0;
          overflow: hidden;
        }
        .rc-header { text-align: center; margin-bottom: 8mm; }
        .rc-school { font-size: 16px; font-weight: 700; letter-spacing: 0.02em; }
        .rc-title { font-size: 14px; font-weight: 700; margin-top: 4px; }
        .rc-section { font-size: 13px; margin-top: 3px; }
        .rc-dot {
          border-bottom: 1px dotted ${INK};
          display: inline-block;
          padding: 0 2px 1px;
          vertical-align: bottom;
          line-height: 1.2;
        }
        .rc-val, .rc-val strong { color: #111 !important; font-weight: 700; }
        .rc-student { font-size: 12px; margin-bottom: 6mm; line-height: 2; }
        .rc-row { margin-bottom: 2px; }
        .rc-row-3 { display: flex; gap: 12px; flex-wrap: wrap; }
        .rc-row-2 { display: flex; gap: 24px; flex-wrap: wrap; }
        .rc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          table-layout: fixed;
        }
        .rc-table th, .rc-table td {
          border: 1px solid ${INK};
          padding: 3px 2px;
          text-align: center;
          vertical-align: middle;
        }
        .rc-table th {
          font-weight: 600;
          font-size: 10px;
          line-height: 1.25;
          padding: 4px 2px;
        }
        .rc-col-subject { width: 26%; text-align: left !important; padding-left: 6px !important; }
        .rc-col-rank { width: 8%; }
        .rc-subject-name { text-align: left !important; padding-left: 6px !important; font-size: 10.5px; }
        .rc-bold { font-weight: 700; }
        .rc-total-row td { font-weight: 700; padding-top: 4px; padding-bottom: 4px; }
        .rc-footer { margin-top: 8mm; font-size: 12px; line-height: 2.1; }
        .rc-result-line { margin-top: 2px; }
        .rc-result-active { font-weight: 800; text-decoration: underline; color: #111 !important; }
        .rc-back-left {
          flex: 1;
          padding: 10mm 8mm;
          border-right: 2px double ${INK};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .rc-back-right {
          width: 46%;
          padding: 10mm 8mm 10mm 12mm;
          position: relative;
          font-size: 11px;
          line-height: 2;
        }
        .rc-back-msg { line-height: 2; font-size: 11px; }
        .rc-back-indent { padding-left: 16px; }
        .rc-back-sign { text-align: right; font-size: 10px; line-height: 1.6; }
        .rc-sign-space { height: 14mm; }
        .rc-back-school { font-weight: 700; margin-top: 4px; }
        .rc-post-label {
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%) rotate(-90deg);
          font-size: 9px;
          letter-spacing: 2px;
        }
        .rc-stamp-box {
          width: 52px;
          height: 52px;
          border: 1px solid ${INK};
          margin-left: auto;
          margin-bottom: 10px;
        }
        .rc-address { line-height: 2; }
        @media print {
          .rc-sheet {
            width: 190mm;
            margin: 0 auto;
            box-shadow: none;
          }
          .rc-front { min-height: auto; }
        }
      `}</style>
    </div>
  );
}

export function AnnualResultCards({ cards }: { cards: ResultCardData[] }) {
  return (
    <div className="result-all-cards">
      {cards.map((c) => (
        <AnnualResultCard key={(c.student.id || c.student.firstName) + c.student.surname} data={c} />
      ))}
    </div>
  );
}
