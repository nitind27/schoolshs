/** Shri Sarvajanik High School — certificate layout (from official scan) */
export const CERTIFICATE_SCHOOL = {
  nameEn: "SHRI SARVAJANIK HIGH SCHOOL",
  nameEnAlt: "SARVAJANIK HIGHSCHOOL, FORT-SONGADH",
  nameGu: "સાર્વજનિક હાઈસ્કૂલ, ફોર્ટ-સોનગઢ",
  address: "Navagam, Fort-Songadh, Dist. Tapi. Pin-394670 Ph.No. 222186",
  addressGu: "તા. સોનગઢ, જિ. તાપી",
  sscIndex: "79.0018",
  hscIndex: "28.0003",
  diseCode: "24261004405",
  phone: "222186",
  medium: "Gujarati / ગુજરાતી",
  section: "Secondary & Higher Secondary Section",
  principalLabel: "Principal / Head Master",
  clerkLabel: "Clerk / ક્લાર્ક",
  classTeacherLabel: "Class Teacher / વર્ગ શિક્ષક",
} as const;

export const CERTIFICATE_TYPES = [
  { id: "bonafide", labelEn: "Bonafide Certificate", labelGu: "બોનાફાઇડ પ્રમાણપત્ર", landscape: true },
  { id: "lc", labelEn: "School Leaving Certificate (LC)", labelGu: "શાળા છોડ્યાનું પ્રમાણપત્ર", landscape: false },
  { id: "character", labelEn: "Character / Trial / Bonafide", labelGu: "ચારિત્ર્ય / ટ્રાયલ / બોનાફાઇડ", landscape: false },
  { id: "monthly-attendance", labelEn: "Monthly Attendance Patrak", labelGu: "માસિક હાજરી પત્રક", landscape: false },
  { id: "daily-attendance-book", labelEn: "Daily Attendance Book", labelGu: "દૈનિક હાજરી નોંધ", landscape: false },
  { id: "class-register", labelEn: "Class Register & Attendance", labelGu: "વર્ગ રજિસ્ટર અને હાજરી", landscape: true },
  { id: "general-register", labelEn: "General Register (GR)", labelGu: "સામાન્ય રજિસ્ટર (વય પત્રક)", landscape: true },
  { id: "monthly-reports", labelEn: "Monthly Reports (Scholarship)", labelGu: "માસિક અહેવાલ (શિષ્યવૃત્તિ)", landscape: false },
] as const;

export type CertificateTypeId = (typeof CERTIFICATE_TYPES)[number]["id"];
