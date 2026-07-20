import type { UserRole } from "@/lib/roles";

export type HelpLang = "en" | "hi" | "gu";

export type HelpTopic = {
  id: string;
  /** Roles that may see this topic. Empty = all authenticated roles. */
  roles: UserRole[];
  keywords: string[];
  title: Record<HelpLang, string>;
  answer: Record<HelpLang, string>;
  href?: string;
  /** Optional secondary links shown as chips */
  links?: { href: string; label: Record<HelpLang, string> }[];
};

export type HelpQuickPrompt = {
  id: string;
  roles: UserRole[];
  label: Record<HelpLang, string>;
  query: Record<HelpLang, string>;
};

export const HELP_TOPICS: HelpTopic[] = [
  // ── Shared / common ───────────────────────────────────────
  {
    id: "home",
    roles: ["school_admin", "teacher", "clerk", "ca", "student", "super_admin"],
    keywords: [
      "home", "dashboard", "start", "where", "main",
      "होम", "डैशबोर्ड", "शुरू", "मुख्य",
      "હોમ", "ડેશબોર્ડ", "શરૂ", "મુખ્ય",
    ],
    title: {
      en: "Open your home dashboard",
      hi: "अपना होम डैशबोर्ड खोलें",
      gu: "તમારું હોમ ડેશબોર્ડ ખોલો",
    },
    answer: {
      en: "Your home screen depends on your role. Use the left sidebar for main sections, and the top bar for letterhead, chat, notifications, language and profile.",
      hi: "आपकी भूमिका के अनुसार होम स्क्रीन अलग होती है। बाईं साइडबार से मुख्य सेक्शन खोलें, और ऊपर लेटरहेड, चैट, नोटिफिकेशन, भाषा व प्रोफाइल हैं।",
      gu: "તમારી ભૂમિકા મુજબ હોમ સ્ક્રીન અલગ હોય છે. ડાબી સાઇડબારથી મુખ્ય વિભાગ ખોલો, અને ઉપર લેટરહેડ, ચેટ, નોટિફિકેશન, ભાષા તથા પ્રોફાઇલ છે.",
    },
  },
  {
    id: "language",
    roles: ["school_admin", "teacher", "clerk", "ca", "student", "super_admin"],
    keywords: [
      "language", "english", "gujarati", "hindi", "translate", "ગુજરાતી", "हिंदी", "ભાષા", "भाषा",
    ],
    title: {
      en: "Change language",
      hi: "भाषा बदलें",
      gu: "ભાષા બદલો",
    },
    answer: {
      en: "Use the language button (EN / ગુ) in the top-right navbar. You can also ask me in English, Hindi or Gujarati — I reply in the same language.",
      hi: "ऊपर दाईं ओर भाषा बटन (EN / ગુ) से भाषा बदलें। मुझसे अंग्रेज़ी, हिंदी या गुजराती में पूछ सकते हैं — मैं उसी भाषा में जवाब दूंगा।",
      gu: "ઉપર જમણે ભાષા બટન (EN / ગુ) થી ભાષા બદલો. મને અંગ્રેજી, હિન્દી અથવા ગુજરાતીમાં પૂછો — હું એ જ ભાષામાં જવાબ આપીશ.",
    },
  },
  {
    id: "chat-admin",
    roles: ["school_admin"],
    keywords: [
      "chat", "message", "staff chat", "talk", "સંદેશ", "ચેટ", "संदेश", "चैट", "message karo",
    ],
    title: {
      en: "Staff Chat (Admin)",
      hi: "स्टाफ चैट (एडमिन)",
      gu: "સ્ટાફ ચેટ (એડમિન)",
    },
    answer: {
      en: "In the Admin panel, tap the message icon in the top navbar to open Staff Chat. Stay on admin — this never opens the Teacher panel. Optional full page: Chat.",
      hi: "एडमिन पैनल में ऊपर मैसेज आइकन से Staff Chat खोलें। एडमिन में ही रहें — टीचर पैनल नहीं खुलेगा। पूरा पेज चाहिए तो Chat खोलें।",
      gu: "એડમિન પેનલમાં ઉપર મેસેજ આઇકનથી Staff Chat ખોલો. એડમિનમાં જ રહો — ટીચર પેનલ નહીં ખુલે. પૂરું પેજ જોઈએ તો Chat ખોલો.",
    },
    href: "/chat",
  },
  {
    id: "chat-clerk",
    roles: ["clerk"],
    keywords: [
      "chat", "message", "staff chat", "talk", "સંદેશ", "ચેટ", "संदेश", "चैट", "message karo",
    ],
    title: {
      en: "Staff Chat (Clerk)",
      hi: "स्टाफ चैट (क्लर्क)",
      gu: "સ્ટાફ ચેટ (ક્લાર્ક)",
    },
    answer: {
      en: "In the Clerk panel, tap the message icon in the top navbar to chat with admin and teachers. Full page: Chat.",
      hi: "क्लर्क पैनल में ऊपर मैसेज आइकन से एडमिन/टीचर से चैट करें। पूरा पेज: Chat।",
      gu: "ક્લાર્ક પેનલમાં ઉપર મેસેજ આઇકનથી એડમિન/શિક્ષક સાથે ચેટ કરો. પૂરું પેજ: Chat.",
    },
    href: "/chat",
  },
  {
    id: "chat-teacher",
    roles: ["teacher"],
    keywords: [
      "chat", "message", "staff chat", "talk", "સંદેશ", "ચેટ", "संदेश", "चैट", "message karo",
    ],
    title: {
      en: "Staff Chat (Teacher)",
      hi: "स्टाफ चैट (टीचर)",
      gu: "સ્ટાફ ચેટ (શિક્ષક)",
    },
    answer: {
      en: "In the Teacher panel, tap the message icon in the top navbar to chat with admin, clerks and other teachers. Full page: Chat.",
      hi: "टीचर पैनल में ऊपर मैसेज आइकन से एडमिन/क्लर्क/अन्य टीचर से चैट करें। पूरा पेज: Chat।",
      gu: "ટીચર પેનલમાં ઉપર મેસેજ આઇકનથી એડમિન/ક્લાર્ક/અન્ય શિક્ષક સાથે ચેટ કરો. પૂરું પેજ: Chat.",
    },
    href: "/chat",
  },
  {
    id: "profile-password",
    roles: ["school_admin", "teacher", "clerk", "ca", "student"],
    keywords: [
      "password", "profile", "account", "change password", "પાસવર્ડ", "પ્રોફાઇલ", "पासवर्ड", "प्रोफाइल",
    ],
    title: {
      en: "Profile & password",
      hi: "प्रोफाइल और पासवर्ड",
      gu: "પ્રોફાઇલ અને પાસવર્ડ",
    },
    answer: {
      en: "Open your profile from the top-right avatar menu. You can update account details and change password there.",
      hi: "ऊपर दाईं ओर अवतार मेनू से प्रोफाइल खोलें। वहाँ विवरण अपडेट और पासवर्ड बदल सकते हैं।",
      gu: "ઉપર જમણે અવતાર મેનૂથી પ્રોફાઇલ ખોલો. ત્યાં વિગતો અપડેટ અને પાસવર્ડ બદલી શકો છો.",
    },
    href: "/profile",
  },

  // ── School admin ──────────────────────────────────────────
  {
    id: "admin-students",
    roles: ["school_admin", "clerk"],
    keywords: [
      "student", "students", "add student", "વિદ્યાર્થી", "વિદ્યાર્થીઓ", "विद्यार्थी", "छात्र", "नया छात्र",
    ],
    title: {
      en: "Manage students",
      hi: "छात्र प्रबंधन",
      gu: "વિદ્યાર્થી વ્યવસ્થાપન",
    },
    answer: {
      en: "Go to Students to search, filter and edit records. Use Add Student for a new entry, or Bulk Import for Excel/CSV.",
      hi: "Students से रिकॉर्ड खोजें/संपादित करें। नया छात्र Add Student से, और Excel/CSV Bulk Import से जोड़ें।",
      gu: "Studentsમાંથી રેકોર્ડ શોધો/સંપાદિત કરો. નવો વિદ્યાર્થી Add Studentથી, અને Excel/CSV Bulk Importથી ઉમેરો.",
    },
    href: "/students",
    links: [
      { href: "/students/new", label: { en: "Add student", hi: "नया छात्र", gu: "નવો વિદ્યાર્થી" } },
      { href: "/import", label: { en: "Bulk import", hi: "बल्क आयात", gu: "બલ્ક આયાત" } },
    ],
  },
  {
    id: "admin-scholarship",
    roles: ["school_admin"],
    keywords: [
      "scholarship", "digital gujarat", "dg", "submit", "શિષ્યવૃત્તિ", "સબમિટ", "छात्रवृत्ति", "सबमिट",
    ],
    title: {
      en: "Scholarship & Digital Gujarat",
      hi: "छात्रवृत्ति और Digital Gujarat",
      gu: "શિષ્યવૃત્તિ અને Digital Gujarat",
    },
    answer: {
      en: "Prepare students (Ready status), then use Bulk Submit or Auto Apply from the admin sidebar Scholarship section.",
      hi: "छात्रों को Ready बनाएँ, फिर एडमिन साइडबार Scholarship से Bulk Submit या Auto Apply उपयोग करें।",
      gu: "વિદ્યાર્થીઓને Ready બનાવો, પછી એડમિન સાઇડબાર Scholarshipથી Bulk Submit અથવા Auto Apply વાપરો.",
    },
    href: "/bulk-submit",
    links: [
      { href: "/auto-apply", label: { en: "Auto Apply", hi: "ऑटो अप्लाई", gu: "ઓટો અપ્લાય" } },
    ],
  },
  {
    id: "clerk-scholarship",
    roles: ["clerk"],
    keywords: [
      "scholarship", "digital gujarat", "dg", "submit", "શિષ્યવૃત્તિ", "સબમિટ", "छात्रवृत्ति", "सबमिट",
    ],
    title: {
      en: "Clerk scholarship",
      hi: "क्लर्क छात्रवृत्ति",
      gu: "ક્લાર્ક શિષ્યવૃત્તિ",
    },
    answer: {
      en: "Open Scholarship from your Clerk menu, then use Bulk Submit or Auto Apply as needed.",
      hi: "क्लर्क मेनू से Scholarship खोलें, फिर Bulk Submit या Auto Apply उपयोग करें।",
      gu: "ક્લાર્ક મેનૂથી Scholarship ખોલો, પછી Bulk Submit અથવા Auto Apply વાપરો.",
    },
    href: "/clerk/scholarship",
    links: [
      { href: "/bulk-submit", label: { en: "Bulk submit", hi: "बल्क सबमिट", gu: "બલ્ક સબમિટ" } },
      { href: "/auto-apply", label: { en: "Auto Apply", hi: "ऑटो अप्लाई", gu: "ઓટો અપ્લાય" } },
    ],
  },
  {
    id: "admin-attendance",
    roles: ["school_admin", "clerk"],
    keywords: [
      "attendance", "present", "absent", "હાજરી", "હાજર", "ગેરહાજર", "हाजरी", "उपस्थिति", "गैरहाजिर",
    ],
    title: {
      en: "Student attendance",
      hi: "छात्र हाजरी",
      gu: "વિદ્યાર્થી હાજરી",
    },
    answer: {
      en: "Open Student Attendance from Academics to mark or review class attendance for your school.",
      hi: "Academics से Student Attendance खोलकर स्कूल की कक्षा हाजरी देखें/लगाएँ।",
      gu: "Academicsથી Student Attendance ખોલીને શાળાની વર્ગ હાજરી જુઓ/માર્ક કરો.",
    },
    href: "/attendance",
  },
  {
    id: "teacher-attendance",
    roles: ["teacher"],
    keywords: [
      "attendance", "present", "absent", "હાજરી", "હાજર", "ગેરહાજર", "हाजरी", "उपस्थिति", "गैरहाजिर", "mark",
    ],
    title: {
      en: "Mark attendance (Teacher)",
      hi: "हाजरी लगाएँ (टीचर)",
      gu: "હાજરી માર્ક કરો (શિક્ષક)",
    },
    answer: {
      en: "Open Teacher → Attendance to mark daily P/A/H for students in your assigned class only.",
      hi: "Teacher → Attendance से सिर्फ अपनी असाइन क्लास की रोज़ाना हाजरी लगाएँ।",
      gu: "Teacher → Attendanceથી માત્ર તમારી અસાઇન ક્લાસની રોજની હાજરી માર્ક કરો.",
    },
    href: "/teacher/attendance",
  },
  {
    id: "admin-timetable",
    roles: ["school_admin", "clerk"],
    keywords: [
      "timetable", "period", "schedule", "સમયપત્રક", "પીરિયડ", "समयसारणी", "पीरियड",
    ],
    title: {
      en: "School timetable",
      hi: "स्कूल समयसारणी",
      gu: "શાળા સમયપત્રક",
    },
    answer: {
      en: "Open Timetable from Academics to view or manage the school class timetable.",
      hi: "Academics से Timetable खोलकर स्कूल की कक्षा समयसारणी देखें/मैनेज करें।",
      gu: "Academicsથી Timetable ખોલીને શાળાનું વર્ગ સમયપત્રક જુઓ/મેનેજ કરો.",
    },
    href: "/timetable",
  },
  {
    id: "teacher-timetable",
    roles: ["teacher"],
    keywords: [
      "timetable", "period", "schedule", "સમયપત્રક", "પીરિયડ", "समयसारणी", "पीरियड", "my timetable",
    ],
    title: {
      en: "My timetable (Teacher)",
      hi: "मेरी समयसारणी (टीचर)",
      gu: "મારું સમયપત્રક (શિક્ષક)",
    },
    answer: {
      en: "Open Teacher → My Timetable to see only your teaching periods.",
      hi: "Teacher → My Timetable से सिर्फ आपकी पीरियड सारणी देखें।",
      gu: "Teacher → My Timetableથી માત્ર તમારી પીરિયડ સારણી જુઓ.",
    },
    href: "/teacher/timetable",
  },
  {
    id: "admin-results",
    roles: ["school_admin", "clerk"],
    keywords: [
      "result", "results", "marks", "exam", "પરિણામ", "ગુણ", "परिणाम", "अंक", "मार्क्स",
    ],
    title: {
      en: "Results & marks (Admin)",
      hi: "परिणाम और अंक (एडमिन)",
      gu: "પરિણામ અને ગુણ (એડમિન)",
    },
    answer: {
      en: "From the Admin / Clerk panel, open Results to enter mid/final marks, publish and print.",
      hi: "एडमिन/क्लर्क पैनल से Results खोलकर मिड/फाइनल अंक दर्ज करें, पब्लिश और प्रिंट करें।",
      gu: "એડમિન/ક્લાર્ક પેનલથી Results ખોલીને મિડ/ફાઇનલ ગુણ દાખલ કરો, પબ્લિશ અને પ્રિન્ટ કરો.",
    },
    href: "/results",
  },
  {
    id: "teacher-results",
    roles: ["teacher"],
    keywords: [
      "result", "results", "marks", "exam", "પરિણામ", "ગુણ", "परिणाम", "अंक", "मार्क्स",
    ],
    title: {
      en: "Results & marks (Teacher)",
      hi: "परिणाम और अंक (टीचर)",
      gu: "પરિણામ અને ગુણ (શિક્ષક)",
    },
    answer: {
      en: "From the Teacher panel, open Results to enter marks for your assigned classes.",
      hi: "टीचर पैनल से Results खोलकर अपनी असाइन क्लास के अंक दर्ज करें।",
      gu: "ટીચર પેનલથી Results ખોલીને તમારી અસાઇન ક્લાસના ગુણ દાખલ કરો.",
    },
    href: "/results",
  },
  {
    id: "admin-staff",
    roles: ["school_admin", "clerk"],
    keywords: [
      "staff", "teacher list", "payroll", "salary", "સ્ટાફ", "પગાર", "स्टाफ", "वेतन", "पेरोल",
    ],
    title: {
      en: "Staff & payroll",
      hi: "स्टाफ और पेरोल",
      gu: "સ્ટાફ અને પેરોલ",
    },
    answer: {
      en: "Under Staff you can manage employees, attendance, payroll, salary statement, slips and income tax.",
      hi: "Staff में कर्मचारी, हाजरी, पेरोल, सैलरी स्टेटमेंट, स्लिप और इनकम टैक्स मैनेज करें।",
      gu: "Staffમાં કર્મચારી, હાજરી, પેરોલ, સેલરી સ્ટેટમેન્ટ, સ્લિપ અને ઇનકમ ટેક્સ મેનેજ કરો.",
    },
    href: "/staff",
    links: [
      { href: "/staff/payroll", label: { en: "Payroll", hi: "पेरोल", gu: "પેરોલ" } },
      { href: "/staff/attendance", label: { en: "Staff attendance", hi: "स्टाफ हाजरी", gu: "સ્ટાફ હાજરી" } },
    ],
  },
  {
    id: "admin-accounting",
    roles: ["school_admin", "clerk", "ca"],
    keywords: [
      "accounting", "voucher", "accounts", "trial balance", "લેખાકારી", "વાઉચર", "लेखांकन", "वाउचर",
    ],
    title: {
      en: "Accounting",
      hi: "लेखांकन",
      gu: "લેખાકારી",
    },
    answer: {
      en: "Accounting covers day book, vouchers, trial balance and reports. CA can also audit and verify vouchers.",
      hi: "Accounting में डे बुक, वाउचर, ट्रायल बैलेंस और रिपोर्ट्स हैं। CA ऑडिट और वाउचर वेरिफाई भी कर सकते हैं।",
      gu: "Accountingમાં ડે બુક, વાઉચર, ટ્રાયલ બેલેન્સ અને રિપોર્ટ છે. CA ઓડિટ અને વાઉચર વેરિફાઇ પણ કરી શકે.",
    },
    href: "/accounting",
  },
  {
    id: "admin-certificates",
    roles: ["school_admin", "clerk"],
    keywords: [
      "certificate", "bonafide", "lc", "gr", "general register", "પ્રમાણપત્ર", "બોનાફાઇડ", "प्रमाणपत्र",
    ],
    title: {
      en: "Certificates & GR",
      hi: "प्रमाणपत्र और GR",
      gu: "પ્રમાણપત્ર અને GR",
    },
    answer: {
      en: "Certificates section has bonafide, LC, registers and General Register (GR).",
      hi: "Certificates में बोनाफाइड, LC, रजिस्टर और General Register (GR) हैं।",
      gu: "Certificatesમાં બોનાફાઇડ, LC, રજિસ્ટર અને General Register (GR) છે.",
    },
    href: "/certificates",
    links: [
      { href: "/certificates/general-register", label: { en: "General Register", hi: "जनरल रजिस्टर", gu: "જનરલ રજિસ્ટર" } },
    ],
  },
  {
    id: "admin-idcards",
    roles: ["school_admin", "clerk"],
    keywords: [
      "id card", "id cards", "photo", "આઈડી", "કાર્ડ", "आईडी कार्ड",
    ],
    title: {
      en: "ID Cards",
      hi: "आईडी कार्ड",
      gu: "આઈડી કાર્ડ",
    },
    answer: {
      en: "Generate and print class-wise student ID cards from ID Cards.",
      hi: "ID Cards से कक्षा-वार छात्र आईडी कार्ड बनाएँ और प्रिंट करें।",
      gu: "ID Cardsથી વર્ગ-વાર વિદ્યાર્થી આઈડી કાર્ડ બનાવો અને પ્રિન્ટ કરો.",
    },
    href: "/id-cards",
  },
  {
    id: "admin-letterhead",
    roles: ["school_admin", "clerk"],
    keywords: [
      "letterhead", "letter head", "letter", "official letter", "school letter", "patra",
      "letterhead studio", "print letter", "pdf letter",
      "લેટરહેડ", "પત્ર", "શાળા પત્ર", "પત્ર લેખન", "લેટર હેડ",
      "लेटरहेड", "पत्र", "स्कूल पत्र", "आधिकारिक पत्र",
    ],
    title: {
      en: "Letterhead Studio",
      hi: "लेटरहेड स्टूडियो",
      gu: "લેટરહેડ સ્ટુડિયો",
    },
    answer: {
      en: "Open Letterhead from the top navbar (pen/signature icon) to write school letters, use templates, stamp/OCR/sign, then Print, PDF or Word. You can also ask me “letterhead” anytime.",
      hi: "ऊपर नैवबार में लेटरहेड आइकन (पेन/सिग्नेचर) से Letterhead Studio खोलें — स्कूल पत्र लिखें, टेम्प्लेट/स्टैम्प/OCR/साइन, फिर Print/PDF/Word। मुझसे “लेटरहेड” भी पूछ सकते हैं।",
      gu: "ઉપર નેવબારમાં લેટરહેડ આઇકન (પેન/સિગ્નેચર)થી Letterhead Studio ખોલો — શાળા પત્ર લખો, ટેમ્પલેટ/સ્ટેમ્પ/OCR/સાઇન, પછી Print/PDF/Word. મને “લેટરહેડ” પણ પૂછી શકો.",
    },
    href: "/letterhead",
  },

  // ── Teacher only nuances ──────────────────────────────────
  {
    id: "teacher-students",
    roles: ["teacher"],
    keywords: [
      "my students", "class students", "મારા વિદ્યાર્થી", "मेरे छात्र", "assigned",
    ],
    title: {
      en: "Your class students",
      hi: "आपकी कक्षा के छात्र",
      gu: "તમારા વર્ગના વિદ્યાર્થીઓ",
    },
    answer: {
      en: "Teacher → Students shows only students in your assigned classes. You can search, filter and export.",
      hi: "Teacher → Students में सिर्फ आपकी असाइन क्लास के छात्र दिखते हैं। खोज, फ़िल्टर और एक्सपोर्ट कर सकते हैं।",
      gu: "Teacher → Studentsમાં માત્ર તમારી અસાઇન ક્લાસના વિદ્યાર્થીઓ દેખાય. શોધ, ફિલ્ટર અને એક્સપોર્ટ કરી શકો.",
    },
    href: "/teacher/students",
  },
  {
    id: "admin-board",
    roles: ["school_admin", "clerk"],
    keywords: [
      "board", "ssc", "hsc", "gseb", "બોર્ડ", "बोर्ड",
    ],
    title: {
      en: "Board records",
      hi: "बोर्ड रिकॉर्ड",
      gu: "બોર્ડ રેકોર્ડ",
    },
    answer: {
      en: "Open Board Records from Documents/Academics to manage SSC/HSC board data for the school.",
      hi: "Documents/Academics से Board Records खोलकर स्कूल के SSC/HSC बोर्ड डेटा मैनेज करें।",
      gu: "Documents/Academicsથી Board Records ખોલીને શાળાના SSC/HSC બોર્ડ ડેટા મેનેજ કરો.",
    },
    href: "/students/board-records",
  },
  {
    id: "teacher-board",
    roles: ["teacher"],
    keywords: [
      "board", "ssc", "hsc", "gseb", "બોર્ડ", "बोर्ड",
    ],
    title: {
      en: "Board records (Teacher)",
      hi: "बोर्ड रिकॉर्ड (टीचर)",
      gu: "બોર્ડ રેકોર્ડ (શિક્ષક)",
    },
    answer: {
      en: "Open Teacher → Board Records for board exam data related to your work.",
      hi: "Teacher → Board Records से अपने काम से जुड़ा बोर्ड डेटा देखें।",
      gu: "Teacher → Board Recordsથી તમારા કામ સંબંધિત બોર્ડ ડેટા જુઓ.",
    },
    href: "/teacher/board-records",
  },

  // ── CA ────────────────────────────────────────────────────
  {
    id: "ca-audit",
    roles: ["ca"],
    keywords: [
      "audit", "verify", "ca", "review", "ઓડિટ", "ચકાસો", "ऑडिट", "वेरिफाई",
    ],
    title: {
      en: "CA audit & verify",
      hi: "CA ऑडिट और वेरिफाई",
      gu: "CA ઓડિટ અને વેરિફાઇ",
    },
    answer: {
      en: "From CA portal open Audit Review and Verify Vouchers. Use school switcher if you handle multiple schools.",
      hi: "CA पोर्टल से Audit Review और Verify Vouchers खोलें। कई स्कूल हों तो school switcher उपयोग करें।",
      gu: "CA પોર્ટલથી Audit Review અને Verify Vouchers ખોલો. ઘણી શાળા હોય તો school switcher વાપરો.",
    },
    href: "/ca/audit",
    links: [
      { href: "/ca/verify", label: { en: "Verify vouchers", hi: "वाउचर वेरिफाई", gu: "વાઉચર વેરિફાઇ" } },
      { href: "/accounting/trial-balance", label: { en: "Trial balance", hi: "ट्रायल बैलेंस", gu: "ટ્રાયલ બેલેન્સ" } },
    ],
  },
  {
    id: "ca-reports",
    roles: ["ca", "school_admin", "clerk"],
    keywords: [
      "financial report", "reports", "balance", "નાણાકીય", "રિપોર્ટ", "वित्तीय", "रिपोर्ट",
    ],
    title: {
      en: "Financial reports",
      hi: "वित्तीय रिपोर्ट",
      gu: "નાણાકીય રિપોર્ટ",
    },
    answer: {
      en: "Open Accounting → Reports / Trial Balance for CA-ready statements.",
      hi: "Accounting → Reports / Trial Balance से CA-रेडी स्टेटमेंट देखें।",
      gu: "Accounting → Reports / Trial Balanceથી CA-રેડી સ્ટેટમેન્ટ જુઓ.",
    },
    href: "/accounting/reports",
  },

  // ── Student ───────────────────────────────────────────────
  {
    id: "student-portal",
    roles: ["student"],
    keywords: [
      "my result", "documents", "scholarship status", "મારું", "પરિણામ", "मेरा", "परिणाम", "दस्तावेज",
    ],
    title: {
      en: "Student portal guide",
      hi: "छात्र पोर्टल गाइड",
      gu: "વિદ્યાર્થી પોર્ટલ ગાઇડ",
    },
    answer: {
      en: "From Student home open Profile, Results, Board, Scholarship and Documents. Only your own data is shown.",
      hi: "Student होम से Profile, Results, Board, Scholarship और Documents खोलें। सिर्फ आपका डेटा दिखता है।",
      gu: "Student હોમથી Profile, Results, Board, Scholarship અને Documents ખોલો. માત્ર તમારો ડેટા દેખાય.",
    },
    href: "/student",
  },

  // ── Super admin only ──────────────────────────────────────
  {
    id: "super-schools",
    roles: ["super_admin"],
    keywords: [
      "school", "schools", "register school", "admins", "contract", "payment", "શાળા", "स्कूल", "एडमिन",
    ],
    title: {
      en: "Super Admin — schools & billing",
      hi: "सुपर एडमिन — स्कूल और बिलिंग",
      gu: "સુપર એડમિન — શાળા અને બિલિંગ",
    },
    answer: {
      en: "Manage all schools, create school admins, contracts and payments from the Super Admin panel. School staff cannot see this area.",
      hi: "सुपर एडमिन पैनल से सभी स्कूल, स्कूल एडमिन, कॉन्ट्रैक्ट और पेमेंट मैनेज करें। स्कूल स्टाफ यह क्षेत्र नहीं देख सकता।",
      gu: "સુપર એડમિન પેનલથી બધી શાળા, શાળા એડમિન, કોન્ટ્રાક્ટ અને પેમેન્ટ મેનેજ કરો. શાળા સ્ટાફ આ વિસ્તાર જોઈ શકતો નથી.",
    },
    href: "/admin/schools",
    links: [
      { href: "/admin/admins", label: { en: "School admins", hi: "स्कूल एडमिन", gu: "શાળા એડમિન" } },
      { href: "/admin/payments", label: { en: "Payments", hi: "पेमेंट", gu: "પેમેન્ટ" } },
    ],
  },
];

