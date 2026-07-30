"use client";

import {
  ANNUAL_RESULT_SUBJECTS,
  RESULT_SCHOOL,
  formatAcademicYearLabel,
} from "@/lib/results/config";
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

function toGuDigits(n: number | string | null | undefined): string {
  if (n == null || n === "") return "";
  const gu = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];
  return String(n).replace(/\d/g, (d) => gu[parseInt(d, 10)]);
}

function Dot({ w = 100, val }: { w?: number; val?: React.ReactNode }) {
  return (
    <span className="rc-dot" style={{ minWidth: w }}>
      {val != null && val !== "" ? (
        <strong className="rc-val">{val}</strong>
      ) : (
        "\u00A0"
      )}
    </span>
  );
}

function cell(val: number | string | null | undefined, bold = false) {
  if (val == null || val === "") return "";
  return bold ? val : val;
}

function subjectLabel(name: string): string {
  const normalized = name.trim().toLowerCase();
  const configured = ANNUAL_RESULT_SUBJECTS.find(
    (subject) =>
      subject.name.toLowerCase() === normalized ||
      subject.nameEn.toLowerCase() === normalized,
  );
  return configured?.name || name;
}

function ResultFront({ data }: { data: ResultCardData }) {
  const st = data.student;
  const rc = data.reportCard;
  const [yStart, yEnd] = formatAcademicYearLabel(data.exam.academicYear).split(
    " - ",
  );
  const fullName = studentFullNameGu(st);
  const section = st.section || st.schoolClass?.name?.split("-").pop() || "";
  const resultText = rc?.result || "";
  const isPass = resultText.includes("પાસ") && !resultText.includes("નાપાસ");
  const isPromoted = resultText.includes("ઉપર ચઢાવવામાં");
  const isFail = resultText.includes("નાપાસ");
  const totalMaxMarks = data.subjects.reduce(
    (total, subject) => total + Number(subject.maxMarks || 0),
    0,
  );
  const subjectRows: Array<ResultCardData["subjects"][number] | null> = [
    ...data.subjects,
    ...Array.from(
      { length: Math.max(0, 10 - data.subjects.length) },
      () => null,
    ),
  ];

  return (
    <div
      className={`rc-sheet rc-front ${
        String(st.standard || "") === "9" ? "rc-front-std9" : ""
      }`}
    >
      <div className="rc-header">
        <div className="rc-school">{RESULT_SCHOOL.nameGu}</div>
        <div className="rc-title">
          વાર્ષિક પરીક્ષાનું પરિણામ પત્રક સને{" "}
          <Dot w={28} val={toGuDigits(yStart)} /> -{" "}
          <Dot w={28} val={toGuDigits(yEnd)} />
        </div>
        <div className="rc-section">{RESULT_SCHOOL.sectionGu}</div>
      </div>

      <div className="rc-student">
        <div className="rc-row">
          નામ : <Dot w={420} val={fullName} />
        </div>
        <div className="rc-row rc-row-3">
          <span>
            ધોરણ : <Dot w={50} val={toGuDigits(st.standard)} />
          </span>
          <span>
            વર્ગ : <Dot w={50} val={section} />
          </span>
          <span>
            પરીક્ષા ક્રમાંક : <Dot w={80} val={toGuDigits(st.rollNumber)} />
          </span>
        </div>
        <div className="rc-row rc-row-2">
          <span>
            જી.આર.નં. : <Dot w={100} val={toGuDigits(st.grNumber)} />
          </span>
          <span>
            રજી. નંબર : <Dot w={140} val={toGuDigits(st.childUid)} />
          </span>
        </div>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th className="rc-col-subject">વિષય</th>
            <th>
              કુલ
              <br />
              ગુણ
            </th>
            <th>
              મેળવેલ
              <br />
              ગુણ
            </th>
            <th>
              સિધ્ધિ
              <br />
              ગુણ
            </th>
            <th>
              કૃપા
              <br />
              ગુણ
            </th>
            <th>
              કુલ
              <br />
              ગુણ
            </th>
            <th className="rc-col-rank">રેન્ક</th>
          </tr>
        </thead>
        <tbody>
          {subjectRows.map((sub, i) => (
            <tr key={i}>
              <td className="rc-col-subject rc-subject-name">
                {sub ? subjectLabel(sub.name) : ""}
              </td>
              <td>{sub ? toGuDigits(sub.maxMarks) : ""}</td>
              <td className="rc-val">
                {sub ? toGuDigits(cell(sub.marksObtained)) : ""}
              </td>
              <td className="rc-val">
                {sub?.achievementMarks
                  ? toGuDigits(cell(sub.achievementMarks))
                  : ""}
              </td>
              <td className="rc-val">
                {sub?.graceMarks ? toGuDigits(cell(sub.graceMarks)) : ""}
              </td>
              <td className="rc-val rc-bold">
                {sub?.finalMarks != null
                  ? toGuDigits(cell(sub.finalMarks))
                  : ""}
              </td>
              <td />
            </tr>
          ))}
          <tr className="rc-total-row">
            <td className="rc-subject-name">કુલ માર્ક</td>
            <td className="rc-bold">{toGuDigits(totalMaxMarks)}</td>
            <td className="rc-val rc-bold">
              {toGuDigits(data.totals?.totalObtained)}
            </td>
            <td className="rc-val">
              {toGuDigits(data.totals?.totalAchievement || "")}
            </td>
            <td className="rc-val">
              {toGuDigits(data.totals?.totalGrace || "")}
            </td>
            <td className="rc-val rc-bold">
              {toGuDigits(data.totals?.totalFinal ?? rc?.totalMarks)}
            </td>
            <td className="rc-val rc-bold">{toGuDigits(rc?.rank)}</td>
          </tr>
        </tbody>
      </table>

      <div className="rc-footer">
        <div>
          પાસ નંબર <Dot w={120} val={toGuDigits(rc?.passNumber)} />
        </div>
        <div>
          વર્ષ દરમ્યાન <Dot w={40} val={toGuDigits(rc?.attendanceTotal)} />{" "}
          દિવસમાંથી <Dot w={40} val={toGuDigits(rc?.attendancePresent)} /> દિવસ
          હાજર
        </div>
        <div className="rc-result-line">
          પરિણામ :{" "}
          <span className={isPass && !isPromoted ? "rc-result-active" : ""}>
            પાસ થાય છે.
          </span>
          {" / "}
          <span className={isPromoted ? "rc-result-active" : ""}>
            ઉપર ચઢાવવામાં આવે છે.
          </span>
          {" / "}
          <span className={isFail ? "rc-result-active" : ""}>
            નાપાસ થાય છે.
          </span>
        </div>
      </div>
    </div>
  );
}

