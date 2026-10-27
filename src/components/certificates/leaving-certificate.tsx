"use client";

import { useMemo } from "react";
import { useCertificateBrand } from "@/components/certificates/certificate-brand-context";
import { CertEdit, CertFontScope, CertFontTools, useSheetState } from "@/components/certificates/inline-cert-edit";
import { dateToWords } from "@/lib/certificates/date-to-words";
import {
  lcBirthPlaceEn,
  lcBirthPlaceGu,
  lcGuText,
  lcMotherEn,
  lcMotherGu,
  lcNameEn,
  lcNameGu,
  lcPrinted,
  lcReligionCasteEn,
  lcReligionCasteGu,
  type LCPrintText,
} from "@/lib/certificates/lc-bilingual";

export interface LCData {
  student: {
    firstName: string;
    middleName?: string | null;
    surname: string;
    firstNameGu?: string | null;
    middleNameGu?: string | null;
    surnameGu?: string | null;
    aadhaarNameGu?: string | null;
    grNumber?: string | null;
    religion?: string | null;
    caste?: string | null;
    motherName: string;
    motherNameGu?: string | null;
    dateOfBirth: string;
    currentCity?: string | null;
    currentDistrict?: string | null;
    birthTaluka?: string | null;
    standard?: string | null;
    section?: string | null;
    childUid?: string | null;
    apaarId?: string | null;
    permanentCity?: string | null;
    permanentDistrict?: string | null;
    accountNumber?: string | null;
    bankName?: string | null;
    ifscCode?: string | null;
    branchName?: string | null;
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
  /** Optional print-time English/Gujarati edits (LC page). */
  print?: LCPrintText;
  /** Upper-primary LC extras */
  outwardNo?: string;
  nativePlace?: string;
  apaarId?: string;
}

const FONT = '"Times New Roman", Times, "Noto Sans Gujarati", Georgia, serif';

function Fill({
  value = "",
  onChange,
  sizeKey,
  minWidth = 80,
  flex,
  center,
}: {
  value?: string;
  onChange: (value: string) => void;
  sizeKey: string;
  minWidth?: number | string;
  flex?: number;
  center?: boolean;
}) {
  return (
    <CertEdit
      sizeKey={sizeKey}
      value={value}
      onChange={onChange}
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
    />
  );
}

/** Label and colon stay on one line; the space after the colon is a real space, so the value starts on its own. */
function Lab({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      {children}
      {" :\u00A0"}
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
      <span style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.4 }}>{n === "" || n == null ? "" : `${n}.`}</span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "2px 0",
            fontSize: 11,
            lineHeight: 1.35,
          }}
        >
          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            {en}
            {" :\u00A0"}
          </span>
          {children}
        </div>
        {gu ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: "2px 0",
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
  const school = useCertificateBrand();
  const S = data.student;
  const p = data.print;
  const nameEn = lcPrinted(p?.nameEn, lcNameEn(S));
  const nameGu = lcPrinted(p?.nameGu, lcNameGu(S));
  const religionCasteEn = lcPrinted(p?.religionCasteEn, lcReligionCasteEn(S));
  const religionCasteGu = lcPrinted(p?.religionCasteGu, lcReligionCasteGu(S));
  const motherEn = lcPrinted(p?.motherEn, lcMotherEn(S));
  const motherGu = lcPrinted(p?.motherGu, lcMotherGu(S));
  const birthPlaceEn = lcPrinted(p?.birthPlaceEn, lcBirthPlaceEn(S));
  const birthPlaceGu = lcPrinted(p?.birthPlaceGu, lcBirthPlaceGu(S));
  const dob = S.dateOfBirth || "";
  const dobWordsEn = dateToWords(dob, "en");
  const dobWordsGu = dateToWords(dob, "gu");
  const studying =
    data.studyingStandard ||
    [S.standard ? `Std ${S.standard}` : "", S.section].filter(Boolean).join("-");
  const studyingGu = lcGuText(studying.replace(/^Std\s+/i, "Std "));
  const uid = (S.childUid || "").replace(/\D/g, "");
  const medium = data.medium || "ગુજરાતી / Gujarati";
  const lastSchoolEn = lcPrinted(p?.lastSchoolEn, data.lastSchool || school.nameEnAlt);
  const lastSchoolGu = lcPrinted(
    p?.lastSchoolGu,
    data.lastSchool ? lcGuText(data.lastSchool) : school.nameGu || lcGuText(lastSchoolEn),
  );
  const reasonEn = data.reason || "";
  const reasonGu = lcPrinted(p?.reasonGu, lcGuText(reasonEn));
  const progressEn = data.progress || "";
  const progressGu = lcPrinted(p?.progressGu, lcGuText(progressEn));
  const conductEn = data.conduct || "";
  const conductGu = lcPrinted(p?.conductGu, lcGuText(conductEn));
  const remarksEn = data.remarks || "";
  const remarksGu = lcPrinted(p?.remarksGu, lcGuText(remarksEn));
  const studyGu = [studyingGu, data.studyingSince ? lcGuText(data.studyingSince) : ""].filter(Boolean).join(" · ");

  const seed = useMemo(
    () => ({
      titleEn: "SCHOOL LEAVING CERTIFICATE",
      titleGu: "શાળા છોડ્યાનું પ્રમાણપત્ર",
      schoolEn: school.nameEnAlt,
      schoolGu: school.nameGu,
      sscLabel: "S.S.C. Index No.",
      sscGu: "એસ.એસ.સી. ઈન્ડેક્સ નં.",
      sscIndex: school.sscIndex,
      hscLabel: "H.S.C. Index No.",
      hscGu: "એચ.એસ.સી. ઈન્ડેક્સ નં.",
      hscIndex: school.hscIndex,
      diseLabel: "Dise Code No.",
      diseGu: "ડાયસ કોડ નં.",
      diseCode: school.diseCode,
      placeEn: "Ta. Songadh, Dist. Tapi",
      placeGu: school.addressGu,
      sectionEn: "Madhyamik / Ucchattar Madhyamik",
      sectionGu: "માધ્યમિક / ઉચ્ચત્તર માધ્યમિક",
      noLabel: "No.",
      serialNo: data.serialNo || "",
      grLabel: "G.R. No. / જી.આર.નં.",
      grNumber: S.grNumber || "",
      mediumLabel: "Medium / માધ્યમ",
      medium,
      nameEnLabel: "1. Full Name of the Student",
      nameGuLabel: "વિદ્યાર્થીનું પૂરેપૂરું નામ",
      nameEn,
      nameGu,
      casteEnLabel: "2. Religion and Caste",
      casteGuLabel: "ધર્મ અને જાતિ",
      religionCasteEn,
      religionCasteGu,
      motherEnLabel: "3. Mother's Name",
      motherGuLabel: "માતાનું નામ",
      motherEn,
      motherGu,
      birthEnLabel: "4. Place of Birth (With Taluka / District)",
      birthGuLabel: "જન્મ સ્થળ (તાલુકા, જિલ્લા સહિત)",
      birthPlaceEn,
      birthPlaceGu,
      dobEnLabel: "5. Date of Birth",
      dobGuLabel: "ખ્રિસ્તી વર્ષ અનુસાર જન્મ તારીખ",
      dobHintEn: "(In Figures and words as per Christian Calendar)",
      dobHintGu: "(આંકડામાં અને શબ્દમાં)",
      dob,
      dobWordsEn,
      dobWordsGu,
      lastEnLabel: "6. Last School Attended",
      lastGuLabel: "જ્યાં ભણ્યો હોય તે છેલ્લી શાળા",
      lastSchoolEn,
      lastSchoolGu,
      admEnLabel: "7. Date of Admission (With Class)",
      admGuLabel: "પ્રવેશ તારીખ (ધોરણ સહિત)",
      admissionDate: data.admissionDate || "",
      leaveEnLabel: "8. Date of Leaving the School",
      leaveGuLabel: "શાળા છોડ્યા તારીખ",
      leavingDate: data.leavingDate || "",
      studyEnLabel: "9. In which Standard he/she Studying & Since When?",
      studyGuLabel: "કયા ધોરણમાં અભ્યાસ કરે છે? ક્યારથી?",
      studying,
      studyingSince: data.studyingSince || "",
      studyGu,
      reasonEnLabel: "10. Reason for leaving the School",
      reasonGuLabel: "શાળા છોડ્યાનું કારણ",
      reasonEn,
      reasonGu,
      progressEnLabel: "11. Progress",
      progressGuLabel: "પ્રગતિ",
      progressEn,
      progressGu,
      conductEnLabel: "12. Conduct",
      conductGuLabel: "વર્તણૂંક",
      conductEn,
      conductGu,
      remarksEnLabel: "13. Remarks",
      remarksGuLabel: "વિશેષ નોંધ",
      remarksEn,
      remarksGu,
      sscLine: "Appeared in S.S.C. Exam March /",
      sscExam: data.sscExam || "",
      seatLabel: "Seat No.",
      sscSeatNo: data.sscSeatNo || "",
      uidLabel: "14. UID No. / યુઆઈડી નં.",
      uid,
      dateLabel: "Date / તારીખ",
      issueDate: data.issueDate || "",
      certEn: "I Certify that the above information is verified by me with school register and found to be correct.",
      certGu: "આથી પ્રમાણિત કરવામાં આવે છે કે ઉપરની માહિતીની ચકાસણી શાળાના જનરલ રજીસ્ટર સાથે કરવામાં આવેલ છે અને સાચી માલૂમ પડેલ છે.",
      signClerk: "Clerk",
      signClerkGu: "કલાર્ક",
      signTeacher: "Class Teacher",
      signTeacherGu: "વર્ગ શિક્ષક",
      signPrincipal: "Principal",
      signPrincipalGu: "આચાર્ય",
      warningEn:
        "Statutory Warning : No one can issue this certificate or make any changes in any entry except the Principal of the school or the authorized person appointed for such work in the absence or unavailability of the Principal.",
      warningGu:
        "શાળાના આચાર્ય અથવા તેમની ગેરહાજરીમાં સહી કરવા માટે અધિકૃત કરેલ વ્યક્તિ સિવાય અન્ય કોઈ વ્યક્તિ આ પ્રમાણપત્ર આપી શકશે નહીં કે તેની કોઈ નોંધમાં ફેરફાર કરી શકશે નહીં.",
    }),
    [
      school,
      data,
      medium,
      nameEn,
      nameGu,
      religionCasteEn,
      religionCasteGu,
      motherEn,
      motherGu,
      birthPlaceEn,
      birthPlaceGu,
      dob,
      dobWordsEn,
      dobWordsGu,
      lastSchoolEn,
      lastSchoolGu,
      studying,
      studyingGu,
      studyGu,
      reasonEn,
      reasonGu,
      progressEn,
      progressGu,
      conductEn,
      conductGu,
      remarksEn,
      remarksGu,
      uid,
      S.grNumber,
    ],
  );
  const resetKey = `${S.grNumber || ""}|${dob}|${data.serialNo || ""}`;
  const { values: f, set, reset } = useSheetState(seed, resetKey);
  const uidChars = Array.from({ length: 18 }, (_, i) => (f.uid || "")[i] || "");

  return (
    <CertFontScope resetKey={resetKey}>
    <CertFontTools onReset={reset} />
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
            <CertEdit label sizeKey="hsTitleEn" value={f.titleEn} onChange={set("titleEn")} />
          </p>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "1px 0 6px" }}>
            <CertEdit label sizeKey="hsTitleGu" value={f.titleGu} onChange={set("titleGu")} />
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
            <CertEdit label sizeKey="hsSchoolEn" value={f.schoolEn} onChange={set("schoolEn")} />
          </p>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 13, margin: "2px 0 8px" }}>
            <CertEdit label sizeKey="hsSchoolGu" value={f.schoolGu} onChange={set("schoolGu")} />
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
                <Lab><CertEdit label sizeKey="hsSscLabel" value={f.sscLabel} onChange={set("sscLabel")} /></Lab>
                <CertEdit sizeKey="hsSscIndex" value={f.sscIndex} onChange={set("sscIndex")} style={{ fontWeight: 700 }} />
              </div>
              <div style={{ fontSize: 9 }}>
                <Lab><CertEdit label sizeKey="hsSscGu" value={f.sscGu} onChange={set("sscGu")} /></Lab>
                <CertEdit sizeKey="hsSscIndexGu" value={f.sscIndex} onChange={set("sscIndex")} />
              </div>
              <div style={{ marginTop: 3 }}>
                <Lab><CertEdit label sizeKey="hsHscLabel" value={f.hscLabel} onChange={set("hscLabel")} /></Lab>
                <CertEdit sizeKey="hsHscIndex" value={f.hscIndex} onChange={set("hscIndex")} style={{ fontWeight: 700 }} />
              </div>
              <div style={{ fontSize: 9 }}>
                <Lab><CertEdit label sizeKey="hsHscGu" value={f.hscGu} onChange={set("hscGu")} /></Lab>
                <CertEdit sizeKey="hsHscIndexGu" value={f.hscIndex} onChange={set("hscIndex")} />
              </div>
              <div style={{ marginTop: 3 }}>
                <Lab><CertEdit label sizeKey="hsDiseLabel" value={f.diseLabel} onChange={set("diseLabel")} /></Lab>
                <CertEdit sizeKey="hsDiseCode" value={f.diseCode} onChange={set("diseCode")} style={{ fontWeight: 700 }} />
              </div>
              <div style={{ fontSize: 9 }}>
                <Lab><CertEdit label sizeKey="hsDiseGu" value={f.diseGu} onChange={set("diseGu")} /></Lab>
                <CertEdit sizeKey="hsDiseCodeGu" value={f.diseCode} onChange={set("diseCode")} />
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>
                <CertEdit label sizeKey="hsPlaceEn" value={f.placeEn} onChange={set("placeEn")} />
              </div>
              <div style={{ fontSize: 9 }}>
                <CertEdit label sizeKey="hsPlaceGu" value={f.placeGu} onChange={set("placeGu")} />
              </div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                <CertEdit label sizeKey="hsSectionEn" value={f.sectionEn} onChange={set("sectionEn")} />
              </div>
              <div style={{ fontSize: 9 }}>
                <CertEdit label sizeKey="hsSectionGu" value={f.sectionGu} onChange={set("sectionGu")} />
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div>
                <Lab><CertEdit label sizeKey="hsNoLabel" value={f.noLabel} onChange={set("noLabel")} /></Lab>
                <Fill sizeKey="hsSerial" value={f.serialNo} onChange={set("serialNo")} minWidth={52} center />
              </div>
              <div style={{ marginTop: 6 }}>
                <Lab><CertEdit label sizeKey="hsGrLabel" value={f.grLabel} onChange={set("grLabel")} /></Lab>
                <Fill sizeKey="hsGr" value={f.grNumber} onChange={set("grNumber")} minWidth={56} center />
              </div>
              <div style={{ marginTop: 6 }}>
                <Lab><CertEdit label sizeKey="hsMediumLabel" value={f.mediumLabel} onChange={set("mediumLabel")} /></Lab>
                <Fill sizeKey="hsMedium" value={f.medium} onChange={set("medium")} minWidth={90} center />
              </div>
            </div>
          </div>

          {/* Fields 1–14 */}
          <Field n="" en={<CertEdit label sizeKey="hsNameEnLabel" value={f.nameEnLabel} onChange={set("nameEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsNameGuLabel" value={f.nameGuLabel} onChange={set("nameGuLabel")} /></Lab><Fill sizeKey="hsNameGu" value={f.nameGu} onChange={set("nameGu")} flex={1} minWidth={160} /></>}>
            <Fill sizeKey="hsNameEn" value={f.nameEn} onChange={set("nameEn")} flex={1} minWidth={180} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsCasteEnLabel" value={f.casteEnLabel} onChange={set("casteEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsCasteGuLabel" value={f.casteGuLabel} onChange={set("casteGuLabel")} /></Lab><Fill sizeKey="hsCasteGu" value={f.religionCasteGu} onChange={set("religionCasteGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsCasteEn" value={f.religionCasteEn} onChange={set("religionCasteEn")} flex={1} minWidth={160} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsMotherEnLabel" value={f.motherEnLabel} onChange={set("motherEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsMotherGuLabel" value={f.motherGuLabel} onChange={set("motherGuLabel")} /></Lab><Fill sizeKey="hsMotherGu" value={f.motherGu} onChange={set("motherGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsMotherEn" value={f.motherEn} onChange={set("motherEn")} flex={1} minWidth={160} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsBirthEnLabel" value={f.birthEnLabel} onChange={set("birthEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsBirthGuLabel" value={f.birthGuLabel} onChange={set("birthGuLabel")} /></Lab><Fill sizeKey="hsBirthGu" value={f.birthPlaceGu} onChange={set("birthPlaceGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsBirthEn" value={f.birthPlaceEn} onChange={set("birthPlaceEn")} flex={1} minWidth={160} />
          </Field>

          <Field
            n=""
            en={<CertEdit label sizeKey="hsDobEnLabel" value={f.dobEnLabel} onChange={set("dobEnLabel")} />}
            gu={
              <>
                <Lab><CertEdit label sizeKey="hsDobGuLabel" value={f.dobGuLabel} onChange={set("dobGuLabel")} /></Lab>
                <Fill sizeKey="hsDobGu" value={f.dob} onChange={set("dob")} minWidth={96} />
                <span style={{ width: "100%", fontSize: 10, marginTop: 2, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end" }}>
                  <CertEdit label sizeKey="hsDobHintGu" value={f.dobHintGu} onChange={set("dobHintGu")} />
                  <Fill sizeKey="hsDobWordsGu" value={f.dobWordsGu} onChange={set("dobWordsGu")} flex={1} minWidth={200} />
                </span>
              </>
            }
          >
            <Fill sizeKey="hsDobEn" value={f.dob} onChange={set("dob")} minWidth={110} />
            <span style={{ width: "100%", fontWeight: 400, fontSize: 9.5, marginTop: 2 }}>
              <CertEdit label sizeKey="hsDobHintEn" value={f.dobHintEn} onChange={set("dobHintEn")} />
            </span>
            <Fill sizeKey="hsDobWordsEn" value={f.dobWordsEn} onChange={set("dobWordsEn")} flex={1} minWidth={200} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsLastEnLabel" value={f.lastEnLabel} onChange={set("lastEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsLastGuLabel" value={f.lastGuLabel} onChange={set("lastGuLabel")} /></Lab><Fill sizeKey="hsLastGu" value={f.lastSchoolGu} onChange={set("lastSchoolGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsLastEn" value={f.lastSchoolEn} onChange={set("lastSchoolEn")} flex={1} minWidth={160} />
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
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 0 }}>
                  <Lab><CertEdit label sizeKey="hsAdmEnLabel" value={f.admEnLabel} onChange={set("admEnLabel")} style={{ fontWeight: 700 }} /></Lab>
                  <Fill sizeKey="hsAdmission" value={f.admissionDate} onChange={set("admissionDate")} flex={1} minWidth={90} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 0 }}>
                  <Lab><CertEdit label sizeKey="hsLeaveEnLabel" value={f.leaveEnLabel} onChange={set("leaveEnLabel")} style={{ fontWeight: 700 }} /></Lab>
                  <Fill sizeKey="hsLeaving" value={f.leavingDate} onChange={set("leavingDate")} flex={1} minWidth={90} />
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
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 0 }}>
                  <Lab><CertEdit label sizeKey="hsAdmGuLabel" value={f.admGuLabel} onChange={set("admGuLabel")} /></Lab>
                  <Fill sizeKey="hsAdmissionGu" value={f.admissionDate} onChange={set("admissionDate")} flex={1} minWidth={70} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 0 }}>
                  <Lab><CertEdit label sizeKey="hsLeaveGuLabel" value={f.leaveGuLabel} onChange={set("leaveGuLabel")} /></Lab>
                  <Fill sizeKey="hsLeavingGu" value={f.leavingDate} onChange={set("leavingDate")} flex={1} minWidth={70} />
                </div>
              </div>
            </div>
          </div>

          <Field
            n=""
            en={<CertEdit label sizeKey="hsStudyEnLabel" value={f.studyEnLabel} onChange={set("studyEnLabel")} />}
            gu={
              <>
                <Lab><CertEdit label sizeKey="hsStudyGuLabel" value={f.studyGuLabel} onChange={set("studyGuLabel")} /></Lab>
                <Fill sizeKey="hsStudyGu" value={f.studyGu} onChange={set("studyGu")} flex={1} minWidth={140} />
              </>
            }
          >
            <Fill sizeKey="hsStudying" value={f.studying} onChange={set("studying")} minWidth={90} />
            <Fill sizeKey="hsStudyingSince" value={f.studyingSince} onChange={set("studyingSince")} flex={1} minWidth={120} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsReasonEnLabel" value={f.reasonEnLabel} onChange={set("reasonEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsReasonGuLabel" value={f.reasonGuLabel} onChange={set("reasonGuLabel")} /></Lab><Fill sizeKey="hsReasonGu" value={f.reasonGu} onChange={set("reasonGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsReasonEn" value={f.reasonEn} onChange={set("reasonEn")} flex={1} minWidth={160} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsProgressEnLabel" value={f.progressEnLabel} onChange={set("progressEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsProgressGuLabel" value={f.progressGuLabel} onChange={set("progressGuLabel")} /></Lab><Fill sizeKey="hsProgressGu" value={f.progressGu} onChange={set("progressGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsProgressEn" value={f.progressEn} onChange={set("progressEn")} flex={1} minWidth={160} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsConductEnLabel" value={f.conductEnLabel} onChange={set("conductEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsConductGuLabel" value={f.conductGuLabel} onChange={set("conductGuLabel")} /></Lab><Fill sizeKey="hsConductGu" value={f.conductGu} onChange={set("conductGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsConductEn" value={f.conductEn} onChange={set("conductEn")} flex={1} minWidth={160} />
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsRemarksEnLabel" value={f.remarksEnLabel} onChange={set("remarksEnLabel")} />} gu={<><Lab><CertEdit label sizeKey="hsRemarksGuLabel" value={f.remarksGuLabel} onChange={set("remarksGuLabel")} /></Lab><Fill sizeKey="hsRemarksGu" value={f.remarksGu} onChange={set("remarksGu")} flex={1} minWidth={140} /></>}>
            <Fill sizeKey="hsRemarksEn" value={f.remarksEn} onChange={set("remarksEn")} flex={1} minWidth={120} />
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
              <CertEdit label sizeKey="hsSscLine" value={f.sscLine} onChange={set("sscLine")} />
              <Fill sizeKey="hsSscExam" value={f.sscExam} onChange={set("sscExam")} minWidth={48} center />
              <Lab><CertEdit label sizeKey="hsSeatLabel" value={f.seatLabel} onChange={set("seatLabel")} /></Lab>
              <Fill sizeKey="hsSeatNo" value={f.sscSeatNo} onChange={set("sscSeatNo")} minWidth={90} center />
            </span>
          </Field>

          <Field n="" en={<CertEdit label sizeKey="hsUidLabel" value={f.uidLabel} onChange={set("uidLabel")} />}>
            <div style={{ display: "flex", gap: 1.5, flexWrap: "nowrap" }}>
              {uidChars.map((ch, i) => (
                <CertEdit
                  key={i}
                  sizeKey={`hsUid${i}`}
                  value={ch}
                  onChange={(next) => {
                    const chars = (f.uid || "").padEnd(18, " ").slice(0, 18).split("");
                    const typed = next.replace(/\s/g, "");
                    if (!typed) chars[i] = " ";
                    else {
                      for (let k = 0; k < typed.length && i + k < 18; k++) chars[i + k] = typed[k];
                    }
                    set("uid")(chars.join("").slice(0, 18));
                  }}
                  style={{
                    width: 16,
                    height: 19,
                    border: "1px solid #111",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </Field>

          {/* Date + certify */}
          <div style={{ marginTop: 10, borderTop: "1px solid #bbb", paddingTop: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 0, marginBottom: 6, fontSize: 11 }}>
              <Lab><CertEdit label sizeKey="hsDateLabel" value={f.dateLabel} onChange={set("dateLabel")} style={{ fontWeight: 700 }} /></Lab>
              <Fill sizeKey="hsIssueDate" value={f.issueDate} onChange={set("issueDate")} minWidth={110} />
            </div>
            <p style={{ margin: "0 0 2px", fontSize: 10, lineHeight: 1.5, fontWeight: 600 }}>
              <CertEdit label multiline sizeKey="hsCertEn" value={f.certEn} onChange={set("certEn")} />
            </p>
            <p style={{ margin: 0, fontSize: 9.5, lineHeight: 1.5 }}>
              <CertEdit label multiline sizeKey="hsCertGu" value={f.certGu} onChange={set("certGu")} />
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
            {(
              [
                ["signClerk", "signClerkGu", "hsSignClerk", "hsSignClerkGu"],
                ["signTeacher", "signTeacherGu", "hsSignTeacher", "hsSignTeacherGu"],
                ["signPrincipal", "signPrincipalGu", "hsSignPrincipal", "hsSignPrincipalGu"],
              ] as const
            ).map(([enKey, guKey, enSize, guSize]) => (
              <div key={enKey} style={{ textAlign: "center" }}>
                <div style={{ height: 32 }} />
                <div style={{ borderTop: "1px solid #111", paddingTop: 4 }}>
                  <div style={{ fontWeight: 700 }}>
                    <CertEdit label sizeKey={enSize} value={f[enKey]} onChange={set(enKey)} />
                  </div>
                  <div style={{ fontSize: 10 }}>
                    <CertEdit label sizeKey={guSize} value={f[guKey]} onChange={set(guKey)} />
                  </div>
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
            <CertEdit label multiline sizeKey="hsWarningEn" value={f.warningEn} onChange={set("warningEn")} />
            <br />
            <CertEdit label multiline sizeKey="hsWarningGu" value={f.warningGu} onChange={set("warningGu")} />
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
    </CertFontScope>
  );
}
