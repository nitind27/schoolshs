"use client";

/**
 * Upper Primary / Granted section Leaving Certificate
 * Matches official blank used for packs 24261004403 & 24261004404
 * (also assignable by Super Admin to any school).
 */
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { studentFullName, dateToWords } from "@/lib/certificates/date-to-words";
import type { LCData } from "@/components/certificates/leaving-certificate";

const FONT = '"Times New Roman", Times, Georgia, serif';

function parseDobParts(dob: string): { d: string; m: string; y: string } {
  const s = (dob || "").trim();
  if (!s) return { d: "", m: "", y: "" };
  // dd/mm/yyyy or dd-mm-yyyy
  const slash = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slash) {
    return {
      d: slash[1].padStart(2, "0"),
      m: slash[2].padStart(2, "0"),
      y: slash[3].length === 2 ? `20${slash[3]}` : slash[3],
    };
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (iso) {
    return {
      d: iso[3].padStart(2, "0"),
      m: iso[2].padStart(2, "0"),
      y: iso[1],
    };
  }
  return { d: "", m: "", y: "" };
}

function Line({
  value = "",
  minWidth = 80,
  flex,
}: {
  value?: string;
  minWidth?: number | string;
  flex?: number;
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
        fontWeight: value ? 700 : 400,
        padding: "0 3px 1px",
        wordBreak: "break-word",
      }}
    >
      {value || "\u00a0"}
    </span>
  );
}

