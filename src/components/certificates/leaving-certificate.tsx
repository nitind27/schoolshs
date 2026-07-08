"use client";

import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";
import { studentFullName, dateToWords } from "@/lib/certificates/date-to-words";

export interface LCData {
  student: {
    firstName: string;
    middleName?: string | null;
    surname: string;
    grNumber?: string | null;
    religion?: string | null;
    caste?: string | null;
    motherName: string;
    dateOfBirth: string;
    currentCity?: string | null;
    currentDistrict?: string | null;
    standard?: string | null;
    section?: string | null;
    childUid?: string | null;
  };
  serialNo: string;
  lastSchool?: string;
  admissionDate?: string;
  leavingDate?: string;
  studyingStandard?: string;
  studyingSince?: string;
  reason?: string;
  progress?: string;
  conduct?: string;
  remarks?: string;
  sscExam?: string;
  sscSeatNo?: string;
  issueDate: string;
}

/* underline fill line */
function Line({
  v = "",
  w,
  flex,
  bold,
}: {
  v?: string;
  w?: number | string;
  flex?: number;
  bold?: boolean;
}) {
  return (
    <span style={{
      display: "inline-block",
      borderBottom: "1px solid #000",
      minWidth: w ?? 120,
      flex,
      verticalAlign: "bottom",
      lineHeight: "1.55",
      fontWeight: bold || v ? 600 : 400,
      letterSpacing: v ? "0.01em" : 0,
      paddingLeft: v ? 2 : 0,
      paddingRight: v ? 2 : 0,
    }}>
      {v}
    </span>
  );
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const S   = data.student;
  const nm  = studentFullName(S);
  const rc  = [S.religion, S.caste].filter(Boolean).join(" / ");
  const bp  = [S.currentCity, S.currentDistrict ? `Dist. ${S.currentDistrict}` : ""].filter(Boolean).join(", ");
  const dob = S.dateOfBirth;
  const dobW = dateToWords(dob, "en");
  const std  = data.studyingStandard || [S.standard, S.section].filter(Boolean).join("-");
  const uid  = (S.childUid || "").replace(/\D/g, "");
  const boxes = Array.from({ length: 18 }, (_, i) => uid[i] || "");

  /* shared font */
  const F: React.CSSProperties = {
    fontFamily: '"Times New Roman", "Times", Georgia, serif',
    color: "#000",
  };

  /* label style */
  const LB: React.CSSProperties = { fontWeight: 700, fontSize: 11 };
  const GU: React.CSSProperties = { fontSize: 10, display: "block", paddingLeft: 18, lineHeight: "1.6" };

  return (
    <div style={{
      ...F,
      fontSize: 11,
      background: "#fff",
      width: "100%",
      maxWidth: 680,
      margin: "0 auto",
      border: "1.5px solid #000",
      outline: "3px solid #000",
      outlineOffset: "3px",
      padding: "12px 18px 14px",
      boxSizing: "border-box",
      lineHeight: 1.45,
      printColorAdjust: "exact",
      WebkitPrintColorAdjust: "exact",
    }}>

      {/* ── TITLE ─────────────────────────────────────── */}
      <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "0 0 1px", letterSpacing: "0.1em" }}>
        SCHOOL LEAVING CERTIFICATE
      </p>
      <p style={{ textAlign: "center", fontWeight: 700, fontSize: 12, margin: "0 0 5px" }}>
        શાળા છોડ્યાનું પ્રમાણપત્ર
      </p>

      {/* ── SCHOOL NAME ───────────────────────────────── */}
      <p style={{ textAlign: "center", fontWeight: 700, fontSize: 18, margin: "0 0 0", letterSpacing: "0.01em" }}>
        {CERTIFICATE_SCHOOL.nameEnAlt}
      </p>
      <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, margin: "0 0 6px" }}>
        {CERTIFICATE_SCHOOL.nameGu}
      </p>

      {/* ── META ROW ──────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 6, borderTop: "1px solid #000", borderBottom: "1px solid #000", paddingTop: 4, paddingBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", width: "52%", paddingTop: 3 }}>
              <div>S.S.C. Index No. : <b>{CERTIFICATE_SCHOOL.sscIndex}</b>
                &nbsp;&nbsp;&nbsp; <b>Ta. Songadh, Dist. Tapi</b>
              </div>
              <div style={{ fontSize: 9 }}>
                એસ.એસ.સી. ઈન્ડેક્સ નં. : {CERTIFICATE_SCHOOL.sscIndex}
                &nbsp;&nbsp;&nbsp; તા. સોનગઢ, જિ. તાપી
              </div>
              <div style={{ marginTop: 2 }}>
                H.S.C. Index No. : <b>{CERTIFICATE_SCHOOL.hscIndex}</b>
                &nbsp;&nbsp;&nbsp; <b>Madhyamik / Ucchattar Madhyamik</b>
              </div>
              <div style={{ fontSize: 9 }}>
                એચ.એસ.સી. ઈન્ડેક્સ નં. : {CERTIFICATE_SCHOOL.hscIndex}
              </div>
              <div style={{ marginTop: 2 }}>
                ડાયસ કોડ નં. {CERTIFICATE_SCHOOL.diseCode}
              </div>
            </td>
            <td style={{ verticalAlign: "top", textAlign: "right", paddingTop: 3 }}>
              <div>
                No.&nbsp;
                <span style={{ display: "inline-block", borderBottom: "1px solid #000", minWidth: 48, fontWeight: 700, fontSize: 13, textAlign: "center" }}>
                  {data.serialNo}
                </span>
              </div>
              <div style={{ marginTop: 4 }}>
                G.R.No./જી.આર.નં. :&nbsp;
                <Line v={S.grNumber || ""} w={60} />
              </div>
              <div style={{ marginTop: 4 }}>
                Medium/માધ્યમ :&nbsp;
                <u style={{ fontWeight: 600 }}>ગુજરાતી/Gujarati</u>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FIELDS ────────────────────────────────────── */}
      <div style={{ marginTop: 4 }}>

        {/* 1 */}
        <Row n="1">
          <span style={LB}>Full Name of the Student&nbsp;</span><Line v={nm} flex={1} />
          <span style={GU}>વિદ્યાર્થીનું પૂરેપૂરું નામ&nbsp;<Line v={nm} flex={1} /></span>
        </Row>

        {/* 2 */}
        <Row n="2">
          <span style={LB}>Religion and Caste&nbsp;</span><Line v={rc} flex={1} />
          <span style={GU}>ધર્મ અને જાતિ&nbsp;<Line v={rc} flex={1} /></span>
        </Row>

        {/* 3 */}
        <Row n="3">
          <span style={LB}>Mother&apos;s Name&nbsp;</span><Line v={S.motherName} flex={1} />
          <span style={GU}>માતાનું નામ&nbsp;<Line v={S.motherName} flex={1} /></span>
        </Row>

        {/* 4 */}
        <Row n="4">
          <span style={LB}>Place of Birth <span style={{ fontWeight: 400, fontSize: 10 }}>(With Taluka/District)</span>&nbsp;</span>
          <Line v={bp} flex={1} />
          <span style={GU}>જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)&nbsp;<Line v={bp} flex={1} /></span>
        </Row>

        {/* 5 */}
        <Row n="5">
          <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 4 }}>
            <span style={LB}>Date of Birth&nbsp;</span>
            <Line v={dob} w={100} />
          </div>
          <div style={{ fontSize: 10, lineHeight: "1.6", marginTop: 1 }}>
            (in Figures and words as per Christian Calendar)
          </div>
          <div style={{ fontSize: 10, display: "flex", alignItems: "flex-end", gap: 4, marginTop: 1 }}>
            <span>ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ&nbsp;</span>
            <Line v={dob} w={80} />
          </div>
          <div style={{ fontSize: 10, display: "flex", alignItems: "flex-end", gap: 4 }}>
            <span>(આંકડામાં અને શબ્દમાં)&nbsp;</span>
            <Line v={dobW} w={180} />
          </div>
        </Row>

        {/* 6 */}
        <Row n="6">
          <span style={LB}>Last School Attended&nbsp;</span>
          <Line v={data.lastSchool || CERTIFICATE_SCHOOL.nameEnAlt} flex={1} />
          <span style={GU}>જ્યાં ભણ્યો હોય તે છેલ્લી શાળા&nbsp;
            <Line v={data.lastSchool || CERTIFICATE_SCHOOL.nameEnAlt} flex={1} />
          </span>
        </Row>

        {/* 7 + 8 */}
        <Row n="">
          <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 6 }}>
            <span style={LB}>7.&nbsp;Date of Admission(With Class)&nbsp;</span>
            <Line v={data.admissionDate || ""} w={90} />
            <span style={{ ...LB, marginLeft: 8 }}>8.&nbsp;Date of Leaving the School&nbsp;</span>
            <Line v={data.leavingDate || ""} w={90} />
          </div>
          <div style={{ fontSize: 10, display: "flex", gap: 8, marginTop: 1 }}>
            <span>પ્રવેશ તારીખ (ધોરણ સહિત)&nbsp;<Line v={data.admissionDate || ""} w={70} /></span>
            <span style={{ marginLeft: 12 }}>શાળા છોડ્યા તારીખ&nbsp;<Line v={data.leavingDate || ""} w={70} /></span>
          </div>
        </Row>

        {/* 9 */}
        <Row n="9">
          <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap", gap: 4 }}>
            <span style={LB}>In which Standard he/she&nbsp;</span>
            <Line v={std} w={70} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 2 }}>
            <span style={LB}>Studying &amp; Since When?&nbsp;</span>
            <Line v={data.studyingSince || ""} w={160} />
          </div>
          <span style={GU}>
            કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?&nbsp;
            <Line v={std} w={90} />
          </span>
        </Row>

        {/* 10 */}
        <Row n="10">
          <span style={LB}>Reason of leaving the School&nbsp;</span>
          <Line v={data.reason || "Further Education"} flex={1} />
          <span style={GU}>શાળા છોડ્યાનું કારણ&nbsp;
            <Line v={data.reason || "Further Education"} flex={1} />
          </span>
        </Row>

        {/* 11 */}
        <Row n="11">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <span style={LB}>Progress /&nbsp;</span>
            <span style={{ fontSize: 10 }}>પ્રગતિ&nbsp;</span>
            <Line v={data.progress || "Good"} w={200} />
          </div>
        </Row>

        {/* 12 */}
        <Row n="12">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <span style={LB}>Conduct /&nbsp;</span>
            <span style={{ fontSize: 10 }}>વર્તણૂંક&nbsp;</span>
            <Line v={data.conduct || "Good"} w={200} />
          </div>
        </Row>

        {/* 13 */}
        <Row n="13">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                <span style={LB}>Remarks /&nbsp;</span>
                <span style={{ fontSize: 10 }}>વિશેષ નોંધ&nbsp;</span>
                <Line v={data.remarks || ""} w={80} />
              </div>
            </div>
            {/* SSC box */}
            <div style={{
              border: "1px solid #000",
              padding: "3px 8px",
              fontSize: 10,
              flexShrink: 0,
              minWidth: 180,
            }}>
              <div style={{ fontWeight: 700, textAlign: "center", fontSize: 10, marginBottom: 2 }}>
                Appeared in S.S.C. Exam
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, fontSize: 10 }}>
                <span>March /&nbsp;</span>
                <Line v={data.sscExam || ""} w={28} />
                <span>&nbsp;Seat No.&nbsp;</span>
                <Line v={data.sscSeatNo || ""} w={60} />
              </div>
            </div>
          </div>
        </Row>

        {/* 14 — UID */}
        <Row n="14">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={LB}>UID No. /&nbsp;</span>
            <span style={{ fontSize: 10 }}>યુઆઈડી નં.&nbsp;</span>
            <div style={{ display: "flex", gap: 1 }}>
              {boxes.map((ch, i) => (
                <div key={i} style={{
                  width: 17, height: 20,
                  border: "1px solid #000",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: ch ? 700 : 400,
                }}>
                  {ch}
                </div>
              ))}
            </div>
          </div>
        </Row>

      </div>{/* end fields */}

      {/* ── DATE + CERTIFY ────────────────────────────── */}
      <div style={{ marginTop: 8, borderTop: "1px solid #ccc", paddingTop: 5 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "baseline", marginBottom: 3 }}>
          <span style={{ fontWeight: 700 }}>Date :</span>
          <Line v={data.issueDate} w={90} />
        </div>
        <p style={{ fontSize: 9, margin: "0 0 1px", fontWeight: 700 }}>તારીખ :</p>
        <p style={{ fontSize: 9, lineHeight: 1.55, margin: 0 }}>
          I Certifiy that the above information is verified by me with school register and found to be correct.
        </p>
        <p style={{ fontSize: 9, lineHeight: 1.55, margin: 0 }}>
          આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે
          કરવામાં આવેલ છે. અને સાચી માલુમ પડેલ છે.
        </p>
      </div>

      {/* ── SIGNATURES ───────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 11 }}>
        {[
          { en: "Clerk", gu: "ક્લાર્ક" },
          { en: "Class Teacher", gu: "વર્ગ શિક્ષક" },
          { en: "Principal", gu: "આચાર્ય" },
        ].map(({ en, gu }) => (
          <div key={en} style={{ textAlign: "center", minWidth: 100 }}>
            <div style={{ height: 28 }} />{/* signature space */}
            <div style={{ borderTop: "1px solid #000", paddingTop: 3 }}>
              <div style={{ fontWeight: 700 }}>{en}</div>
              <div style={{ fontSize: 10 }}>{gu}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── STATUTORY WARNING ────────────────────────── */}
      <div style={{ marginTop: 8, borderTop: "1px solid #000", paddingTop: 5, fontSize: 8, lineHeight: 1.55 }}>
        <span style={{ fontWeight: 700 }}>Statutory Warning : </span>
        No one can issue this certificate or make any Changes in any entry except the Principal of the school or the authorized person appointed for such work in the absence or unavailability of the principal
        <br />
        : શાળાના આચાર્ય અથવા તેમની ગેરહાજરીમાં સહી કરવા માટે અધિકૃત કરેલ વ્યક્તિ સિવાય અન્ય કોઈ
        વ્યક્તિ આ પ્રમાણપત્ર આપી શકશે નહીં તેની કોઈ નોંધમાં ફેરફાર કરી શકશે નહીં.
      </div>
    </div>
  );
}

/* ── helper: numbered row wrapper ────────────────── */
function Row({ n, children }: { n: string | number; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      marginBottom: 5,
      paddingBottom: 3,
      borderBottom: "0.5px solid #e0e0e0",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
        {n !== "" && (
          <span style={{
            fontWeight: 700,
            fontSize: 11,
            flexShrink: 0,
            minWidth: 18,
            fontFamily: '"Times New Roman", Times, serif',
          }}>
            {n}.
          </span>
        )}
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
