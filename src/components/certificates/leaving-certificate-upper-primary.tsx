"use client";

/**
 * Upper Primary Leaving Certificate — layout matched to official blank scan
 * (packs 24261004403 / 24261004404).
 */
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { studentFullName, dateToWords } from "@/lib/certificates/date-to-words";
import type { LCData } from "@/components/certificates/leaving-certificate";
import "./lc-upper-primary.css";

const FONT = '"Times New Roman", Times, "Noto Serif Gujarati", Georgia, serif';
const INK = "#111";

function parseDobParts(dob: string): { d: string; m: string; y: string } {
  const raw = (dob || "").trim();
  if (!raw) return { d: "", m: "", y: "" };

  // Strip time / ISO timestamp: 2018-08-08T00:00:00.000Z → 2018-08-08
  const s = raw.includes("T") ? raw.slice(0, 10) : raw;

  // yyyy-mm-dd / yyyy/mm/dd (try first — avoids "2018/08/08" matching as dd/mm)
  const iso = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (iso) {
    return {
      d: iso[3].padStart(2, "0"),
      m: iso[2].padStart(2, "0"),
      y: iso[1],
    };
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    return {
      d: dmy[1].padStart(2, "0"),
      m: dmy[2].padStart(2, "0"),
      y: dmy[3],
    };
  }

  // dd/mm/yy
  const dmy2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (dmy2) {
    return {
      d: dmy2[1].padStart(2, "0"),
      m: dmy2[2].padStart(2, "0"),
      y: `20${dmy2[3]}`,
    };
  }

  return { d: "", m: "", y: "" };
}

/** Fill underline that grows to the right */
function Fill({
  value = "",
  style,
}: {
  value?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        flex: 1,
        minWidth: 40,
        borderBottom: `1px solid ${INK}`,
        verticalAlign: "bottom",
        lineHeight: 1.25,
        fontWeight: value ? 700 : 400,
        padding: "0 2px 1px",
        fontSize: 12,
        ...style,
      }}
    >
      {value || "\u00a0"}
    </span>
  );
}