export const HELP_QUICK_PROMPTS: HelpQuickPrompt[] = [
  {
    id: "q-students",
    roles: ["school_admin", "clerk"],
    label: { en: "Find students", hi: "छात्र खोजें", gu: "વિદ્યાર્થી શોધો" },
    query: { en: "How do I manage students?", hi: "छात्र कैसे मैनेज करूँ?", gu: "વિદ્યાર્થી કેવી રીતે મેનેજ કરું?" },
  },
  {
    id: "q-attendance",
    roles: ["teacher", "school_admin", "clerk"],
    label: { en: "Mark attendance", hi: "हाजरी लगाएँ", gu: "હાજરી માર્ક કરો" },
    query: { en: "Where do I mark attendance?", hi: "हाजरी कहाँ लगाऊँ?", gu: "હાજરી ક્યાં માર્ક કરું?" },
  },
  {
    id: "q-scholarship",
    roles: ["school_admin", "clerk"],
    label: { en: "Scholarship help", hi: "छात्रवृत्ति मदद", gu: "શિષ્યવૃત્તિ મદદ" },
    query: { en: "How to submit scholarship?", hi: "छात्रवृत्ति कैसे सबमिट करें?", gu: "શિષ્યવૃત્તિ કેવી રીતે સબમિટ કરું?" },
  },
  {
    id: "q-timetable",
    roles: ["teacher", "school_admin", "clerk"],
    label: { en: "Timetable", hi: "समयसारणी", gu: "સમયપત્રક" },
    query: { en: "Show me timetable", hi: "समयसारणी दिखाओ", gu: "સમયપત્રક બતાવો" },
  },
  {
    id: "q-results",
    roles: ["teacher", "school_admin", "clerk"],
    label: { en: "Enter marks", hi: "अंक दर्ज करें", gu: "ગુણ દાખલ કરો" },
    query: { en: "How to enter exam marks?", hi: "परीक्षा अंक कैसे डालें?", gu: "પરીક્ષા ગુણ કેવી રીતે દાખલ કરું?" },
  },
  {
    id: "q-accounting",
    roles: ["ca", "school_admin", "clerk"],
    label: { en: "Accounts help", hi: "हिसाब मदद", gu: "હિસાબ મદદ" },
    query: { en: "Open accounting help", hi: "लेखांकन मदद खोलो", gu: "લેખાકારી મદદ ખોલો" },
  },
  {
    id: "q-audit",
    roles: ["ca"],
    label: { en: "Start audit", hi: "ऑडिट शुरू", gu: "ઓડિટ શરૂ" },
    query: { en: "How do I audit vouchers?", hi: "वाउचर ऑडिट कैसे करें?", gu: "વાઉચર ઓડિટ કેવી રીતે કરું?" },
  },
  {
    id: "q-myclass",
    roles: ["teacher"],
    label: { en: "My students", hi: "मेरे छात्र", gu: "મારા વિદ્યાર્થી" },
    query: { en: "Show my class students", hi: "मेरी क्लास के छात्र दिखाओ", gu: "મારા વર્ગના વિદ્યાર્થીઓ બતાવો" },
  },
  {
    id: "q-student",
    roles: ["student"],
    label: { en: "My results", hi: "मेरे परिणाम", gu: "મારા પરિણામ" },
    query: { en: "Where are my results?", hi: "मेरे परिणाम कहाँ हैं?", gu: "મારા પરિણામ ક્યાં છે?" },
  },
  {
    id: "q-super",
    roles: ["super_admin"],
    label: { en: "Manage schools", hi: "स्कूल मैनेज", gu: "શાળા મેનેજ" },
    query: { en: "How to register a school?", hi: "स्कूल कैसे रजिस्टर करें?", gu: "શાળા કેવી રીતે રજિસ્ટર કરું?" },
  },
  {
    id: "q-chat",
    roles: ["school_admin", "teacher", "clerk"],
    label: { en: "Staff chat", hi: "स्टाफ चैट", gu: "સ્ટાફ ચેટ" },
    query: { en: "How to open staff chat?", hi: "स्टाफ चैट कैसे खोलें?", gu: "સ્ટાફ ચેટ કેવી રીતે ખોલું?" },
  },
  {
    id: "q-letterhead",
    roles: ["school_admin", "clerk"],
    label: { en: "Letterhead", hi: "लेटरहेड", gu: "લેટરહેડ" },
    query: { en: "Open letterhead editor", hi: "लेटरहेड एडिटर खोलो", gu: "લેટરહેડ એડિટર ખોલો" },
  },
];
