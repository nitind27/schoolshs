"use client";

/**
 * Upper Primary Leaving Certificate — layout matched to official blank scan
 * (packs 24261004403 / 24261004404).
 */
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { dateToWords } from "@/lib/certificates/date-to-words";
import type { LCData } from "@/components/certificates/leaving-certificate";
import {
  lcBirthPlaceEn,
  lcBirthPlaceGu,
  lcGuText,
  lcMotherEn,
  lcMotherGu,
  lcNameEn,
  lcNameGu,
  lcPlaceGu,
  lcPrinted,
  lcReligionCasteEn,
  lcReligionCasteGu,
} from "@/lib/certificates/lc-bilingual";
import "./lc-upper-primary.css";

const FONT = '"Times New Roman", Times, "Noto Serif Gujarati", Georgia, serif';

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

/** One underline; value sits above the rule with padding */
function Fill({
  value = "",
  style,
}: {
  value?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="lc-up-fill"
      style={{
        fontWeight: value ? 700 : 400,
        ...style,
      }}
    >
      {value || "\u00a0"}
    </span>
  );
}

function DobUnit({
  value,
  label,
  kind,
}: {
  value: string;
  label: string;
  kind: "day" | "month" | "year";
}) {
  return (
    <span className="lc-up-dob-unit">
      <span className={`lc-up-dob-box lc-up-dob-box--${kind}`}>{value || "\u00a0"}</span>
      <span className="lc-up-dob-label">{label}</span>
    </span>
  );
}

/**
 * English label + value on one underline; Gujarati caption under the label (no extra empty line).
 */
