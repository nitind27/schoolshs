"use client";

/**
 * Upper Primary Leaving Certificate — layout matched to official blank scan
 * (packs 24261004403 / 24261004404).
 * Every line is click-to-edit, same as the bonafide certificate.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cleanLcFonts, type LcFontMap } from "@/lib/certificates/lc-fonts";
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

const FONT_MIN = 8;
const FONT_MAX = 18;

function isLcLabelKey(key: string) {
  return (
    key.endsWith("Label") ||
    key === "dobTitle" ||
    key === "dobHint" ||
    key === "signTeacher" ||
    key === "signPrincipal"
  );
}

type FontScopeValue = {
  sizeOf: (id: string) => number | undefined;
  focus: (id: string, el: HTMLElement) => void;
  blur: (id: string) => void;
  fix: () => void;
  fixing: boolean;
  fixedNote: string;
  stepLabels: (delta: number) => void;
};

const FontScope = createContext<FontScopeValue | null>(null);

function readFontPx(el: HTMLElement) {
  return Math.round(parseFloat(getComputedStyle(el).fontSize) || 12);
}

/** One toolbar for the text that is clicked. It sits over the page, not inside the certificate. */
function FontBar({
  active,
  sizes,
  bases,
  onStep,
}: {
  active: { id: string; el: HTMLElement } | null;
  sizes: Record<string, number>;
  bases: Record<string, number>;
  onStep: (delta: number) => void;
}) {
  const size = active ? sizes[active.id] ?? bases[active.id] : undefined;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = active?.el;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, size]);

  if (!active || !rect || size == null) return null;
  const top = rect.top > 42 ? rect.top - 34 : rect.bottom + 6;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 132));

  return (
    <div
      className="lc-up-fontbar no-print"
      style={{ top, left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button type="button" aria-label="Font chhota" disabled={size <= FONT_MIN} onClick={() => onStep(-1)}>
        A−
      </button>
      <span>{size}</span>
      <button type="button" aria-label="Font bada" disabled={size >= FONT_MAX} onClick={() => onStep(1)}>
        A+
      </button>
    </div>
  );
}

function FontSizeScope({
  resetKey,
  children,
}: {
  resetKey: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<LcFontMap>({});
  const [active, setActive] = useState<{ id: string; el: HTMLElement } | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixedNote, setFixedNote] = useState("");
  const bases = useRef<Record<string, number>>({});
  const saved = useRef<LcFontMap>({});
  const sizesRef = useRef<LcFontMap>({});
  sizesRef.current = sizes;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-lc-key]").forEach((el) => {
      const key = el.dataset.lcKey || "";
      if (!key || bases.current[key] || el.classList.contains("lc-up-sized")) return;
      bases.current[key] = readFontPx(el);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/certificates/lc-fonts")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const fonts = cleanLcFonts(data.fonts);
        saved.current = fonts;
        setSizes(fonts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const seenReset = useRef(resetKey);
  useEffect(() => {
    if (seenReset.current === resetKey) return;
    seenReset.current = resetKey;
    setSizes({ ...saved.current });
    setActive(null);
    setFixedNote("");
  }, [resetKey]);

  const value = useMemo<FontScopeValue>(
    () => ({
      sizeOf: (id) => sizes[id],
      focus: (id, el) => {
        if (!bases.current[id]) {
          const styled = el.classList.contains("lc-up-sized");
          if (styled) el.classList.remove("lc-up-sized");
          const inline = el.style.fontSize;
          el.style.removeProperty("font-size");
          bases.current[id] = readFontPx(el);
          if (inline) el.style.fontSize = inline;
          if (styled) el.classList.add("lc-up-sized");
        }
        setActive({ id, el });
      },
      blur: (id) => setActive((current) => (current?.id === id ? null : current)),
      fixing,
      fixedNote,
      stepLabels: (delta: number) => {
        const root = rootRef.current;
        if (!root) return;
        const nodes = [...root.querySelectorAll<HTMLElement>('[data-lc-role="label"]')];
        setSizes((prev) => {
          const next = { ...prev };
          for (const el of nodes) {
            const key = el.dataset.lcKey || "";
            if (!key) continue;
            if (!bases.current[key]) {
              const styled = el.classList.contains("lc-up-sized");
              if (styled) el.classList.remove("lc-up-sized");
              const inline = el.style.getPropertyValue("font-size");
              const priority = el.style.getPropertyPriority("font-size");
              el.style.removeProperty("font-size");
              bases.current[key] = readFontPx(el);
              if (inline) el.style.setProperty("font-size", inline, priority);
              if (styled) el.classList.add("lc-up-sized");
            }
            const base = bases.current[key];
            const current = prev[key] ?? base;
            const size = Math.min(FONT_MAX, Math.max(FONT_MIN, current + delta));
            if (size === base) delete next[key];
            else next[key] = size;
          }
          return next;
        });
        setFixedNote("");
      },
      fix: () => {
        setFixing(true);
        setFixedNote("");
        const fonts = cleanLcFonts(sizesRef.current);
        fetch("/api/certificates/lc-fonts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fonts }),
        })
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Save failed");
            const next = cleanLcFonts(data.fonts);
            saved.current = next;
            setSizes(next);
            setFixedNote("Font size fix ho gaya. Print me yahi size aayega.");
          })
          .catch(() => setFixedNote("Font size save nahi hua."))
          .finally(() => setFixing(false));
      },
    }),
    [sizes, fixing, fixedNote],
  );

  const step = (delta: number) => {
    if (!active) return;
    const base = bases.current[active.id] || readFontPx(active.el);
    setSizes((prev) => {
      const current = prev[active.id] ?? base;
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, current + delta));
      if (next === base) {
        const copy = { ...prev };
        delete copy[active.id];
        return copy;
      }
      return { ...prev, [active.id]: next };
    });
    setFixedNote("");
  };

  return (
    <FontScope.Provider value={value}>
      <div ref={rootRef}>{children}</div>
      <FontBar active={active} sizes={sizes} bases={bases.current} onStep={step} />
    </FontScope.Provider>
  );
}

