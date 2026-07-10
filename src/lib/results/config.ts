import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";

/** GSEB માધ્યમિક વિભાગ — વાર્ષિક પરીક્ષા પરિણામ પત્રક (official scan format) */
export const ANNUAL_RESULT_SUBJECTS = [
  { name: "ગુજરાતી", nameEn: "Gujarati", maxMarks: 100 },
  { name: "અંગ્રેજી", nameEn: "English", maxMarks: 100 },
  { name: "હિન્દી", nameEn: "Hindi", maxMarks: 100 },
  { name: "સંસ્કૃત", nameEn: "Sanskrit", maxMarks: 100 },
  { name: "ગણિત", nameEn: "Mathematics", maxMarks: 100 },
  { name: "વિજ્ઞાન", nameEn: "Science", maxMarks: 100 },
  { name: "સામાજિક વિજ્ઞાન", nameEn: "Social Science", maxMarks: 100 },
  { name: "સ્વા.અને શા.શિક્ષણ", nameEn: "Health & Physical Ed.", maxMarks: 100 },
  { name: "ચિત્રકામ", nameEn: "Drawing", maxMarks: 100 },
  { name: "કોમ્પ્યુટર", nameEn: "Computer", maxMarks: 100 },
] as const;

export const ANNUAL_RESULT_TOTAL_MARKS = ANNUAL_RESULT_SUBJECTS.reduce((s, sub) => s + sub.maxMarks, 0);

export const RESULT_PASS_PERCENTAGE = 33;

export const RESULT_SCHOOL = {
  nameGu: CERTIFICATE_SCHOOL.nameGu,
  nameEn: CERTIFICATE_SCHOOL.nameEnAlt,
  districtGu: "જી. તાપી",
  sectionGu: "માધ્યમિક વિભાગ",
  sectionEn: "Secondary Section",
  postcardSchoolGu: "સાર્વજનિક હાઈસ્કૂલ સોનગઢ",
} as const;

export function formatAcademicYearLabel(year: string): string {
  const [a, b] = year.split("-");
  const start = a?.slice(-2) || "25";
  const end = b?.slice(-2) || "26";
  return `${start} - ${end}`;
}

export function resultSessionName(standard: string, academicYear: string): string {
  return `વાર્ષિક પરીક્ષા — ધોરણ ${standard} (${academicYear})`;
}