function FieldRow({
  n,
  en,
  gu,
  value,
  valueGu,
  longLabel,
}: {
  n: number;
  en: string;
  gu: string;
  value?: string;
  valueGu?: string;
  longLabel?: boolean;
}) {
  return (
    <div className="lc-up-field">
      <div className="lc-up-field-top">
        <span className={`lc-up-field-en${longLabel ? " lc-up-field-en--long" : ""}`}>
          {n}. {en}
        </span>
        <Fill value={value} />
      </div>
      <div className="lc-up-field-gu">
        <span>{gu}</span>
        {valueGu ? <Fill value={valueGu} /> : null}
      </div>
    </div>
  );
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const school = useCertificateBrand();
  const S = data.student;
  const p = data.print;
  const studentNameEn = lcPrinted(p?.nameEn, lcNameEn(S));
  const studentNameGu = lcPrinted(p?.nameGu, lcNameGu(S));
  const religionCasteEn = lcPrinted(p?.religionCasteEn, lcReligionCasteEn(S));
  const religionCasteGu = lcPrinted(p?.religionCasteGu, lcReligionCasteGu(S));
  const motherEn = lcPrinted(p?.motherEn, lcMotherEn(S));
  const motherGu = lcPrinted(p?.motherGu, lcMotherGu(S));
  const birthPlaceEn = lcPrinted(p?.birthPlaceEn, lcBirthPlaceEn(S));
  const birthPlaceGu = lcPrinted(p?.birthPlaceGu, lcBirthPlaceGu(S));
  const nativePlaceEn =
    data.nativePlace ||
    [S.permanentCity, S.permanentDistrict].filter(Boolean).join(", ") ||
    birthPlaceEn;
  const nativePlaceGu = data.nativePlace
    ? lcGuText(data.nativePlace)
    : lcPlaceGu([S.permanentCity, S.permanentDistrict]) || birthPlaceGu;
  const dob = S.dateOfBirth || "";
  const dobParts = parseDobParts(dob);
  const dobWordsEn = dateToWords(dob, "en");
  const dobWordsGu = dateToWords(dob, "gu");
  const studying =
    data.studyingStandard ||
    [S.standard ? `Std. ${S.standard}` : "", S.section].filter(Boolean).join("-");
  const studyingLine = [studying, data.studyingSince].filter(Boolean).join("  ");
  const studyingLineGu = [lcGuText(studying), data.studyingSince ? lcGuText(data.studyingSince) : ""]
    .filter(Boolean)
    .join("  ");
  const medium = data.medium || school.medium || "Gujarati / ગુજરાતી";
  const lastSchoolEn = lcPrinted(p?.lastSchoolEn, data.lastSchool || school.nameEnAlt);
  const lastSchoolGu = lcPrinted(
    p?.lastSchoolGu,
    data.lastSchool ? lcGuText(data.lastSchool) : school.nameGu || lcGuText(lastSchoolEn),
  );
  const apaar = data.apaarId || S.apaarId || "";
  const childUid = S.childUid || "";
  const bankAccount = S.accountNumber || "";
  const bankIfsc = [S.bankName, S.ifscCode].filter(Boolean).join("  ");
  const sectionLabel = school.section || "Granted Upper Primary Section";
  const addressEn = school.address || "Navagam, Ta. Songadh Dist. Tapi";
  const addressGu = school.addressGu || "નવાગામ તા. સોનગઢ, જી. તાપી";
  const schoolNameEn = school.nameEnAlt || school.nameEn;
  const schoolNameGu = school.nameGu;
  const lcNo = data.serialNo || "";

  return (
    <div className="lc-up-print-wrap">
      <div className="lc-up-sheet" style={{ fontFamily: FONT }}>
        <div className="lc-up-inner">
          <p className="lc-up-name-gu">{schoolNameGu}</p>
          <p className="lc-up-name-en">{schoolNameEn}</p>
          <p className="lc-up-section">{sectionLabel}</p>
          <p className="lc-up-address">
            {addressEn}
            <br />
            {addressGu}
          </p>

          <div className="lc-up-title-row">
            <p className="lc-up-title-gu">શાળા છોડ્યાનું પ્રમાણપત્ર</p>
            <p className="lc-up-title-en">School Leaving Certificate</p>
            <div className="lc-up-lcno">
              <span>L.C No./ક્રમ નં. :</span>
              <span className="lc-up-lcno-box">{lcNo || "\u00a0"}</span>
            </div>
          </div>

          <div className="lc-up-id-row">
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
              <Fill
                value={medium}
                style={{ flex: "0 0 auto", minWidth: 110, textAlign: "center" }}
              />
            </div>
          </div>

          <div className="lc-up-id-line">
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              APAAR ID No. (અપાર આઈડી નંબર)
            </span>
            <Fill value={apaar} />
          </div>

          <div className="lc-up-id-line lc-up-id-line--last">
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              Child Unique Id (વિદ્યાર્થીનો યુનિક આઈડી નંબર)
            </span>
            <Fill value={childUid} />
          </div>

          <FieldRow n={1} en="Full Name of the Student" gu="વિદ્યાર્થીનું પૂરેપૂરું નામ" value={studentNameEn} valueGu={studentNameGu} />
          <FieldRow n={2} en="Religion and Caste" gu="ધર્મ અને જાતિ" value={religionCasteEn} valueGu={religionCasteGu} />
          <FieldRow n={3} en="Mother's Name" gu="માતાનું નામ" value={motherEn} valueGu={motherGu} />
          <FieldRow
            n={4}
            en="Place of Birth (With Taluka/District)"
            gu="જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)"
            value={birthPlaceEn}
            valueGu={birthPlaceGu}
            longLabel
          />
          <FieldRow n={5} en="Native Place" gu="વતન" value={nativePlaceEn} valueGu={nativePlaceGu} />

          <div className="lc-up-dob">
            <div className="lc-up-dob-title">6. Date of Birth / જન્મ તારીખ</div>
            <div className="lc-up-dob-hint">
              (in Figures and words as per Christian Calendar) / ખ્રિસ્તી વર્ષ અનુસાર (આંકડામાં)
            </div>
            <div className="lc-up-dob-row">
              <div className="lc-up-dob-words">
                <span style={{ fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>
                  In Words / ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ શબ્દોમાં
                </span>
                <Fill value={[dobWordsEn, dobWordsGu].filter(Boolean).join(" / ")} />
              </div>
              <div className="lc-up-dob-boxes">
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
            value={lastSchoolEn}
            valueGu={lastSchoolGu}
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
            valueGu={studyingLineGu}
            longLabel
          />
          <FieldRow
            n={11}
            en="Reason of leaving the School"
            gu="શાળા છોડ્યાનું કારણ"
            value={data.reason || ""}
            valueGu={lcPrinted(p?.reasonGu, lcGuText(data.reason))}
          />

          <div className="lc-up-bank">
            <div className="lc-up-bank-row">
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                12. Bank Account No./બેંક ખાતા નંબર :
              </span>
              <Fill value={bankAccount} />
            </div>
            <div className="lc-up-bank-row">
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Bank Name & IFSC Code</span>
              <Fill value={bankIfsc} />
            </div>
          </div>

          <FieldRow n={13} en="Progress" gu="પ્રગતિ" value={data.progress || ""} valueGu={lcPrinted(p?.progressGu, lcGuText(data.progress))} />
          <FieldRow n={14} en="Conduct" gu="વર્તણૂંક" value={data.conduct || ""} valueGu={lcPrinted(p?.conductGu, lcGuText(data.conduct))} />
          <FieldRow n={15} en="Remarks" gu="વિશેષ નોંધ" value={data.remarks || ""} valueGu={lcPrinted(p?.remarksGu, lcGuText(data.remarks))} />

          <div className="lc-up-footer">
            <div className="lc-up-meta">
              <div className="lc-up-meta-row">
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  School Outward No./શાળાનો જાવક નંબર
                </span>
                <Fill value={data.outwardNo || ""} style={{ flex: "0 1 160px", maxWidth: 180 }} />
              </div>
              <div className="lc-up-meta-row">
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Date/તારીખ :</span>
                <Fill value={data.issueDate || ""} style={{ flex: "0 1 140px", maxWidth: 160 }} />
              </div>
            </div>

            <p className="lc-up-cert-en">
              I Certify that the above information is verified by me with school register and found
              to be correct.
            </p>
            <p className="lc-up-cert-gu">
              આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે. અને સાચી માલૂમ પડેલ છે.
            </p>

            <div className="lc-up-signs">
              <div>
                <div className="lc-up-sign-space" />
                <div className="lc-up-sign-label">Class Teacher (વર્ગ શિક્ષક) / Clerk (ક્લાર્ક)</div>
              </div>
              <div>
                <div className="lc-up-sign-space" />
                <div className="lc-up-sign-label">Principal (આચાર્ય)</div>
              </div>
            </div>

            <div className="lc-up-warning">
              <b>Statutory Warning :</b> No one can issue this certificate or make any Changes in
              any entry except the headmaster of the school or the authorized person appointed for
              such work in the absence or unavailability of the principal.
              <br />
              કાનૂની ચેતવણી : આ પ્રમાણપત્રમાં કોઈપણ ફેરફાર કરવા અથવા તે જારી કરવાનો અધિકાર ફક્ત શાળાના આચાર્યને અથવા તેમની ગેરહાજરીમાં નિમવામાં આવેલ અધિકૃત વ્યક્તિને છે.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
