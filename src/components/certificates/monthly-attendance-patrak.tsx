"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import type { MonthlyPatrakData } from "@/lib/certificates/types";
import { GUJARATI_MONTHS } from "@/lib/certificates/types";

function C({ b, g }: { b: number | string; g: number | string }) {
  return (
    <>
      <td style={{ textAlign: "center" }}>{b}</td>
      <td style={{ textAlign: "center" }}>{g}</td>
    </>
  );
}

export function MonthlyAttendancePatrakView({ data }: { data: MonthlyPatrakData }) {
  const monthName = GUJARATI_MONTHS[parseInt(data.month, 10) - 1] || data.month;

  return (
    <div className="cert-page" style={{ fontSize: "7px", padding: 4 }}>
      <div style={{ background: "#333", color: "#fff", textAlign: "center", padding: "3px 0", fontWeight: "bold", fontSize: "9px" }}>
        માધ્યમિક / ઉચ્ચતર માધ્યમિક વિભાગ
      </div>
      <h2 style={{ textAlign: "center", fontSize: "10px", fontWeight: "bold", margin: "6px 0" }}>
        :: માસિક હાજરી પત્રક ::
      </h2>
      <div style={{ display: "flex", gap: 16, fontSize: "8px", marginBottom: 4 }}>
        <span>માહે <u>{monthName}</u> ૨૦<u>{data.year.slice(-2)}</u></span>
        <span>ધોરણ <u>{data.standard}</u></span>
        <span>વર્ગ <u>{data.section}</u></span>
        <span>વર્ગ શિક્ષક <u>{data.classTeacher}</u></span>
      </div>

      <table className="cert-table" style={{ fontSize: "6.5px" }}>
        <thead>
          <tr>
            <th rowSpan={3} style={{ width: 60 }}>વિદ્યાર્થીના પ્રકાર</th>
            <th colSpan={2} rowSpan={2}>માસના પ્રથમ દિવસે સંખ્યા</th>
            <th colSpan={8}>આ માસમાં દાખલ થયા</th>
            <th colSpan={8}>આ માસમાં વર્ગમાંથી</th>
            <th colSpan={2} rowSpan={2}>આ માસમાં થયેલ ફેરફાર</th>
            <th colSpan={2} rowSpan={2}>માસ છેલ્લા દિવસે સંખ્યા</th>
            <th rowSpan={3}>નોંધ</th>
          </tr>
          <tr>
            <th colSpan={2}>નવા — ત્યાં ફી આપીને</th>
            <th colSpan={2}>નવા — ત્યાં ફી આપ્યા વિના</th>
            <th colSpan={2}>બીજા વર્ગમાંથી — ફી આપીને</th>
            <th colSpan={2}>બીજા વર્ગમાંથી — ફી આપ્યા વિના</th>
            <th colSpan={2}>શાળા છોડીને — ફી આપીને</th>
            <th colSpan={2}>શાળા છોડીને — ફી આપ્યા વિના</th>
            <th colSpan={2}>બીજા વર્ગમાં — ફી આપીને</th>
            <th colSpan={2}>બીજા વર્ગમાં — ફી આપ્યા વિના</th>
          </tr>
          <tr>
            <th>કુમાર</th><th>કન્યા</th>
            <th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th>
            <th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th>
            <th>કુ.</th><th>ક.</th><th>કુ.</th><th>ક.</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: "આખી ફી આપનાર", d: data.opening.fullFee, adm: data.admitted, l: data.left, ch: data.change, cl: data.closing },
          ].map((row, i) => (
            <tr key={i}>
              <td>{row.label}</td>
              <C b={row.d.boys} g={row.d.girls} />
              <C b={row.adm.newPaid.boys} g={row.adm.newPaid.girls} />
              <C b={row.adm.newUnpaid.boys} g={row.adm.newUnpaid.girls} />
              <C b={row.adm.transferPaid.boys} g={row.adm.transferPaid.girls} />
              <C b={row.adm.transferUnpaid.boys} g={row.adm.transferUnpaid.girls} />
              <C b={row.l.schoolPaid.boys} g={row.l.schoolPaid.girls} />
              <C b={row.l.schoolUnpaid.boys} g={row.l.schoolUnpaid.girls} />
              <C b={row.l.classPaid.boys} g={row.l.classPaid.girls} />
              <C b={row.l.classUnpaid.boys} g={row.l.classUnpaid.girls} />
              <C b={row.ch.boys} g={row.ch.girls} />
              <C b={row.cl.boys} g={row.cl.girls} />
              <td></td>
            </tr>
          ))}
          <tr>
            <td>કુલ</td>
            <C b={data.opening.total.boys} g={data.opening.total.girls} />
            <td colSpan={16}></td>
            <C b={data.closing.boys} g={data.closing.girls} />
            <td></td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <table className="cert-table" style={{ flex: 1, fontSize: "6.5px" }}>
          <thead>
            <tr><th colSpan={3}>જાતિ / ધર્મ વિભાજન</th></tr>
            <tr><th></th><th>કુમાર</th><th>કન્યા</th></tr>
          </thead>
          <tbody>
            {([
              ["અનુ. જાતિ", data.caste.sc], ["અનુ. જનજાતિ", data.caste.st], ["NBC વિ.મુ. જાતિ", data.caste.vj],
              ["બક્ષીપંચ", data.caste.obc], ["કુલ હિન્દુ", data.caste.hindu], ["મુસલમાન", data.caste.muslim],
              ["શીખ", data.caste.sikh], ["પારસી", data.caste.parsi], ["ખ્રિસ્તી", data.caste.christian],
            ] as Array<[string, { boys: number; girls: number }]>).map(([label, c]) => (
              <tr key={label}><td>{label}</td><C b={c.boys} g={c.girls} /></tr>
            ))}
            <tr><td>સરાસરી હાજરી</td><C b={data.avgAttendance.boys} g={data.avgAttendance.girls} /></tr>
          </tbody>
        </table>
        <table className="cert-table" style={{ width: 140, fontSize: "6.5px" }}>
          <thead>
            <tr><th colSpan={2}>કામના દિવસો</th></tr>
          </thead>
          <tbody>
            <tr><td>કામના આખા દિવસો</td><td>{data.workingDays.full}</td></tr>
            <tr><td>કામના અડધા દિવસો</td><td>{data.workingDays.half}</td></tr>
            <tr><td>રવિવારની સંખ્યા</td><td>{data.workingDays.sundays}</td></tr>
            <tr><td>અન્ય રજાઓ</td><td>{data.workingDays.holidays}</td></tr>
            <tr><td>ગત માસ સરવાળો</td><td>{data.workingDays.prevTotal}</td></tr>
            <tr><td>આ માસ</td><td>{data.workingDays.monthTotal}</td></tr>
            <tr><td>કુલ સરવાળો</td><td>{data.workingDays.cumulative}</td></tr>
          </tbody>
        </table>
      </div>

      <table className="cert-table" style={{ marginTop: 8, fontSize: "6.5px" }}>
        <thead>
          <tr>
            <th colSpan={3}>શાળા ફી</th>
            <th colSpan={3}>સત્ર ફી</th>
            <th colSpan={3}>અન્ય</th>
            <th colSpan={2}>પાછળું લેણું</th>
            <th rowSpan={2}>તારીખ</th>
            <th rowSpan={2}>પૈસા ભરનારની સહી</th>
            <th rowSpan={2}>પૈસા લેનારની સહી</th>
          </tr>
          <tr>
            <th>સંખ્યા</th><th>રૂ.</th><th>પૈસા</th>
            <th>સંખ્યા</th><th>રૂ.</th><th>પૈસા</th>
            <th>સંખ્યા</th><th>રૂ.</th><th>પૈસા</th>
            <th>શાળા ફી</th><th>સત્ર ફી</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{data.fees.schoolCount}</td><td>{data.fees.schoolRs}</td><td>{data.fees.schoolPs}</td>
            <td>{data.fees.termCount}</td><td>{data.fees.termRs}</td><td>{data.fees.termPs}</td>
            <td>{data.fees.otherCount}</td><td>{data.fees.otherRs}</td><td>{data.fees.otherPs}</td>
            <td>{data.fees.arrearsSchool}</td><td>{data.fees.arrearsTerm}</td>
            <td>{data.date}</td><td></td><td></td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: "6px", marginTop: 4, textAlign: "center" }}>{CERTIFICATE_SCHOOL.nameGu} — {CERTIFICATE_SCHOOL.addressGu}</p>
    </div>
  );
}