/** Click-to-edit text. Commits on blur so print uses the edited line. */
function Editable({
  value,
  onChange,
  className,
  style,
  multiline,
  sizeKey,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  sizeKey: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fonts = useContext(FontScope);
  const px = fonts?.sizeOf(sizeKey);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const shown = value || "\u00a0";
    if (el.textContent !== shown) el.textContent = shown;
  }, [value]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (px) {
      el.style.setProperty("--lc-fs", `${px}px`);
      el.style.setProperty("font-size", `${px}px`, "important");
    } else {
      el.style.removeProperty("--lc-fs");
      el.style.removeProperty("font-size");
    }
  }, [px]);

  return (
    <span
      ref={ref}
      data-lc-key={sizeKey}
      data-lc-role={isLcLabelKey(sizeKey) ? "label" : undefined}
      className={`lc-up-edit${px ? " lc-up-sized" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onFocus={(event) => fonts?.focus(sizeKey, event.currentTarget)}
      onBlur={(e) => {
        fonts?.blur(sizeKey);
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
  sizeKey,
}: {
  value?: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  sizeKey: string;
}) {
  return (
    <Editable
      sizeKey={sizeKey}
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
  valueKey,
  labelKey,
}: {
  value: string;
  label: string;
  kind: "day" | "month" | "year";
  onValue: (v: string) => void;
  onLabel: (v: string) => void;
  valueKey: string;
  labelKey: string;
}) {
  return (
    <span className="lc-up-dob-unit">
      <Editable
        sizeKey={valueKey}
        value={value}
        onChange={onValue}
        className={`lc-up-dob-box lc-up-dob-box--${kind}`}
      />
      <Editable sizeKey={labelKey} value={label} onChange={onLabel} className="lc-up-dob-label" />
    </span>
  );
}

/** Label only. The colon is not attached to this text. */
function Lab({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} style={{ whiteSpace: "nowrap", flex: "0 0 auto", ...style }}>
      {children}
    </span>
  );
}

/** Colon stays on the label's line, away from the label, with a dash before the value. */
function Slot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="lc-up-lead" />
      <span className="lc-up-slot">
        <span className="lc-up-colon">{": —\u00A0"}</span>
        {children}
      </span>
    </>
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
  sizePrefix,
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
  sizePrefix: string;
}) {
  return (
    <div className="lc-up-field">
      <div className="lc-up-field-top">
        <Lab className="lc-up-field-en">
          <Editable
            sizeKey={`${sizePrefix}EnLabel`}
            value={`${n}. ${en}`}
            onChange={(v) => onEn(v.replace(/^\d+\.\s*/, ""))}
          />
        </Lab>
        <Slot>
          <Fill sizeKey={`${sizePrefix}En`} value={value} onChange={onValue} />
        </Slot>
      </div>
      <div className="lc-up-field-gu">
        {onValueGu ? (
          <Lab>
            <Editable sizeKey={`${sizePrefix}GuLabel`} value={gu} onChange={onGu} />
          </Lab>
        ) : (
          <Editable sizeKey={`${sizePrefix}GuLabel`} value={gu} onChange={onGu} />
        )}
        {onValueGu ? (
          <Slot>
            <Fill sizeKey={`${sizePrefix}Gu`} value={valueGu} onChange={onValueGu} />
          </Slot>
        ) : null}
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
    lcNoLabel: "L.C No./ક્રમ નં.",
    lcNo: data.serialNo || "",
    grLabel: "G.R.No./જી.આર.નં.",
    grNumber: S.grNumber || "",
    diseLabel: "School Dise No.(સ્કૂલ ડાયસ નં.)",
    diseCode: school.diseCode || "",
    mediumLabel: "Medium/માધ્યમ",
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
    bankLabel: "12. Bank Account No./બેંક ખાતા નંબર",
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
    dateLabel: "Date/તારીખ",
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

function FontFixButton() {
  const fonts = useContext(FontScope);
  if (!fonts) return null;
  return (
    <>
      {fonts.fixedNote ? <span>{fonts.fixedNote}</span> : null}
      <button type="button" onClick={() => fonts.stepLabels(-1)}>
        Labels A−
      </button>
      <button type="button" onClick={() => fonts.stepLabels(1)}>
        Labels A+
      </button>
      <button type="button" onClick={fonts.fix} disabled={fonts.fixing}>
        {fonts.fixing ? "Saving..." : "Fix font"}
      </button>
    </>
  );
}

export function LeavingCertificateView({ data }: { data: LCData }) {
  const school = useCertificateBrand();
  const S = data.student;
  const source = useMemo(() => buildFields(data, school), [data, school]);
  const sourceKey = JSON.stringify(source);
  const studentKey = `${S.grNumber || ""}|${S.dateOfBirth || ""}|${data.serialNo || ""}`;
  const [fields, setFields] = useState<LCFields>(source);
  const [fontEpoch, setFontEpoch] = useState(0);
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
    setFontEpoch((n) => n + 1);
  };

  const f = fields;

  return (
    <FontSizeScope resetKey={String(fontEpoch)}>
    <div className="lc-up-print-wrap">
      <div className="lc-up-edit-hint no-print">
        <span>Labels A+ se saare labels ek saath badhte hain. Ek label alag chahiye ho to us par click karke A+ dabao. Phir Fix font.</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <FontFixButton />
          <button type="button" onClick={reset}>
            Reset
          </button>
        </span>
      </div>
      <div className="lc-up-sheet" style={{ fontFamily: FONT }}>
        <div className="lc-up-inner">
          <Editable sizeKey="schoolNameGu" value={f.schoolNameGu} onChange={set("schoolNameGu")} className="lc-up-name-gu" />
          <Editable sizeKey="schoolNameEn" value={f.schoolNameEn} onChange={set("schoolNameEn")} className="lc-up-name-en" />
          <Editable sizeKey="sectionLabel" value={f.sectionLabel} onChange={set("sectionLabel")} className="lc-up-section" />
          <p className="lc-up-address">
            <Editable sizeKey="addressEn" value={f.addressEn} onChange={set("addressEn")} />
            <br />
            <Editable sizeKey="addressGu" value={f.addressGu} onChange={set("addressGu")} />
          </p>

          <div className="lc-up-title-row">
            <Editable sizeKey="titleGu" value={f.titleGu} onChange={set("titleGu")} className="lc-up-title-gu" />
            <Editable sizeKey="titleEn" value={f.titleEn} onChange={set("titleEn")} className="lc-up-title-en" />
            <div className="lc-up-lcno">
              <Lab>
                <Editable sizeKey="lcNoLabel" value={f.lcNoLabel} onChange={set("lcNoLabel")} />
              </Lab>
              <Slot>
                <Editable sizeKey="lcNo" value={f.lcNo} onChange={set("lcNo")} className="lc-up-lcno-box" />
              </Slot>
            </div>
          </div>

          <div className="lc-up-id-row">
            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "nowrap", gap: 0, flex: "1 1 0", minWidth: 0 }}>
              <Lab style={{ fontWeight: 700 }}>
                <Editable sizeKey="grLabel" value={f.grLabel} onChange={set("grLabel")} />
              </Lab>
              <Slot>
                <Fill sizeKey="grNumber" value={f.grNumber} onChange={set("grNumber")} />
              </Slot>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "nowrap", gap: 0, flex: "1.2 1 0", minWidth: 0 }}>
              <Lab style={{ fontWeight: 700 }}>
                <Editable sizeKey="diseLabel" value={f.diseLabel} onChange={set("diseLabel")} />
              </Lab>
              <Slot>
                <Editable
                  sizeKey="diseCode"
                  value={f.diseCode}
                  onChange={set("diseCode")}
                  style={{ fontWeight: 800, letterSpacing: "0.02em", whiteSpace: "nowrap" }}
                />
              </Slot>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", flexWrap: "nowrap", gap: 0, flex: "1 1 0", minWidth: 0 }}>
              <Lab style={{ fontWeight: 700 }}>
                <Editable sizeKey="mediumLabel" value={f.mediumLabel} onChange={set("mediumLabel")} />
              </Lab>
              <Slot>
                <Fill
                  sizeKey="medium"
                  value={f.medium}
                  onChange={set("medium")}
                  style={{ flex: "0 0 auto", minWidth: 72, textAlign: "center" }}
                />
              </Slot>
            </div>
          </div>

          <div className="lc-up-id-line">
            <Lab style={{ fontWeight: 700 }}>
              <Editable sizeKey="apaarLabel" value={f.apaarLabel} onChange={set("apaarLabel")} />
            </Lab>
            <Slot>
              <Fill sizeKey="apaar" value={f.apaar} onChange={set("apaar")} />
            </Slot>
          </div>

          <div className="lc-up-id-line lc-up-id-line--last">
            <Lab style={{ fontWeight: 700 }}>
              <Editable sizeKey="uidLabel" value={f.uidLabel} onChange={set("uidLabel")} />
            </Lab>
            <Slot>
              <Fill sizeKey="childUid" value={f.childUid} onChange={set("childUid")} />
            </Slot>
          </div>

          <FieldRow sizePrefix="name" n={1} en={f.nameEnLabel} gu={f.nameGuLabel} value={f.nameEn} valueGu={f.nameGu} onEn={set("nameEnLabel")} onGu={set("nameGuLabel")} onValue={set("nameEn")} onValueGu={set("nameGu")} />
          <FieldRow sizePrefix="caste" n={2} en={f.casteEnLabel} gu={f.casteGuLabel} value={f.casteEn} valueGu={f.casteGu} onEn={set("casteEnLabel")} onGu={set("casteGuLabel")} onValue={set("casteEn")} onValueGu={set("casteGu")} />
          <FieldRow sizePrefix="mother" n={3} en={f.motherEnLabel} gu={f.motherGuLabel} value={f.motherEn} valueGu={f.motherGu} onEn={set("motherEnLabel")} onGu={set("motherGuLabel")} onValue={set("motherEn")} onValueGu={set("motherGu")} />
          <FieldRow sizePrefix="birth" n={4} en={f.birthEnLabel} gu={f.birthGuLabel} value={f.birthEn} valueGu={f.birthGu} onEn={set("birthEnLabel")} onGu={set("birthGuLabel")} onValue={set("birthEn")} onValueGu={set("birthGu")} />
          <FieldRow sizePrefix="native" n={5} en={f.nativeEnLabel} gu={f.nativeGuLabel} value={f.nativeEn} valueGu={f.nativeGu} onEn={set("nativeEnLabel")} onGu={set("nativeGuLabel")} onValue={set("nativeEn")} onValueGu={set("nativeGu")} />

          <div className="lc-up-dob">
            <Editable sizeKey="dobTitle" value={f.dobTitle} onChange={set("dobTitle")} className="lc-up-dob-title" />
            <Editable sizeKey="dobHint" value={f.dobHint} onChange={set("dobHint")} className="lc-up-dob-hint" />
            <div className="lc-up-dob-row">
              <div className="lc-up-dob-words">
                <Lab style={{ fontWeight: 700, lineHeight: 1.2 }}>
                  <Editable
                    sizeKey="dobWordsLabel"
                    value={f.dobWordsLabel}
                    onChange={set("dobWordsLabel")}
                  />
                </Lab>
                <Slot>
                  <Fill sizeKey="dobWords" value={f.dobWords} onChange={set("dobWords")} />
                </Slot>
              </div>
              <div className="lc-up-dob-boxes">
                <DobUnit valueKey="dobDay" labelKey="dobDayLabel" value={f.dobDay} label={f.dobDayLabel} kind="day" onValue={set("dobDay")} onLabel={set("dobDayLabel")} />
                <DobUnit valueKey="dobMonth" labelKey="dobMonthLabel" value={f.dobMonth} label={f.dobMonthLabel} kind="month" onValue={set("dobMonth")} onLabel={set("dobMonthLabel")} />
                <DobUnit valueKey="dobYear" labelKey="dobYearLabel" value={f.dobYear} label={f.dobYearLabel} kind="year" onValue={set("dobYear")} onLabel={set("dobYearLabel")} />
              </div>
            </div>
          </div>

          <FieldRow sizePrefix="last" n={7} en={f.lastEnLabel} gu={f.lastGuLabel} value={f.lastEn} valueGu={f.lastGu} onEn={set("lastEnLabel")} onGu={set("lastGuLabel")} onValue={set("lastEn")} onValueGu={set("lastGu")} />
          <FieldRow sizePrefix="adm" n={8} en={f.admEnLabel} gu={f.admGuLabel} value={f.admission} onEn={set("admEnLabel")} onGu={set("admGuLabel")} onValue={set("admission")} />
          <FieldRow sizePrefix="leave" n={9} en={f.leaveEnLabel} gu={f.leaveGuLabel} value={f.leaving} onEn={set("leaveEnLabel")} onGu={set("leaveGuLabel")} onValue={set("leaving")} />
          <FieldRow sizePrefix="study" n={10} en={f.studyEnLabel} gu={f.studyGuLabel} value={f.studyEn} valueGu={f.studyGu} onEn={set("studyEnLabel")} onGu={set("studyGuLabel")} onValue={set("studyEn")} onValueGu={set("studyGu")} />
          <FieldRow sizePrefix="reason" n={11} en={f.reasonEnLabel} gu={f.reasonGuLabel} value={f.reasonEn} valueGu={f.reasonGu} onEn={set("reasonEnLabel")} onGu={set("reasonGuLabel")} onValue={set("reasonEn")} onValueGu={set("reasonGu")} />

          <div className="lc-up-bank">
            <div className="lc-up-bank-row">
              <Lab style={{ fontWeight: 700 }}>
                <Editable sizeKey="bankLabel" value={f.bankLabel} onChange={set("bankLabel")} />
              </Lab>
              <Slot>
                <Fill sizeKey="bankAccount" value={f.bankAccount} onChange={set("bankAccount")} />
              </Slot>
            </div>
            <div className="lc-up-bank-row">
              <Lab style={{ fontWeight: 700 }}>
                <Editable sizeKey="bankIfscLabel" value={f.bankIfscLabel} onChange={set("bankIfscLabel")} />
              </Lab>
              <Slot>
                <Fill sizeKey="bankIfsc" value={f.bankIfsc} onChange={set("bankIfsc")} />
              </Slot>
            </div>
          </div>

          <FieldRow sizePrefix="progress" n={13} en={f.progressEnLabel} gu={f.progressGuLabel} value={f.progressEn} valueGu={f.progressGu} onEn={set("progressEnLabel")} onGu={set("progressGuLabel")} onValue={set("progressEn")} onValueGu={set("progressGu")} />
          <FieldRow sizePrefix="conduct" n={14} en={f.conductEnLabel} gu={f.conductGuLabel} value={f.conductEn} valueGu={f.conductGu} onEn={set("conductEnLabel")} onGu={set("conductGuLabel")} onValue={set("conductEn")} onValueGu={set("conductGu")} />
          <FieldRow sizePrefix="remarks" n={15} en={f.remarksEnLabel} gu={f.remarksGuLabel} value={f.remarksEn} valueGu={f.remarksGu} onEn={set("remarksEnLabel")} onGu={set("remarksGuLabel")} onValue={set("remarksEn")} onValueGu={set("remarksGu")} />

          <div className="lc-up-footer">
            <div className="lc-up-meta">
              <div className="lc-up-meta-row">
                <Lab style={{ fontWeight: 700 }}>
                  <Editable sizeKey="outwardLabel" value={f.outwardLabel} onChange={set("outwardLabel")} />
                </Lab>
                <Slot>
                  <Fill sizeKey="outwardNo" value={f.outwardNo} onChange={set("outwardNo")} style={{ flex: "0 1 160px", maxWidth: 180 }} />
                </Slot>
              </div>
              <div className="lc-up-meta-row">
                <Lab style={{ fontWeight: 700 }}>
                  <Editable sizeKey="dateLabel" value={f.dateLabel} onChange={set("dateLabel")} />
                </Lab>
                <Slot>
                  <Fill sizeKey="issueDate" value={f.issueDate} onChange={set("issueDate")} style={{ flex: "0 1 140px", maxWidth: 160 }} />
                </Slot>
              </div>
            </div>

            <Editable sizeKey="certEn" value={f.certEn} onChange={set("certEn")} className="lc-up-cert-en" multiline />
            <Editable sizeKey="certGu" value={f.certGu} onChange={set("certGu")} className="lc-up-cert-gu" multiline />

            <div className="lc-up-signs">
              <div>
                <div className="lc-up-sign-space" />
                <Editable sizeKey="signTeacher" value={f.signTeacher} onChange={set("signTeacher")} className="lc-up-sign-label" />
              </div>
              <div>
                <div className="lc-up-sign-space" />
                <Editable sizeKey="signPrincipal" value={f.signPrincipal} onChange={set("signPrincipal")} className="lc-up-sign-label" />
              </div>
            </div>

            <Editable sizeKey="warning" value={f.warning} onChange={set("warning")} className="lc-up-warning" multiline />
          </div>
        </div>
      </div>
    </div>
    </FontSizeScope>
  );
}
