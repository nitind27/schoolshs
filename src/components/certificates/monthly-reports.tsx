"use client";

import type { ScholarshipReportRow, AdmissionReportRow, LeaverReportRow } from "@/lib/certificates/types";
import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";

function padScholarship(rows: ScholarshipReportRow[], n: number): ScholarshipReportRow[] {
  const out = [...rows];
  while (out.length < n) out.push({ grNumber: "", name: "", waiverType: "", standard: "", conduct: "", presentDays: "" });
  return out.slice(0, n);
}

function padAdmission(rows: AdmissionReportRow[], n: number): AdmissionReportRow[] {
  const out = [...rows];
  while (out.length < n) out.push({ serial: out.length + 1, grNumber: "", name: "", admissionDate: "", note: "" });
  return out.slice(0, n);
}

function padLeaver(rows: LeaverReportRow[], n: number): LeaverReportRow[] {
  const out = [...rows];
  while (out.length < n) out.push({ serial: out.length + 1, grNumber: "", name: "", leavingDate: "", reason: "", standard: "", conduct: "", feePaid: "", outstanding: "", note: "" });
  return out.slice(0, n);
}

function ScholarshipTable({ rows, title }: { rows: ScholarshipReportRow[]; title?: string }) {
  const data = padScholarship(rows, 10);
  return (
    <table className="cert-table" style={{ fontSize: "8px", width: "100%" }}>
      {title && <caption style={{ fontWeight: "bold", marginBottom: 4, fontSize: "9px" }}>{title}</caption>}
      <thead>
        <tr>
          <th style={{ width: 40 }}>જ.ર. નંબર</th>
          <th>વિદ્યાર્થીનું નામ</th>
          <th style={{ width: 70 }}>માફીનો પ્રકાર</th>
          <th style={{ width: 40 }}>અભ્યાસ</th>
          <th style={{ width: 40 }}>વર્તણૂંક</th>
          <th style={{ width: 50 }}>આ માસમાં હાજર દિવસ</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td>{r.grNumber}</td>
            <td>{r.name}</td>
            <td>{r.waiverType}</td>
            <td>{r.standard}</td>
            <td>{r.conduct}</td>
            <td>{r.presentDays}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MonthlyReportsView({
  scholarship,
  admissions,
  leavers,
  month,
  year,
}: {
  scholarship: ScholarshipReportRow[];
  admissions: AdmissionReportRow[];
  leavers: LeaverReportRow[];
  month: string;
  year: string;
}) {
  const half = Math.ceil(scholarship.length / 2) || 10;
  const left = padScholarship(scholarship.slice(0, half), 10);
  const right = padScholarship(scholarship.slice(half), 10);
  const adm = padAdmission(admissions, 6);
  const lev = padLeaver(leavers, 6);

  return (
    <div className="cert-page cert-reports" style={{ fontSize: "9px", padding: "12px 16px", color: "#1a5c6e" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "11px", fontWeight: "bold" }}>{CERTIFICATE_SCHOOL.nameGu}</div>
        <div style={{ fontSize: "10px", marginTop: 4 }}>
          સરકારી માફી, શાળા માફી અને શિષ્યવૃત્તિ મેળવનાર વિદ્યાર્થીઓનો અહેવાલ
        </div>
        <div style={{ fontSize: "8px", marginTop: 2 }}>માહે {month} ૨૦{year.slice(-2)}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}><ScholarshipTable rows={left} /></div>
        <div style={{ flex: 1 }}><ScholarshipTable rows={right} /></div>
      </div>

      <h3 style={{ textAlign: "center", fontSize: "10px", fontWeight: "bold", margin: "12px 0 6px" }}>
        નવા દાખલ થયેલ વિદ્યાર્થીઓનો અહેવાલ
      </h3>
      <table className="cert-table cert-reports-table" style={{ fontSize: "8px", width: "100%", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ width: 30 }}>અનુ. નં.</th>
            <th style={{ width: 50 }}>જ.ર. નંબર</th>
            <th>વિદ્યાર્થીનું નામ</th>
            <th style={{ width: 60 }}>દાખલ તારીખ</th>
            <th style={{ width: 60 }}>નોંધ</th>
          </tr>
        </thead>
        <tbody>
          {adm.map((r) => (
            <tr key={r.serial}>
              <td style={{ textAlign: "center" }}>{r.serial}</td>
              <td>{r.grNumber}</td>
              <td>{r.name}</td>
              <td>{r.admissionDate}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ textAlign: "center", fontSize: "10px", fontWeight: "bold", margin: "12px 0 6px" }}>
        શાળા છોડી ગયેલ વિદ્યાર્થીઓનો અહેવાલ
      </h3>
      <table className="cert-table cert-reports-table" style={{ fontSize: "7px", width: "100%" }}>
        <thead>
          <tr>
            <th>અનુ. નં.</th>
            <th>જ.ર. નંબર</th>
            <th>વિદ્યાર્થીનું નામ</th>
            <th>શાળા છોડવાની તારીખ</th>
            <th>કારણ</th>
            <th>અભ્યાસ</th>
            <th>વર્તણૂંક</th>
            <th>ફી ભરી?</th>
            <th>બાકી રકમ</th>
            <th>નોંધ</th>
          </tr>
        </thead>
        <tbody>
          {lev.map((r) => (
            <tr key={r.serial}>
              <td style={{ textAlign: "center" }}>{r.serial}</td>
              <td>{r.grNumber}</td>
              <td>{r.name}</td>
              <td>{r.leavingDate}</td>
              <td>{r.reason}</td>
              <td>{r.standard}</td>
              <td>{r.conduct}</td>
              <td>{r.feePaid}</td>
              <td>{r.outstanding}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 16, fontSize: "8px", textAlign: "center" }}>
        ઉપરના ખાનાઓમાં ભરેલી હકીકત જનરલ રજીસ્ટર પ્રમાણે ખરી છે.
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: "8px" }}>
        <span>વર્ગ શિક્ષક<br />તા. - ૨૦{year.slice(-2)}</span>
        <span>તપાસનીશ<br />તા. - ૨૦{year.slice(-2)}</span>
        <span>આચાર્ય / આચાર્યા<br />તા. - ૨૦{year.slice(-2)}</span>
      </div>
    </div>
  );
}
