"use client";

/**
 * Upper Primary Leaving Certificate — layout matched to official blank scan
 * (packs 24261004403 / 24261004404).
 * Every line is click-to-edit, same as the bonafide certificate.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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

/** Click-to-edit text. Commits on blur so print uses the edited line. */
function Editable({
  value,
  onChange,
  className,
  style,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const shown = value || "\u00a0";
    if (el.textContent !== shown) el.textContent = shown;
  }, [value]);

  return (
    <span
      ref={ref}
      className={`lc-up-edit${className ? ` ${className}` : ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const raw = e.currentTarget.textContent || "";
        const next = multiline
          ? raw.replace(/\u00a0/g, " ").trim()
          : raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\s+/g, " "));
      }}
    />
  );
}

/** One underline; value sits above the rule with padding */
function Fill({
  value = "",
  onChange,
  style,
}: {
  value?: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <Editable
      value={value}
      onChange={onChange}
      className="lc-up-fill"
      style={{ fontWeight: value ? 700 : 400, ...style }}
    />
  );
}

function DobUnit({
  value,
  label,
  kind,
  onValue,
  onLabel,
}: {
  value: string;
  label: string;
  kind: "day" | "month" | "year";
  onValue: (v: string) => void;
  onLabel: (v: string) => void;
}) {
  return (
    <span className="lc-up-dob-unit">
      <Editable
        value={value}
        onChange={onValue}
        className={`lc-up-dob-box lc-up-dob-box--${kind}`}
      />
      <Editable value={label} onChange={onLabel} className="lc-up-dob-label" />
    </span>
  );
}

/**
 * English label + value on one underline; Gujarati caption + value on the line below.
 */
function FieldRow({
  n,
  en,
  gu,
  value,
  valueGu,
  onEn,
  onGu,
  onValue,
  onValueGu,
}: {
  n: number;
  en: string;
  gu: string;
  value?: string;
  valueGu?: string;
  onEn: (v: string) => void;
  onGu: (v: string) => void;
  onValue: (v: string) => void;
  onValueGu?: (v: string) => void;
}) {
  return (
    <div className="lc-up-field">
      <div className="lc-up-field-top">
        <Editable
          value={`${n}. ${en}`}
          onChange={(v) => onEn(v.replace(/^\d+\.\s*/, ""))}
          className="lc-up-field-en"
        />
        <Fill value={value} onChange={onValue} />
      </div>
      <div className="lc-up-field-gu">
        <Editable value={gu} onChange={onGu} />
        {onValueGu ? <Fill value={valueGu} onChange={onValueGu} /> : null}
      </div>
    </div>
  );
}

type LCFields = {
  schoolNameGu: string;
  schoolNameEn: string;
  sectionLabel: string;
  addressEn: string;
  addressGu: string;
  titleGu: string;
  titleEn: string;
  lcNoLabel: string;
  lcNo: string;
  grLabel: string;
  grNumber: string;
  diseLabel: string;
  diseCode: string;
  mediumLabel: string;
  medium: string;
  apaarLabel: string;
  apaar: string;
  uidLabel: string;
  childUid: string;
  nameEnLabel: string;
  nameGuLabel: string;
  nameEn: string;
  nameGu: string;
  casteEnLabel: string;
  casteGuLabel: string;
  casteEn: string;
  casteGu: string;
  motherEnLabel: string;
  motherGuLabel: string;
  motherEn: string;
  motherGu: string;
  birthEnLabel: string;
  birthGuLabel: string;
  birthEn: string;
  birthGu: string;
  nativeEnLabel: string;
  nativeGuLabel: string;
  nativeEn: string;
  nativeGu: string;
  dobTitle: string;
  dobHint: string;
  dobWordsLabel: string;
  dobWords: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  dobDayLabel: string;
  dobMonthLabel: string;
  dobYearLabel: string;
  lastEnLabel: string;
  lastGuLabel: string;
  lastEn: string;
  lastGu: string;
  admEnLabel: string;
  admGuLabel: string;
  admission: string;
  leaveEnLabel: string;
  leaveGuLabel: string;
  leaving: string;
  studyEnLabel: string;
  studyGuLabel: string;
  studyEn: string;
  studyGu: string;
  reasonEnLabel: string;
  reasonGuLabel: string;
  reasonEn: string;
  reasonGu: string;
  bankLabel: string;
  bankAccount: string;
  bankIfscLabel: string;
  bankIfsc: string;
  progressEnLabel: string;
  progressGuLabel: string;
  progressEn: string;
  progressGu: string;
  conductEnLabel: string;
  conductGuLabel: string;
  conductEn: string;
  conductGu: string;
  remarksEnLabel: string;
  remarksGuLabel: string;
  remarksEn: string;
  remarksGu: string;
  outwardLabel: string;
  outwardNo: string;
  dateLabel: string;
  issueDate: string;
  certEn: string;
  certGu: string;
  signTeacher: string;
  signPrincipal: string;
  warning: string;
};

function buildFields(data: LCData, school: ReturnType<typeof useCertificateBrand>): LCFields {
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

  return {
    schoolNameGu: school.nameGu,
    schoolNameEn: school.nameEnAlt || school.nameEn,
    sectionLabel: school.section || "Granted Upper Primary Section",
    addressEn: school.address || "Navagam, Ta. Songadh Dist. Tapi",
    addressGu: school.addressGu || "નવાગામ તા. સોનગઢ, જી. તાપી",
    titleGu: "શાળા છોડ્યાનું પ્રમાણપત્ર",
    titleEn: "School Leaving Certificate",
    lcNoLabel: "L.C No./ક્રમ નં. :",
    lcNo: data.serialNo || "",
    grLabel: "G.R.No./જી.આર.નં. :",
    grNumber: S.grNumber || "",
    diseLabel: "School Dise No.(સ્કૂલ ડાયસ નં.)",
    diseCode: school.diseCode || "",
    mediumLabel: "Medium/માધ્યમ :",
    medium,
    apaarLabel: "APAAR ID No. (અપાર આઈડી નંબર)",
    apaar: data.apaarId || S.apaarId || "",
    uidLabel: "Child Unique Id (વિદ્યાર્થીનો યુનિક આઈડી નંબર)",
    childUid: S.childUid || "",
    nameEnLabel: "Full Name of the Student",
    nameGuLabel: "વિદ્યાર્થીનું પૂરેપૂરું નામ",
    nameEn: studentNameEn,
    nameGu: studentNameGu,
    casteEnLabel: "Religion and Caste",
    casteGuLabel: "ધર્મ અને જાતિ",
    casteEn: religionCasteEn,
    casteGu: religionCasteGu,
    motherEnLabel: "Mother's Name",
    motherGuLabel: "માતાનું નામ",
    motherEn,
    motherGu,
    birthEnLabel: "Place of Birth (With Taluka/District)",
    birthGuLabel: "જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)",
    birthEn: birthPlaceEn,
    birthGu: birthPlaceGu,
    nativeEnLabel: "Native Place",
    nativeGuLabel: "વતન",
    nativeEn: nativePlaceEn,
    nativeGu: nativePlaceGu,
    dobTitle: "6. Date of Birth / જન્મ તારીખ",
    dobHint: "(in Figures and words as per Christian Calendar) / ખ્રિસ્તી વર્ષ અનુસાર (આંકડામાં)",
    dobWordsLabel: "In Words / ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ શબ્દોમાં",
    dobWords: [dobWordsEn, dobWordsGu].filter(Boolean).join(" / "),
    dobDay: dobParts.d,
    dobMonth: dobParts.m,
    dobYear: dobParts.y,
    dobDayLabel: "તારીખ",
    dobMonthLabel: "માસ",
    dobYearLabel: "વર્ષ",
    lastEnLabel: "Last School Attended",
    lastGuLabel: "જ્યાં ભણ્યો હોય તે છેલ્લી શાળા",
    lastEn: lastSchoolEn,
    lastGu: lastSchoolGu,
    admEnLabel: "Date of Admission(With Class)",
    admGuLabel: "પ્રવેશ તારીખ (ધોરણ સહિત)",
    admission: data.admissionDate || "",
    leaveEnLabel: "Date of Leaving the School",
    leaveGuLabel: "શાળા છોડ્યા તારીખ",
    leaving: data.leavingDate || "",
    studyEnLabel: "In which Standard he/she Studying & Since When?",
    studyGuLabel: "કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?",
    studyEn: studyingLine,
    studyGu: studyingLineGu,
    reasonEnLabel: "Reason of leaving the School",
    reasonGuLabel: "શાળા છોડ્યાનું કારણ",
    reasonEn: data.reason || "",
    reasonGu: lcPrinted(p?.reasonGu, lcGuText(data.reason)),
    bankLabel: "12. Bank Account No./બેંક ખાતા નંબર :",
    bankAccount: S.accountNumber || "",
    bankIfscLabel: "Bank Name & IFSC Code",
    bankIfsc: [S.bankName, S.ifscCode].filter(Boolean).join("  "),
    progressEnLabel: "Progress",
    progressGuLabel: "પ્રગતિ",
    progressEn: data.progress || "",
    progressGu: lcPrinted(p?.progressGu, lcGuText(data.progress)),
    conductEnLabel: "Conduct",
    conductGuLabel: "વર્તણૂંક",
    conductEn: data.conduct || "",
    conductGu: lcPrinted(p?.conductGu, lcGuText(data.conduct)),
    remarksEnLabel: "Remarks",
    remarksGuLabel: "વિશેષ નોંધ",
    remarksEn: data.remarks || "",
    remarksGu: lcPrinted(p?.remarksGu, lcGuText(data.remarks)),
    outwardLabel: "School Outward No./શાળાનો જાવક નંબર",
    outwardNo: data.outwardNo || "",
    dateLabel: "Date/તારીખ :",
    issueDate: data.issueDate || "",
    certEn:
      "I Certify that the above information is verified by me with school register and found to be correct.",
    certGu:
      "આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે. અને સાચી માલૂમ પડેલ છે.",
    signTeacher: "Class Teacher (વર્ગ શિક્ષક) / Clerk (ક્લાર્ક)",
    signPrincipal: "Principal (આચાર્ય)",
    warning:
      "Statutory Warning : No one can issue this certificate or make any Changes in any entry except the headmaster of the school or the authorized person appointed for such work in the absence or unavailability of the principal.\nકાનૂની ચેતવણી : આ પ્રમાણપત્રમાં કોઈપણ ફેરફાર કરવા અથવા તે જારી કરવાનો અધિકાર ફક્ત શાળાના આચાર્યને અથવા તેમની ગેરહાજરીમાં નિમવામાં આવેલ અધિકૃત વ્યક્તિને છે.",
  };
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const school = useCertificateBrand();
  const S = data.student;
  const source = useMemo(() => buildFields(data, school), [data, school]);
  const sourceKey = JSON.stringify(source);
  const studentKey = `${S.grNumber || ""}|${S.dateOfBirth || ""}|${data.serialNo || ""}`;
  const [fields, setFields] = useState<LCFields>(source);
  const dirty = useRef(new Set<keyof LCFields>());
  const prevKey = useRef(sourceKey);
  const prevStudent = useRef(studentKey);

  useEffect(() => {
    if (prevStudent.current !== studentKey) {
      dirty.current = new Set();
      prevStudent.current = studentKey;
      prevKey.current = sourceKey;
      setFields(source);
      return;
    }
    if (prevKey.current === sourceKey) return;
    prevKey.current = sourceKey;
    setFields((prev) => {
      const next = { ...source };
      for (const key of dirty.current) next[key] = prev[key];
      return next;
    });
  }, [source, sourceKey, studentKey]);

  const set =
    (key: keyof LCFields) =>
    (value: string) => {
      dirty.current.add(key);
      setFields((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
    };

  const reset = () => {
    dirty.current = new Set();
    prevKey.current = sourceKey;
    setFields(source);
  };

  const f = fields;

  return (
    <div className="lc-up-print-wrap">
      <div className="lc-up-edit-hint no-print">
        <span>LC par kisi bhi text par click karke edit karo — print me wahi aayega.</span>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="lc-up-sheet" style={{ fontFamily: FONT }}>
        <div className="lc-up-inner">
          <Editable value={f.schoolNameGu} onChange={set("schoolNameGu")} className="lc-up-name-gu" />
          <Editable value={f.schoolNameEn} onChange={set("schoolNameEn")} className="lc-up-name-en" />
          <Editable value={f.sectionLabel} onChange={set("sectionLabel")} className="lc-up-section" />
          <p className="lc-up-address">
            <Editable value={f.addressEn} onChange={set("addressEn")} />
            <br />
            <Editable value={f.addressGu} onChange={set("addressGu")} />
          </p>

          <div className="lc-up-title-row">
            <Editable value={f.titleGu} onChange={set("titleGu")} className="lc-up-title-gu" />
            <Editable value={f.titleEn} onChange={set("titleEn")} className="lc-up-title-en" />
            <div className="lc-up-lcno">
              <Editable value={f.lcNoLabel} onChange={set("lcNoLabel")} />
              <Editable value={f.lcNo} onChange={set("lcNo")} className="lc-up-lcno-box" />
            </div>
          </div>

          <div className="lc-up-id-row">
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: "1 1 0", minWidth: 0 }}>
              <Editable value={f.grLabel} onChange={set("grLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
              <Fill value={f.grNumber} onChange={set("grNumber")} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: "1.2 1 0", minWidth: 0 }}>
              <Editable value={f.diseLabel} onChange={set("diseLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
              <Editable
                value={f.diseCode}
                onChange={set("diseCode")}
                style={{ fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <Editable value={f.mediumLabel} onChange={set("mediumLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
              <Fill
                value={f.medium}
                onChange={set("medium")}
                style={{ flex: "0 0 auto", minWidth: 110, textAlign: "center" }}
              />
            </div>
          </div>

          <div className="lc-up-id-line">
            <Editable value={f.apaarLabel} onChange={set("apaarLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
            <Fill value={f.apaar} onChange={set("apaar")} />
          </div>

          <div className="lc-up-id-line lc-up-id-line--last">
            <Editable value={f.uidLabel} onChange={set("uidLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
            <Fill value={f.childUid} onChange={set("childUid")} />
          </div>

          <FieldRow n={1} en={f.nameEnLabel} gu={f.nameGuLabel} value={f.nameEn} valueGu={f.nameGu} onEn={set("nameEnLabel")} onGu={set("nameGuLabel")} onValue={set("nameEn")} onValueGu={set("nameGu")} />
          <FieldRow n={2} en={f.casteEnLabel} gu={f.casteGuLabel} value={f.casteEn} valueGu={f.casteGu} onEn={set("casteEnLabel")} onGu={set("casteGuLabel")} onValue={set("casteEn")} onValueGu={set("casteGu")} />
          <FieldRow n={3} en={f.motherEnLabel} gu={f.motherGuLabel} value={f.motherEn} valueGu={f.motherGu} onEn={set("motherEnLabel")} onGu={set("motherGuLabel")} onValue={set("motherEn")} onValueGu={set("motherGu")} />
          <FieldRow n={4} en={f.birthEnLabel} gu={f.birthGuLabel} value={f.birthEn} valueGu={f.birthGu} onEn={set("birthEnLabel")} onGu={set("birthGuLabel")} onValue={set("birthEn")} onValueGu={set("birthGu")} />
          <FieldRow n={5} en={f.nativeEnLabel} gu={f.nativeGuLabel} value={f.nativeEn} valueGu={f.nativeGu} onEn={set("nativeEnLabel")} onGu={set("nativeGuLabel")} onValue={set("nativeEn")} onValueGu={set("nativeGu")} />

          <div className="lc-up-dob">
            <Editable value={f.dobTitle} onChange={set("dobTitle")} className="lc-up-dob-title" />
            <Editable value={f.dobHint} onChange={set("dobHint")} className="lc-up-dob-hint" />
            <div className="lc-up-dob-row">
              <div className="lc-up-dob-words">
                <Editable
                  value={f.dobWordsLabel}
                  onChange={set("dobWordsLabel")}
                  style={{ fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}
                />
                <Fill value={f.dobWords} onChange={set("dobWords")} />
              </div>
              <div className="lc-up-dob-boxes">
                <DobUnit value={f.dobDay} label={f.dobDayLabel} kind="day" onValue={set("dobDay")} onLabel={set("dobDayLabel")} />
                <DobUnit value={f.dobMonth} label={f.dobMonthLabel} kind="month" onValue={set("dobMonth")} onLabel={set("dobMonthLabel")} />
                <DobUnit value={f.dobYear} label={f.dobYearLabel} kind="year" onValue={set("dobYear")} onLabel={set("dobYearLabel")} />
              </div>
            </div>
          </div>

          <FieldRow n={7} en={f.lastEnLabel} gu={f.lastGuLabel} value={f.lastEn} valueGu={f.lastGu} onEn={set("lastEnLabel")} onGu={set("lastGuLabel")} onValue={set("lastEn")} onValueGu={set("lastGu")} />
          <FieldRow n={8} en={f.admEnLabel} gu={f.admGuLabel} value={f.admission} onEn={set("admEnLabel")} onGu={set("admGuLabel")} onValue={set("admission")} />
          <FieldRow n={9} en={f.leaveEnLabel} gu={f.leaveGuLabel} value={f.leaving} onEn={set("leaveEnLabel")} onGu={set("leaveGuLabel")} onValue={set("leaving")} />
          <FieldRow n={10} en={f.studyEnLabel} gu={f.studyGuLabel} value={f.studyEn} valueGu={f.studyGu} onEn={set("studyEnLabel")} onGu={set("studyGuLabel")} onValue={set("studyEn")} onValueGu={set("studyGu")} />
          <FieldRow n={11} en={f.reasonEnLabel} gu={f.reasonGuLabel} value={f.reasonEn} valueGu={f.reasonGu} onEn={set("reasonEnLabel")} onGu={set("reasonGuLabel")} onValue={set("reasonEn")} onValueGu={set("reasonGu")} />

          <div className="lc-up-bank">
            <div className="lc-up-bank-row">
              <Editable value={f.bankLabel} onChange={set("bankLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
              <Fill value={f.bankAccount} onChange={set("bankAccount")} />
            </div>
            <div className="lc-up-bank-row">
              <Editable value={f.bankIfscLabel} onChange={set("bankIfscLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
              <Fill value={f.bankIfsc} onChange={set("bankIfsc")} />
            </div>
          </div>

          <FieldRow n={13} en={f.progressEnLabel} gu={f.progressGuLabel} value={f.progressEn} valueGu={f.progressGu} onEn={set("progressEnLabel")} onGu={set("progressGuLabel")} onValue={set("progressEn")} onValueGu={set("progressGu")} />
          <FieldRow n={14} en={f.conductEnLabel} gu={f.conductGuLabel} value={f.conductEn} valueGu={f.conductGu} onEn={set("conductEnLabel")} onGu={set("conductGuLabel")} onValue={set("conductEn")} onValueGu={set("conductGu")} />
          <FieldRow n={15} en={f.remarksEnLabel} gu={f.remarksGuLabel} value={f.remarksEn} valueGu={f.remarksGu} onEn={set("remarksEnLabel")} onGu={set("remarksGuLabel")} onValue={set("remarksEn")} onValueGu={set("remarksGu")} />

          <div className="lc-up-footer">
            <div className="lc-up-meta">
              <div className="lc-up-meta-row">
                <Editable value={f.outwardLabel} onChange={set("outwardLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
                <Fill value={f.outwardNo} onChange={set("outwardNo")} style={{ flex: "0 1 160px", maxWidth: 180 }} />
              </div>
              <div className="lc-up-meta-row">
                <Editable value={f.dateLabel} onChange={set("dateLabel")} style={{ fontWeight: 700, whiteSpace: "nowrap" }} />
                <Fill value={f.issueDate} onChange={set("issueDate")} style={{ flex: "0 1 140px", maxWidth: 160 }} />
              </div>
            </div>

            <Editable value={f.certEn} onChange={set("certEn")} className="lc-up-cert-en" multiline />
            <Editable value={f.certGu} onChange={set("certGu")} className="lc-up-cert-gu" multiline />

            <div className="lc-up-signs">
              <div>
                <div className="lc-up-sign-space" />
                <Editable value={f.signTeacher} onChange={set("signTeacher")} className="lc-up-sign-label" />
              </div>
              <div>
                <div className="lc-up-sign-space" />
                <Editable value={f.signPrincipal} onChange={set("signPrincipal")} className="lc-up-sign-label" />
              </div>
            </div>

            <Editable value={f.warning} onChange={set("warning")} className="lc-up-warning" multiline />
          </div>
        </div>
      </div>
    </div>
  );
}