/** One DOB unit — box on top, Gu label under it. Sibling units sit in a flex row. */
function DobUnit({
  value,
  label,
  kind,
}: {
  value: string;
  label: string;
  kind: "day" | "month" | "year";
}) {
  const w = kind === "year" ? 68 : 42;
  return (
    <span
      className="lc-up-dob-unit"
      style={{
        display: "inline-block",
        verticalAlign: "top",
        textAlign: "center",
        width: w,
        maxWidth: w,
      }}
    >
      <span
        className={`lc-up-dob-box lc-up-dob-box--${kind}`}
        style={{
          display: "inline-block",
          border: `1.5px solid ${INK}`,
          width: w,
          height: 28,
          lineHeight: "28px",
          fontWeight: 800,
          fontSize: 13,
          boxSizing: "border-box",
          background: "#fff",
          textAlign: "center",
          verticalAlign: "middle",
        }}
      >
        {value || "\u00a0"}
      </span>
      <span
        className="lc-up-dob-label"
        style={{
          display: "block",
          fontSize: 11,
          marginTop: 4,
          fontWeight: 700,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * Scan-style field:
 *  n. English label ........................ value
 *     Gujarati label ...................... (optional second fill)
 */
function FieldRow({
  n,
  en,
  gu,
  value,
  afterEn,
}: {
  n: number;
  en: string;
  gu: string;
  value?: string;
  afterEn?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          fontSize: 12,
          lineHeight: 1.25,
        }}
      >
        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          {n}. {en}
        </span>
        {afterEn}
        <Fill value={value} />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          marginTop: 2,
          marginLeft: 14,
          fontSize: 11,
          lineHeight: 1.25,
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>{gu}</span>
        <Fill />
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
    [S.standard ? `Std. ${S.standard}` : "", S.section].filter(Boolean).join("-");
  const studyingLine = [studying, data.studyingSince].filter(Boolean).join("  ");
  const medium = data.medium || school.medium || "Gujarati / ગુજરાતી";
  const lastSchool = data.lastSchool || school.nameEnAlt;
  const apaar = data.apaarId || S.apaarId || "";
  const childUid = S.childUid || "";
  const bankAccount = S.accountNumber || "";
  const bankIfsc = [S.bankName, S.ifscCode].filter(Boolean).join("  ");
  const sectionLabel = school.section || "Granted Upper Primary Section";
  const addressEn = school.address || "Navagam, Ta. Songadh Dist. Tapi";
  const addressGu = school.addressGu || "નવાગામ તા. સોનગઢ, જી. તાપી";
  const nameEn = school.nameEnAlt || school.nameEn;
  const nameGu = school.nameGu;
  const lcNo = data.serialNo || "";

  return (
    <div
      className="lc-up-sheet"
      style={{
        fontFamily: FONT,
        color: INK,
        width: "100%",
        maxWidth: 780,
        margin: "0 auto",
        background: "#fff",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{
          border: `1.5px solid ${INK}`,
          padding: "12px 16px 10px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* ── Header (scan order) ── */}
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 15,
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {nameGu}
        </p>
        <p
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: 17,
            margin: "3px 0 0",
            letterSpacing: "0.01em",
            lineHeight: 1.2,
          }}
        >
          {nameEn}
        </p>
        <p
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 13,
            margin: "4px 0 0",
          }}
        >
          {sectionLabel}
        </p>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            margin: "3px 0 0",
            fontWeight: 600,
            lineHeight: 1.35,
          }}
        >
          {addressEn}
          <br />
          {addressGu}
        </p>

        {/* Title + L.C No */}
        <div style={{ position: "relative", marginTop: 10, marginBottom: 8 }}>
          <p
            style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: 16,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            શાળા છોડ્યાનું પ્રમાણપત્ર
          </p>
          <p
            style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: 15,
              margin: "2px 0 0",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            School Leaving Certificate
          </p>
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span>L.C No./ક્રમ નં. :</span>
            <span
              style={{
                border: `1px solid ${INK}`,
                minWidth: 48,
                padding: "1px 8px",
                textAlign: "center",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {lcNo || "\u00a0"}
            </span>
          </div>
        </div>

        {/* ── ID block (scan: GR | DISE | Medium on one row) ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 10,
            fontSize: 11,
            marginBottom: 6,
            flexWrap: "nowrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: "1 1 0", minWidth: 0 }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>G.R.No./જી.આર.નં. :</span>
            <Fill value={S.grNumber || ""} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flex: "1.2 1 0", minWidth: 0 }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              School Dise No.(સ્કૂલ ડાયસ નં.)
            </span>
            <span style={{ fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              {school.diseCode}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Medium/માધ્યમ :</span>
            <span
              style={{
                fontWeight: 700,
                borderBottom: `1px solid ${INK}`,
                padding: "0 4px 1px",
                minWidth: 100,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {medium}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
            fontSize: 12,
            marginBottom: 5,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            APAAR ID No. (અપાર આઈડી નંબર)
          </span>
          <Fill value={apaar} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            Child Unique Id (વિદ્યાર્થીનો યુનિક આઈડી નંબર)
          </span>
          <Fill value={childUid} />
        </div>

        {/* ── Fields 1–15 ── */}
        <FieldRow n={1} en="Full Name of the Student" gu="વિદ્યાર્થીનું પૂરેપૂરું નામ" value={nm} />
        <FieldRow n={2} en="Religion and Caste" gu="ધર્મ અને જાતિ" value={religionCaste} />
        <FieldRow n={3} en="Mother's Name" gu="માતાનું નામ" value={S.motherName || ""} />
        <FieldRow
          n={4}
          en="Place of Birth (With Taluka/District)"
          gu="જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)"
          value={birthPlace}
        />
        <FieldRow n={5} en="Native Place" gu="વતન" value={nativePlace} />

        {/* 6. DOB — scan layout: title; then In Words (left) + 3 boxes (right) ONE flex row */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>
            6. Date of Birth / જન્મ તારીખ
          </div>
          <div
            style={{
              marginLeft: 14,
              fontSize: 10,
              marginTop: 1,
              marginBottom: 4,
              fontWeight: 400,
            }}
          >
            (in Figures and words as per Christian Calendar) / ખ્રિસ્તી વર્ષ અનુસાર
            (આંકડામાં)
          </div>

          <div
            className="lc-up-dob-row"
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "flex-end",
              gap: 10,
              marginLeft: 14,
              marginTop: 4,
            }}
          >
            {/* LEFT: In Words + fill line */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                flex: "1 1 auto",
                minWidth: 0,
                fontSize: 10,
                paddingBottom: 14,
              }}
            >
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>
                In Words / ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ શબ્દોમાં
              </span>
              <Fill value={dobWords} />
            </div>

            {/* RIGHT: તારીખ | માસ | વર્ષ boxes */}
            <div
              className="lc-up-dob-boxes"
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                alignItems: "flex-start",
                gap: 10,
                flex: "0 0 auto",
              }}
            >
              <DobUnit value={dobParts.d} label="તારીખ" kind="day" />
              <DobUnit value={dobParts.m} label="માસ" kind="month" />
              <DobUnit value={dobParts.y} label="વર્ષ" kind="year" />
            </div>
          </div>
        </div>

        <FieldRow
          n={7}
          en="Last School Attended"
          gu="જ્યાં ભણ્યો હોય તે છેલ્લી શાળા"
          value={lastSchool}
        />
        <FieldRow
          n={8}
          en="Date of Admission(With Class)"
          gu="પ્રવેશ તારીખ (ધોરણ સહિત)"
          value={data.admissionDate || ""}
        />
        <FieldRow
          n={9}
          en="Date of Leaving the School"
          gu="શાળા છોડ્યા તારીખ"
          value={data.leavingDate || ""}
        />
        <FieldRow
          n={10}
          en="In which Standard he/she Studying & Since When?"
          gu="કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?"
          value={studyingLine}
        />
        <FieldRow
          n={11}
          en="Reason of leaving the School"
          gu="શાળા છોડ્યાનું કારણ"
          value={data.reason || ""}
        />

        {/* 12. Bank */}
        <div style={{ marginBottom: 7 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              12. Bank Account No./બેંક ખાતા નંબર :
            </span>
            <Fill value={bankAccount} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              marginTop: 5,
              marginLeft: 14,
              fontSize: 12,
            }}
          >
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              Bank Name & IFSC Code
            </span>
            <Fill value={bankIfsc} />
          </div>
        </div>

        <FieldRow n={13} en="Progress" gu="પ્રગતિ" value={data.progress || ""} />
        <FieldRow n={14} en="Conduct" gu="વર્તણૂંક" value={data.conduct || ""} />
        <FieldRow n={15} en="Remarks" gu="વિશેષ નોંધ" value={data.remarks || ""} />

        {/* Footer */}
        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              School Outward No./શાળાનો જાવક નંબર
            </span>
            <Fill
              value={data.outwardNo || ""}
              style={{ flex: "0 1 160px", maxWidth: 180 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 10 }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Date/તારીખ :</span>
            <Fill
              value={data.issueDate || ""}
              style={{ flex: "0 1 140px", maxWidth: 160 }}
            />
          </div>
        </div>

        <p
          style={{
            margin: "0 0 2px",
            fontSize: 11,
            lineHeight: 1.45,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          I Certify that the above information is verified by me with school register and found to
          be correct.
        </p>
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45 }}>
          આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે. અને સાચી માલૂમ પડેલ છે.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            marginTop: 40,
            fontSize: 12,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 36 }} />
            <div style={{ fontWeight: 700 }}>
              Class Teacher (વર્ગ શિક્ષક) / Clerk (ક્લાર્ક)
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: 36 }} />
            <div style={{ fontWeight: 700 }}>Principal (આચાર્ય)</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${INK}`,
            paddingTop: 6,
            fontSize: 8.5,
            lineHeight: 1.45,
            textAlign: "justify",
          }}
        >
          <b>Statutory Warning :</b> No one can issue this certificate or make any Changes in any
          entry except the headmaster of the school or the authorized person appointed for such work
          in the absence or unavailability of the principal.
          <br />
          કાનૂની ચેતવણી : આ પ્રમાણપત્રમાં કોઈપણ ફેરફાર કરવા અથવા તે જારી કરવાનો અધિકાર ફક્ત શાળાના આચાર્યને અથવા તેમની ગેરહાજરીમાં નિમવામાં આવેલ અધિકૃત વ્યક્તિને છે.
        </div>
      </div>

    </div>
  );
}