function ResultBack({ data }: { data: ResultCardData }) {
  const st = data.student;
  const reopening =
    data.reportCard?.reopeningDate || data.exam.reopeningDate || "";
  const addr = st.permanentAddress || st.currentAddress || "";
  const city = st.permanentCity || st.currentCity || "";
  const district = st.permanentDistrict || st.currentDistrict || "";
  const pin = st.permanentPincode || st.currentPincode || "";
  const fullName = studentFullNameGu(st);

  return (
    <div className="rc-sheet rc-back">
      <div className="rc-back-left">
        <div className="rc-back-msg">
          <div>
            (૧) રજાઓ પૂરી થતાં તા. <Dot w={70} val={reopening} /> થી
          </div>
          <div className="rc-back-indent">
            <Dot w={80} /> વાર <Dot w={60} /> થી
          </div>
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
          <div>
            નામ : <Dot w={150} val={fullName} />
          </div>
          <div>
            ઠેકાણું : <Dot w={150} val={addr} />
          </div>
          <div>
            મુકામ : <Dot w={120} val={city} />
          </div>
          <div>
            પોસ્ટ : <Dot w={120} />
          </div>
          <div>
            જિલ્લો : <Dot w={120} val={district} />
          </div>
          <div>
            પીન : <Dot w={70} val={pin} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnnualResultCard({
  data,
  inPairPage = false,
}: {
  data: ResultCardData;
  inPairPage?: boolean;
}) {
  const isStandard9 = String(data.student.standard || "") === "9";
  return (
    <div
      className={`annual-result-card ${
        isStandard9 ? "annual-result-card-std9" : ""
      } ${isStandard9 && !inPairPage ? "std9-result-page std9-result-page-single" : ""}`}
    >
      <ResultFront data={data} />
      {!isStandard9 ? <ResultBack data={data} /> : null}
      <style jsx global>{`
        .annual-result-card {
          font-family:
            "Nirmala UI", "Shruti", "Gujarati Sangam MN", "Noto Sans Gujarati",
            sans-serif;
          padding: 8px 0;
        }
        .rc-sheet {
          width: 178mm;
          max-width: 100%;
          margin: 0 auto 8mm;
          padding: 6mm 7mm 8mm;
          border: 1.4px solid ${INK};
          background: #fff;
          color: ${INK};
          box-sizing: border-box;
          page-break-after: always;
          box-shadow: 0 12px 35px rgba(120, 24, 83, 0.13);
        }
        .rc-front {
          min-height: 255mm;
          display: flex;
          flex-direction: column;
        }
        .rc-front-std9 {
          min-height: 260mm;
        }
        .rc-back {
          min-height: 130mm;
          display: flex;
          padding: 0;
          overflow: hidden;
        }
        .rc-header {
          text-align: center;
          margin-bottom: 5mm;
          line-height: 1.35;
        }
        .rc-school {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.015em;
        }
        .rc-title {
          font-size: 13px;
          font-weight: 700;
          margin-top: 4px;
        }
        .rc-section {
          font-size: 15px;
          font-weight: 700;
          margin-top: 2px;
        }
        .rc-dot {
          border-bottom: 1px dotted ${INK};
          display: inline-block;
          padding: 0 2px 1px;
          vertical-align: bottom;
          line-height: 1.2;
        }
        .rc-val,
        .rc-val strong {
          color: #111 !important;
          font-weight: 700;
        }
        .rc-student {
          font-size: 12px;
          margin-bottom: 2mm;
          line-height: 1.85;
        }
        .rc-row {
          margin-bottom: 2px;
        }
        .rc-row-3 {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rc-row-2 {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .rc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          table-layout: fixed;
        }
        .rc-table th,
        .rc-table td {
          border: 1px solid ${INK};
          height: 8.6mm;
          padding: 2px;
          text-align: center;
          vertical-align: middle;
        }
        .rc-table th {
          height: 13mm;
          font-weight: 700;
          font-size: 10.5px;
          line-height: 1.25;
          padding: 3px 2px;
        }
        .rc-col-subject {
          width: 26%;
          text-align: left !important;
          padding-left: 6px !important;
        }
        .rc-col-rank {
          width: 8%;
        }
        .rc-subject-name {
          text-align: left !important;
          padding-left: 6px !important;
          font-size: 10.5px;
        }
        .rc-bold {
          font-weight: 700;
        }
        .rc-total-row td {
          height: 11mm;
          font-weight: 700;
          padding-top: 3px;
          padding-bottom: 3px;
        }
        .rc-footer {
          margin-top: auto;
          padding-top: 5mm;
          font-size: 12px;
          line-height: 2.1;
        }
        .rc-result-line {
          margin-top: 2px;
        }
        .rc-result-active {
          font-weight: 800;
          text-decoration: underline;
          color: #111 !important;
        }
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
        .rc-back-msg {
          line-height: 2;
          font-size: 11px;
        }
        .rc-back-indent {
          padding-left: 16px;
        }
        .rc-back-sign {
          text-align: right;
          font-size: 10px;
          line-height: 1.6;
        }
        .rc-sign-space {
          height: 14mm;
        }
        .rc-back-school {
          font-weight: 700;
          margin-top: 4px;
        }
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
        .rc-address {
          line-height: 2;
        }
        .std9-result-page {
          position: relative;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, 95mm);
          width: 278mm;
          height: 190mm;
          margin: 0 auto 8mm;
          background: #fff;
          box-sizing: border-box;
          overflow: hidden;
        }
        .std9-result-page::after {
          content: "";
          position: absolute;
          top: 3mm;
          bottom: 3mm;
          left: 50%;
          border-left: 1px dashed #b8a3af;
          pointer-events: none;
        }
        .std9-result-page::before {
          content: "";
          position: absolute;
          left: 3mm;
          right: 3mm;
          top: 50%;
          border-top: 1px dashed #b8a3af;
          pointer-events: none;
        }
        .std9-result-page > .annual-result-card {
          min-width: 0;
          height: 95mm;
          padding: 1.5mm 3mm;
          box-sizing: border-box;
          display: flex;
          overflow: hidden;
        }
        .std9-result-page-single.annual-result-card {
          padding: 0;
        }
        .std9-result-page .rc-sheet {
          width: 100%;
          max-width: 136mm;
          height: 100%;
          min-height: 0;
          margin: 0 auto;
          padding: 2mm 3mm 2.5mm;
          overflow: hidden;
          border-color: #9f235f;
          box-shadow:
            inset 0 0 0 0.35mm #fff,
            inset 0 0 0 0.55mm rgba(159, 35, 95, 0.42);
          page-break-after: auto;
          break-after: auto;
        }
        .std9-result-page .rc-front {
          min-height: 0;
        }
        .std9-result-page .rc-header {
          margin-bottom: 1mm;
          padding: 0.35mm 1mm 0.45mm;
          border-bottom: 1px solid rgba(159, 35, 95, 0.35);
          border-radius: 1mm 1mm 0 0;
          background: linear-gradient(
            180deg,
            rgba(252, 231, 243, 0.85) 0%,
            rgba(255, 255, 255, 0) 100%
          );
          line-height: 1.35;
        }
        .std9-result-page .rc-school {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.015em;
        }
        .std9-result-page .rc-title {
          margin-top: 1px;
          font-size: 7.2px;
          color: #7f174d;
        }
        .std9-result-page .rc-section {
          margin-top: 0;
          font-size: 8.2px;
          font-weight: 800;
        }
        .std9-result-page .rc-student {
          margin-bottom: 0.8mm;
          font-size: 6.5px;
          line-height: 1.3;
          color: #541534;
        }
        .std9-result-page .rc-row {
          margin-bottom: 1px;
        }
        .std9-result-page .rc-row-3 {
          gap: 5px;
          flex-wrap: nowrap;
        }
        .std9-result-page .rc-row-2 {
          gap: 9px;
          flex-wrap: nowrap;
        }
        .std9-result-page .rc-table {
          font-size: 6.1px;
          border: 1.2px solid #8f1d56;
        }
        .std9-result-page .rc-table th,
        .std9-result-page .rc-table td {
          height: 4mm;
          padding: 0.5px;
          border-color: #ad3c73;
        }
        .std9-result-page .rc-table th {
          height: 6.1mm;
          font-size: 5.9px;
          font-weight: 900;
          line-height: 1.05;
          color: #66113d;
          background: #f9dfea;
        }
        .std9-result-page .rc-table tbody tr:nth-child(even):not(.rc-total-row) {
          background: #fff8fb;
        }
        .std9-result-page .rc-subject-name {
          padding-left: 3px !important;
          font-size: 6.3px;
        }
        .std9-result-page .rc-total-row td {
          height: 4.9mm;
          padding: 0.5px;
          border-top: 1.5px solid #83184d;
          color: #591231;
          background: #f5d3e3;
        }
        .std9-result-page .rc-footer {
          padding-top: 1.2mm;
          border-top: 1px dotted rgba(127, 23, 77, 0.45);
          font-size: 6.4px;
          line-height: 1.32;
          color: #541534;
        }
        .std9-result-page .rc-result-line {
          margin-top: 0;
          white-space: nowrap;
        }
        .std9-result-page .rc-result-active {
          color: #541534 !important;
          text-decoration: none;
          background: #f7dce8;
          box-shadow: inset 0 -1px 0 #9f235f;
        }
        @media print {
          .annual-result-card {
            padding: 0;
          }
          .rc-sheet {
            width: 178mm;
            margin: 0 auto;
            box-shadow: none;
          }
          .rc-front {
            min-height: 260mm;
            page-break-after: always;
            break-after: page;
          }
          .annual-result-card-std9 .rc-front {
            page-break-after: auto;
            break-after: auto;
          }
          .std9-result-page {
            width: 278mm;
            height: 190mm;
            min-height: 0;
            max-height: 190mm;
            margin: 0 auto;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .std9-result-page > .annual-result-card,
          .std9-result-page .rc-sheet {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .std9-result-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

export function AnnualResultCards({ cards }: { cards: ResultCardData[] }) {
  const standard9Only =
    cards.length > 0 &&
    cards.every((card) => String(card.student.standard || "") === "9");

  if (standard9Only) {
    const pages: ResultCardData[][] = [];
    for (let index = 0; index < cards.length; index += 4) {
      pages.push(cards.slice(index, index + 4));
    }
    return (
      <div className="result-all-cards result-all-cards-std9">
        {pages.map((pageCards, pageIndex) => (
          <div className="std9-result-page" key={`std9-page-${pageIndex}`}>
            {pageCards.map((card) => (
              <AnnualResultCard
                key={
                  (card.student.id || card.student.firstName) +
                  card.student.surname
                }
                data={card}
                inPairPage
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="result-all-cards">
      {cards.map((c) => (
        <AnnualResultCard
          key={(c.student.id || c.student.firstName) + c.student.surname}
          data={c}
        />
      ))}
    </div>
  );
}