function DobBox({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 52 }}>
      <div
        style={{
          border: "1.5px solid #111",
          minWidth: 48,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          margin: "0 auto",
        }}
      >
        {value || "\u00a0"}
      </div>
      <div style={{ fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
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
        gridTemplateColumns: "1.4rem 1fr",
        columnGap: 6,
        marginBottom: 6,
        alignItems: "start",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.35 }}>{n}.</span>
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
          <span style={{ fontWeight: 700 }}>{en}</span>
          {children}
        </div>
        {gu ? (
          <div style={{ marginTop: 1, fontSize: 10, lineHeight: 1.35, color: "#111" }}>{gu}</div>
        ) : null}
      </div>
    </div>
  );
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const school = useCertificateBrand();
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
  const nativePlace =
    data.nativePlace ||
    [S.permanentCity, S.permanentDistrict].filter(Boolean).join(", ") ||
    birthPlace;
  const dob = S.dateOfBirth || "";
  const dobParts = parseDobParts(dob);
  const dobWords = dateToWords(dob, "en");
  const studying =
    data.studyingStandard ||
    [S.standard ? `Std ${S.standard}` : "", S.section].filter(Boolean).join("-");
  const studyingLine = [studying, data.studyingSince].filter(Boolean).join(" · ");
  const medium = data.medium || school.medium || "Gujarati / ગુજરાતી";
  const lastSchool = data.lastSchool || school.nameEnAlt;
  const apaar = data.apaarId || S.apaarId || "";
  const childUid = S.childUid || "";
  const bankAccount = S.accountNumber || "";
  const bankIfsc = [S.bankName, S.ifscCode].filter(Boolean).join(" / ");
  const sectionLabel = school.section || "Granted Upper Primary Section";
  const addressLine =
    school.address ||
    [school.addressGu].filter(Boolean).join("") ||
    "Navagam, Ta. Songadh Dist. Tapi";

  return (
    <div
      className="lc-up-sheet"
      style={{
        fontFamily: FONT,
        color: "#000",
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        background: "#fff",
      }}
    >
      <div
        style={{
          border: "2px solid #111",
          padding: "10px 14px 12px",
          boxSizing: "border-box",
        }}
      >
        {/* Header — school first (matches scan) */}
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.3 }}>
          {school.nameGu}
        </p>
        <p
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: 16,
            margin: "2px 0 0",
            letterSpacing: "0.02em",
            lineHeight: 1.25,
          }}
        >
          {school.nameEnAlt || school.nameEn}
        </p>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 12, margin: "3px 0 0" }}>
          {sectionLabel}
        </p>
        <p style={{ textAlign: "center", fontSize: 11, margin: "2px 0 0", fontWeight: 600 }}>
          {addressLine}
        </p>
        {school.addressGu ? (
          <p style={{ textAlign: "center", fontSize: 10, margin: "1px 0 0" }}>{school.addressGu}</p>
        ) : null}

        <p
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: 15,
            margin: "10px 0 2px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          School Leaving Certificate
        </p>
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
          શાળા છોડ્યાનું પ્રમાણપત્ર
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: 11,
            marginBottom: 6,
            gap: 6,
            alignItems: "flex-end",
          }}
        >
          <span style={{ fontWeight: 700 }}>L.C No. / ક્રમ નંબર :</span>
          <Line value={data.serialNo} minWidth={72} />
        </div>

        {/* ID row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr 1fr",
            gap: 8,
            fontSize: 10.5,
            marginBottom: 5,
            alignItems: "end",
          }}
        >
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>G.R.No. / જી.આર.નં. :</span>
            <Line value={S.grNumber || ""} minWidth={56} flex={1} />
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              School Dise No. (સ્કૂલ ડાયસ નં.)
            </span>
            <Line value={school.diseCode} minWidth={90} flex={1} />
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Medium / માધ્યમ :</span>
            <Line value={medium} minWidth={70} flex={1} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "flex-end",
            fontSize: 10.5,
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            APAAR ID No. (અપાર આઈડી નંબર)
          </span>
          <Line value={apaar} minWidth={120} flex={1} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "flex-end",
            fontSize: 10.5,
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            Child Unique Id (વિદ્યાર્થીનો યુનિક આઈડી નંબર)
          </span>
          <Line value={childUid} minWidth={120} flex={1} />
        </div>

        <Field n={1} en="Full Name of the Student" gu="વિદ્યાર્થીનું પૂરેપૂરું નામ">
          <Line value={nm} minWidth={160} flex={1} />
        </Field>
        <Field n={2} en="Religion and Caste" gu="ધર્મ અને જાતિ">
          <Line value={religionCaste} minWidth={140} flex={1} />
        </Field>
        <Field n={3} en="Mother's Name" gu="માતાનું નામ">
          <Line value={S.motherName || ""} minWidth={140} flex={1} />
        </Field>
        <Field
          n={4}
          en={
            <>
              Place of Birth <span style={{ fontWeight: 400 }}>(With Taluka/District)</span>
            </>
          }
          gu="જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)"
        >
          <Line value={birthPlace} minWidth={140} flex={1} />
        </Field>
        <Field n={5} en="Native Place" gu="વતન">
          <Line value={nativePlace} minWidth={140} flex={1} />
        </Field>

        <Field
          n={6}
          en="Date of Birth"
          gu="જન્મ તારીખ (ખ્રિસ્તી વર્ષ અનુસાર(આંકડામાં))"
        >
          <span style={{ width: "100%", fontWeight: 400, fontSize: 9.5 }}>
            (in Figures and words as per Christian Calendar)
          </span>
          <div
            style={{
              width: "100%",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              marginTop: 4,
              marginBottom: 2,
            }}
          >
            <DobBox value={dobParts.d} label="તારીખ" />
            <DobBox value={dobParts.m} label="માસ" />
            <DobBox value={dobParts.y} label="વર્ષ" />
          </div>
          <span style={{ width: "100%", fontSize: 10, display: "flex", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              In Words / ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ શબ્દોમાં
            </span>
            <Line value={dobWords} minWidth={160} flex={1} />
          </span>
        </Field>

        <Field n={7} en="Last School Attended" gu="જ્યાં ભણ્યો હોય તે છેલ્લી શાળા">
          <Line value={lastSchool} minWidth={140} flex={1} />
        </Field>
        <Field n={8} en="Date of Admission (With Class)" gu="પ્રવેશ તારીખ (ધોરણ સહિત)">
          <Line value={data.admissionDate || ""} minWidth={140} flex={1} />
        </Field>
        <Field n={9} en="Date of Leaving the School" gu="શાળા છોડ્યા તારીખ">
          <Line value={data.leavingDate || ""} minWidth={140} flex={1} />
        </Field>
        <Field
          n={10}
          en="In which Standard he/she Studying & Since When?"
          gu="કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?"
        >
          <Line value={studyingLine} minWidth={140} flex={1} />
        </Field>
        <Field n={11} en="Reason of leaving the School" gu="શાળા છોડવાનું કારણ">
          <Line value={data.reason || ""} minWidth={140} flex={1} />
        </Field>

        <Field n={12} en="Bank Account No. / બેંક ખાતા નંબર :" gu={undefined}>
          <Line value={bankAccount} minWidth={140} flex={1} />
          <span
            style={{
              width: "100%",
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              marginTop: 4,
              fontSize: 10.5,
            }}
          >
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Bank Name & IFSC Code</span>
            <Line value={bankIfsc} minWidth={140} flex={1} />
          </span>
        </Field>

        <Field n={13} en="Progress" gu="પ્રગતિ">
          <Line value={data.progress || ""} minWidth={140} flex={1} />
        </Field>
        <Field n={14} en="Conduct" gu="વર્તણૂક">
          <Line value={data.conduct || ""} minWidth={140} flex={1} />
        </Field>
        <Field n={15} en="Remarks" gu="વિશેષ નોંધ">
          <Line value={data.remarks || ""} minWidth={140} flex={1} />
        </Field>

        {/* Footer meta */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 12,
            marginTop: 10,
            fontSize: 11,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              School Outward No. / શાળાનો જાવક નંબર
            </span>
            <Line value={data.outwardNo || data.serialNo} minWidth={80} flex={1} />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Date / તારીખ :</span>
            <Line value={data.issueDate} minWidth={90} flex={1} />
          </div>
        </div>

        <p style={{ margin: "10px 0 2px", fontSize: 10, lineHeight: 1.45, fontWeight: 600 }}>
          I Certify that the above information is verified by me with school register and found to be
          correct.
        </p>
        <p style={{ margin: 0, fontSize: 9.5, lineHeight: 1.45 }}>
          આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે અને સાચી માલૂમ પડેલ છે.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 34,
            fontSize: 11,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 28 }} />
            <div style={{ borderTop: "1px solid #111", paddingTop: 4 }}>
              <div style={{ fontWeight: 700 }}>Class Teacher (વર્ગ શિક્ષક) / Clerk (ક્લાર્ક)</div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 28 }} />
            <div style={{ borderTop: "1px solid #111", paddingTop: 4 }}>
              <div style={{ fontWeight: 700 }}>Principal (આચાર્ય)</div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid #111",
            paddingTop: 6,
            fontSize: 8,
            lineHeight: 1.45,
          }}
        >
          <b>Statutory Warning :</b> No one can issue this certificate or make any changes in any
          entry except the Principal of the school or the authorized person appointed for such work
          in the absence or unavailability of the Principal.
          <br />
          <b>કાનૂની ચેતવણી :</b> આ પ્રમાણપત્ર ફક્ત શાળાના આચાર્ય અથવા તેમની ગેરહાજરીમાં અધિકૃત વ્યક્તિ જ જારી કરી શકે અથવા તેમાં ફેરફાર કરી શકે.
        </div>
      </div>
    </div>
  );
}
