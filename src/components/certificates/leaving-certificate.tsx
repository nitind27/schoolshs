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
    birthTaluka?: string | null;
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
  medium?: string;
  issueDate: string;
}

const FONT = '"Times New Roman", Times, Georgia, serif';

function Fill({
  value = "",
  minWidth = 80,
  flex,
  center,
}: {
  value?: string;
  minWidth?: number | string;
  flex?: number;
  center?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        borderBottom: "1px solid #111",
        minWidth,
        flex: flex ?? undefined,
        verticalAlign: "bottom",
        lineHeight: 1.35,
        fontWeight: value ? 600 : 400,
        padding: "0 3px 1px",
        textAlign: center ? "center" : "left",
        wordBreak: "break-word",
      }}
    >
      {value || "\u00a0"}
    </span>
  );
}

function Field({
  n,
  en,
  gu,
  children,
}: {
  n: number | string;
  en: React.ReactNode;
  gu?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.35rem 1fr",
        columnGap: 6,
        marginBottom: 7,
        alignItems: "start",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.4 }}>{n}.</span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "2px 6px",
            fontSize: 11,
            lineHeight: 1.35,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{en}</span>
          {children}
        </div>
        {gu ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "2px 6px",
              marginTop: 2,
              fontSize: 10,
              lineHeight: 1.4,
            }}
          >
            {gu}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const S = data.student;
  const nm = studentFullName(S);
  const religionCaste = [S.religion, S.caste].filter(Boolean).join(" / ");
  const birthPlace = [
    S.currentCity,
    S.birthTaluka ? `Ta. ${S.birthTaluka}` : null,
    S.currentDistrict ? `Dist. ${S.currentDistrict}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const dob = S.dateOfBirth || "";
  const dobWords = dateToWords(dob, "en");
  const studying =
    data.studyingStandard ||
    [S.standard ? `Std ${S.standard}` : "", S.section].filter(Boolean).join("-");
  const uid = (S.childUid || "").replace(/\D/g, "");
  const uidBoxes = Array.from({ length: 18 }, (_, i) => uid[i] || "");
  const medium = data.medium || "ગુજરાતી / Gujarati";
  const lastSchool = data.lastSchool || CERTIFICATE_SCHOOL.nameEnAlt;

  return (
    <div className="lc-sheet" style={{ fontFamily: FONT, color: "#000", width: "100%", maxWidth: 720, margin: "0 auto" }}>
      {/* Double border like official blank */}
      <div
        style={{
          border: "2.5px solid #111",
          padding: 3,
          background: "#fff",
          boxSizing: "border-box",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <div
          style={{
            border: "1px solid #111",
            padding: "10px 14px 12px",
            boxSizing: "border-box",
          }}
        >
          {/* Title */}
          <p
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: 14,
              margin: 0,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            SCHOOL LEAVING CERTIFICATE
          </p>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "1px 0 6px" }}>
            શાળા છોડ્યાનું પ્રમાણપત્ર
          </p>

          {/* School name */}
          <p
            style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: 17,
              margin: 0,
              letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}
          >
            {CERTIFICATE_SCHOOL.nameEnAlt}
          </p>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "2px 0 8px" }}>
            {CERTIFICATE_SCHOOL.nameGu}
          </p>

          {/* Meta — 3 columns like physical LC */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 1fr 0.95fr",
              gap: 8,
              borderTop: "1px solid #111",
              borderBottom: "1px solid #111",
              padding: "6px 0 7px",
              marginBottom: 10,
              fontSize: 10,
              lineHeight: 1.45,
            }}
          >
            <div>
              <div>
                S.S.C. Index No. : <b>{CERTIFICATE_SCHOOL.sscIndex}</b>
              </div>
              <div style={{ fontSize: 9 }}>એસ.એસ.સી. ઈન્ડેક્સ નં. : {CERTIFICATE_SCHOOL.sscIndex}</div>
              <div style={{ marginTop: 3 }}>
                H.S.C. Index No. : <b>{CERTIFICATE_SCHOOL.hscIndex}</b>
              </div>
              <div style={{ fontSize: 9 }}>એચ.એસ.સી. ઈન્ડેક્સ નં. : {CERTIFICATE_SCHOOL.hscIndex}</div>
              <div style={{ marginTop: 3 }}>
                Dise Code No. : <b>{CERTIFICATE_SCHOOL.diseCode}</b>
              </div>
              <div style={{ fontSize: 9 }}>ડાયસ કોડ નં. : {CERTIFICATE_SCHOOL.diseCode}</div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>Ta. Songadh, Dist. Tapi</div>
              <div style={{ fontSize: 9 }}>{CERTIFICATE_SCHOOL.addressGu}</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Madhyamik / Ucchattar Madhyamik</div>
              <div style={{ fontSize: 9 }}>માધ્યમિક / ઉચ્ચત્તર માધ્યમિક</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div>
                No. :{" "}
                <Fill value={data.serialNo} minWidth={52} center />
              </div>
              <div style={{ marginTop: 6 }}>
                G.R. No. / જી.આર.નં. : <Fill value={S.grNumber || ""} minWidth={56} center />
              </div>
              <div style={{ marginTop: 6 }}>
                Medium / માધ્યમ : <span style={{ fontWeight: 600, textDecoration: "underline" }}>{medium}</span>
              </div>
            </div>
          </div>

          {/* Fields 1–14 */}
          <Field n={1} en="Full Name of the Student" gu={<>વિદ્યાર્થીનું પૂરેપૂરું નામ <Fill value={nm} flex={1} minWidth={160} /></>}>
            <Fill value={nm} flex={1} minWidth={180} />
          </Field>

          <Field n={2} en="Religion and Caste" gu={<>ધર્મ અને જાતિ <Fill value={religionCaste} flex={1} minWidth={140} /></>}>
            <Fill value={religionCaste} flex={1} minWidth={160} />
          </Field>

          <Field n={3} en="Mother's Name" gu={<>માતાનું નામ <Fill value={S.motherName || ""} flex={1} minWidth={140} /></>}>
            <Fill value={S.motherName || ""} flex={1} minWidth={160} />
          </Field>

          <Field
            n={4}
            en={
              <>
                Place of Birth <span style={{ fontWeight: 400 }}>(With Taluka / District)</span>
              </>
            }
            gu={<>જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત) <Fill value={birthPlace} flex={1} minWidth={140} /></>}
          >
            <Fill value={birthPlace} flex={1} minWidth={160} />
          </Field>

          <Field
            n={5}
            en="Date of Birth"
            gu={
              <>
                ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ <Fill value={dob} minWidth={96} />
              </>
            }
          >
            <Fill value={dob} minWidth={110} />
            <span style={{ width: "100%", fontWeight: 400, fontSize: 9.5, marginTop: 2 }}>
              (In Figures and words as per Christian Calendar)
            </span>
            <span style={{ width: "100%", fontSize: 10, marginTop: 2, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end" }}>
              <span>(આંકડામાં અને શબ્દમાં)</span>
              <Fill value={dobWords} flex={1} minWidth={200} />
            </span>
          </Field>

          <Field n={6} en="Last School Attended" gu={<>જ્યાં ભણ્યો હોય તે છેલ્લી શાળા <Fill value={lastSchool} flex={1} minWidth={140} /></>}>
            <Fill value={lastSchool} flex={1} minWidth={160} />
          </Field>

          {/* 7 + 8 on same row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.35rem 1fr",
              columnGap: 6,
              marginBottom: 7,
            }}
          >
            <span />
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontWeight: 700 }}>7. Date of Admission (With Class)</span>
                  <Fill value={data.admissionDate || ""} flex={1} minWidth={90} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ fontWeight: 700 }}>8. Date of Leaving the School</span>
                  <Fill value={data.leavingDate || ""} flex={1} minWidth={90} />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 2,
                  fontSize: 10,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 4 }}>
                  <span>પ્રવેશ તારીખ (ધોરણ સહિત)</span>
                  <Fill value={data.admissionDate || ""} flex={1} minWidth={70} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 4 }}>
                  <span>શાળા છોડ્યા તારીખ</span>
                  <Fill value={data.leavingDate || ""} flex={1} minWidth={70} />
                </div>
              </div>
            </div>
          </div>

          <Field
            n={9}
            en="In which Standard he/she Studying & Since When?"
            gu={
              <>
                કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?{" "}
                <Fill value={[studying, data.studyingSince].filter(Boolean).join(" · ")} flex={1} minWidth={140} />
              </>
            }
          >
            <Fill value={studying} minWidth={90} />
            <Fill value={data.studyingSince || ""} flex={1} minWidth={120} />
          </Field>

          <Field n={10} en="Reason for leaving the School" gu={<>શાળા છોડ્યાનું કારણ <Fill value={data.reason || ""} flex={1} minWidth={140} /></>}>
            <Fill value={data.reason || ""} flex={1} minWidth={160} />
          </Field>

          <Field n={11} en="Progress" gu={<>પ્રગતિ <Fill value={data.progress || ""} flex={1} minWidth={140} /></>}>
            <Fill value={data.progress || ""} flex={1} minWidth={160} />
          </Field>

          <Field n={12} en="Conduct" gu={<>વર્તણૂંક <Fill value={data.conduct || ""} flex={1} minWidth={140} /></>}>
            <Fill value={data.conduct || ""} flex={1} minWidth={160} />
          </Field>

          <Field n={13} en="Remarks" gu={<>વિશેષ નોંધ <Fill value={data.remarks || ""} flex={1} minWidth={140} /></>}>
            <Fill value={data.remarks || ""} flex={1} minWidth={120} />
            <span
              style={{
                width: "100%",
                marginTop: 4,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: 6,
                fontSize: 10.5,
                fontWeight: 600,
              }}
            >
              Appeared in S.S.C. Exam March /
              <Fill value={data.sscExam || ""} minWidth={48} center />
              Seat No.
              <Fill value={data.sscSeatNo || ""} minWidth={90} center />
            </span>
          </Field>

          <Field
            n={14}
            en={
              <>
                UID No. / <span style={{ fontWeight: 600 }}>યુઆઈડી નં.</span>
              </>
            }
          >
            <div style={{ display: "flex", gap: 1.5, flexWrap: "nowrap" }}>
              {uidBoxes.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 19,
                    border: "1px solid #111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: ch ? 700 : 400,
                    flexShrink: 0,
                  }}
                >
                  {ch || ""}
                </div>
              ))}
            </div>
          </Field>

          {/* Date + certify */}
          <div style={{ marginTop: 10, borderTop: "1px solid #bbb", paddingTop: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 6, fontSize: 11 }}>
              <span style={{ fontWeight: 700 }}>Date / તારીખ :</span>
              <Fill value={data.issueDate} minWidth={110} />
            </div>
            <p style={{ margin: "0 0 2px", fontSize: 10, lineHeight: 1.5, fontWeight: 600 }}>
              I Certify that the above information is verified by me with school register and found to be correct.
            </p>
            <p style={{ margin: 0, fontSize: 9.5, lineHeight: 1.5 }}>
              આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે અને સાચી માલૂમ પડેલ છે.
            </p>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginTop: 28,
              fontSize: 11,
            }}
          >
            {[
              { en: "Clerk", gu: "કલાર્ક" },
              { en: "Class Teacher", gu: "વર્ગ શિક્ષક" },
              { en: "Principal", gu: "આચાર્ય" },
            ].map((s) => (
              <div key={s.en} style={{ textAlign: "center" }}>
                <div style={{ height: 32 }} />
                <div style={{ borderTop: "1px solid #111", paddingTop: 4 }}>
                  <div style={{ fontWeight: 700 }}>{s.en}</div>
                  <div style={{ fontSize: 10 }}>{s.gu}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Statutory warning */}
          <div
            style={{
              marginTop: 12,
              borderTop: "1px solid #111",
              paddingTop: 6,
              fontSize: 8,
              lineHeight: 1.5,
            }}
          >
            <b>Statutory Warning :</b> No one can issue this certificate or make any changes in any entry except the
            Principal of the school or the authorized person appointed for such work in the absence or unavailability of
            the Principal.
            <br />
            : શાળાના આચાર્ય અથવા તેમની ગેરહાજરીમાં સહી કરવા માટે અધિકૃત કરેલ વ્યક્તિ સિવાય અન્ય કોઈ વ્યક્તિ આ પ્રમાણપત્ર આપી શકશે નહીં કે
            તેની કોઈ નોંધમાં ફેરફાર કરી શકશે નહીં.
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .lc-sheet {
            max-width: none !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
