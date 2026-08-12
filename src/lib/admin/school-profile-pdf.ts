import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "@cantoo/pdf-lib";
import {
  MODULE_FORMAT_KEYS,
  MODULE_FORMAT_OPTIONS,
  PLAN_PRESETS,
  SCHOOL_FEATURES,
  normalizeFeatureList,
  normalizeModuleFormats,
} from "@/lib/school-features";
import { normalizeSchoolAssetPath } from "@/lib/id-card-share";
import { formatSchoolDate } from "@/lib/school-timezone";

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 36;
const BRAND = rgb(0.102, 0.396, 0.314);
const BRAND_DEEP = rgb(0.059, 0.263, 0.212);
const GOLD = rgb(0.651, 0.486, 0.039);
const INK = rgb(0.063, 0.125, 0.11);
const MUTED = rgb(0.353, 0.427, 0.396);
const LINE = rgb(0.831, 0.875, 0.851);
const CARD = rgb(0.965, 0.98, 0.973);
const CREAM = rgb(1, 0.973, 0.906);
const WHITE = rgb(1, 1, 1);

type PdfUser = {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  emailVerified?: boolean;
  mustChangePassword?: boolean;
};

type PdfPayment = {
  amount: unknown;
  paymentDate: Date;
  paymentMethod: string | null;
  referenceNo: string | null;
  notes: string | null;
  receivedBy: string | null;
};

export type SchoolProfilePdfInput = {
  school: {
    name: string;
    code: string;
    district: string | null;
    taluka: string | null;
    city: string | null;
    pincode: string | null;
    address: string | null;
    phone: string | null;
    alternatePhone: string | null;
    email: string | null;
    website: string | null;
    principalName: string | null;
    schoolType: string | null;
    boardAffiliation: string | null;
    udiseCode: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  settings: {
    logoPath: string | null;
    schoolName: string | null;
    schoolAddress: string | null;
    schoolPhone: string | null;
    schoolEmail: string | null;
    academicYear: string | null;
    tagline: string | null;
    idCardWebsite: string | null;
  } | null;
  subscription: {
    planName: string;
    contractNumber: string | null;
    contractValue: unknown;
    contractStartDate: Date | null;
    contractEndDate: Date | null;
    contractNotes: string | null;
    contractDocumentPath: string | null;
    enabledFeatures: unknown;
    moduleFormats: unknown;
    paymentStatus: string;
    totalAmount: unknown;
    paidAmount: unknown;
    nextDueDate: Date | null;
  } | null;
  users: PdfUser[];
  payments: PdfPayment[];
  counts: {
    students: number;
    staff: number;
    classes: number;
    users: number;
  };
  loginUrl: string;
  generatedAt: Date;
  /** credentials = school details + login only (no contract). full = complete dossier. */
  variant: "credentials" | "full";
};

/** Helvetica is WinAnsi-only — strip characters that would crash PDF drawText. */
function pdfSafe(str: string): string {
  return String(str ?? "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019|\u201a/g, "'")
    .replace(/\u201c|\u201d|\u201e/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "?");
}

function dash(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  return s || "-";
}

function money(v: unknown): string {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return dash(String(v));
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function dmy(v: Date | string | null | undefined): string {
  if (!v) return "-";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return formatSchoolDate(d);
}

function titleCase(v: string | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    school_admin: "School Administrator",
    clerk: "Clerk",
    teacher: "Teacher",
    student: "Student",
    ca: "Chartered Accountant",
  };
  return map[role] || titleCase(role);
}

async function embedLogo(pdf: PDFDocument, logoPath: string | null): Promise<PDFImage | null> {
  if (!logoPath) return null;
  const rel =
    normalizeSchoolAssetPath(logoPath) ||
    logoPath.replace(/\\/g, "/").replace(/^uploads\//, "").replace(/^\/+/, "");
  const full = path.join(process.cwd(), "uploads", rel);
  if (!full.startsWith(path.join(process.cwd(), "uploads")) || !existsSync(full)) return null;
  try {
    const raw = await readFile(full);
    const png = await sharp(raw)
      .rotate()
      .resize(360, 360, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return pdf.embedPng(png);
  } catch {
    return null;
  }
}

class Writer {
  pdf: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page!: PDFPage;
  y = 0;
  pageNo = 0;
  sectionNo = 0;
  footerText: string;
  showPageNo: boolean;
  allowNewPage: boolean;

  constructor(
    pdf: PDFDocument,
    font: PDFFont,
    bold: PDFFont,
    opts?: { footerText?: string; showPageNo?: boolean; allowNewPage?: boolean },
  ) {
    this.pdf = pdf;
    this.font = font;
    this.bold = bold;
    this.footerText = opts?.footerText ?? "Codeat Education";
    this.showPageNo = opts?.showPageNo ?? false;
    this.allowNewPage = opts?.allowNewPage ?? true;
    this.newPage();
  }

  newPage() {
    this.pageNo += 1;
    this.page = this.pdf.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN;
    this.drawPageChrome();
  }

  ensure(h: number) {
    if (!this.allowNewPage) return;
    if (this.y - h < MARGIN + 28) this.newPage();
  }

  drawPageChrome() {
    this.page.drawRectangle({
      x: 0,
      y: PAGE.h - 8,
      width: PAGE.w,
      height: 8,
      color: BRAND,
    });
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE.w,
      height: 22,
      color: BRAND_DEEP,
    });
    if (this.footerText) {
      this.page.drawText(pdfSafe(this.footerText), {
        x: MARGIN,
        y: 8,
        size: 7,
        font: this.font,
        color: WHITE,
      });
    }
    if (this.showPageNo) {
      const label = `Page ${this.pageNo}`;
      const w = this.font.widthOfTextAtSize(label, 7);
      this.page.drawText(label, {
        x: PAGE.w - MARGIN - w,
        y: 8,
        size: 7,
        font: this.font,
        color: WHITE,
      });
    }
  }

  text(str: string, x: number, y: number, size: number, font: PDFFont, color: RGB) {
    const safe = pdfSafe(str);
    if (!safe) return;
    this.page.drawText(safe, { x, y, size, font, color });
  }

  wrap(str: string, maxWidth: number, size: number, font: PDFFont): string[] {
    const words = pdfSafe(String(str || "-")).replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : ["-"];
  }

  section(title: string) {
    this.sectionNo += 1;
    this.heading(`${this.sectionNo}. ${title}`);
  }

  heading(title: string) {
    this.ensure(28);
    this.y -= 6;
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 4,
      width: 4,
      height: 14,
      color: GOLD,
    });
    this.text(title.toUpperCase(), MARGIN + 12, this.y, 10, this.bold, BRAND);
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE.w - MARGIN, y: this.y },
      thickness: 0.6,
      color: LINE,
    });
    this.y -= 12;
  }

  kv(label: string, value: string, col = 0) {
    const colW = (PAGE.w - MARGIN * 2 - 12) / 2;
    const x = MARGIN + col * (colW + 12);
    const lines = this.wrap(value, colW - 4, 9, this.bold);
    const h = 12 + lines.length * 12;
    this.ensure(h);
    this.text(label, x, this.y, 7.5, this.font, MUTED);
    let ty = this.y - 12;
    for (const line of lines) {
      this.text(line, x, ty, 9, this.bold, INK);
      ty -= 12;
    }
    return h;
  }

  kvRow(left: [string, string], right?: [string, string]) {
    const hL = this.kv(left[0], left[1], 0);
    const hR = right ? this.kv(right[0], right[1], 1) : 0;
    this.y -= Math.max(hL, hR) + 4;
  }

  paragraph(str: string, size = 9) {
    const lines = this.wrap(str, PAGE.w - MARGIN * 2, size, this.font);
    this.ensure(lines.length * 12 + 4);
    for (const line of lines) {
      this.text(line, MARGIN, this.y, size, this.font, INK);
      this.y -= 12;
    }
    this.y -= 4;
  }

  /** Full-width labelled credential / detail table */
  detailTable(rows: [string, string][], opts?: { highlightLast?: boolean }) {
    const labelW = 148;
    const innerW = PAGE.w - MARGIN * 2;
    const valueW = innerW - labelW - 16;
    rows.forEach(([label, value], idx) => {
      const highlight = Boolean(opts?.highlightLast && idx === rows.length - 1);
      const lines = this.wrap(value, valueW, highlight ? 11 : 9, this.bold);
      const h = Math.max(highlight ? 22 : 18, 8 + lines.length * 12);
      this.ensure(h + 2);
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - h + 6,
        width: innerW,
        height: h,
        color: highlight ? CREAM : CARD,
      });
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - h + 6,
        width: labelW,
        height: h,
        color: highlight ? rgb(0.996, 0.922, 0.78) : rgb(0.925, 0.953, 0.941),
      });
      this.text(label, MARGIN + 8, this.y - 6, 7.5, this.bold, highlight ? rgb(0.48, 0.35, 0.05) : MUTED);
      let ty = this.y - 6;
      for (const line of lines) {
        this.text(line, MARGIN + labelW + 8, ty, highlight ? 11 : 9, this.bold, highlight ? rgb(0.48, 0.22, 0.04) : INK);
        ty -= 12;
      }
      this.y -= h;
    });
    this.y -= 8;
  }
}

export async function buildSchoolProfilePdf(input: SchoolProfilePdfInput): Promise<Uint8Array> {
  const isCreds = input.variant === "credentials";
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    isCreds
      ? `${input.school.name} - Login credentials`
      : `${input.school.name} - School profile`,
  );
  pdf.setAuthor("Codeat Education");
  pdf.setSubject(
    isCreds
      ? "School details and portal login credentials"
      : "Confidential school onboarding / credentials dossier",
  );
  pdf.setCreator("Codeat Education Super Admin");
  pdf.setProducer("Codeat Infotech");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf, input.settings?.logoPath ?? null);
  const w = new Writer(pdf, font, bold, {
    footerText: "Codeat Education",
    showPageNo: !isCreds,
    allowNewPage: !isCreds,
  });

  // Hero band
  const heroH = 118;
  w.page.drawRectangle({
    x: MARGIN - 8,
    y: w.y - heroH + 8,
    width: PAGE.w - MARGIN * 2 + 16,
    height: heroH,
    color: BRAND_DEEP,
  });
  w.page.drawRectangle({
    x: MARGIN - 8,
    y: w.y - heroH + 8,
    width: 6,
    height: heroH,
    color: GOLD,
  });

  const logoBox = 64;
  const logoX = MARGIN + 14;
  const logoY = w.y - 78;
  w.page.drawRectangle({
    x: logoX - 4,
    y: logoY - 4,
    width: logoBox + 8,
    height: logoBox + 8,
    color: WHITE,
  });
  if (logo) {
    const scale = Math.min(logoBox / logo.width, logoBox / logo.height);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    w.page.drawImage(logo, {
      x: logoX + (logoBox - lw) / 2,
      y: logoY + (logoBox - lh) / 2,
      width: lw,
      height: lh,
    });
  } else {
    w.text("CE", logoX + 16, logoY + 24, 18, bold, BRAND);
  }

  const textX = logoX + logoBox + 16;
  w.text("CODEAT EDUCATION", textX, w.y - 18, 8, bold, GOLD);
  const schoolTitle = dash(input.settings?.schoolName || input.school.name);
  const titleLines = w.wrap(schoolTitle, PAGE.w - textX - MARGIN - 16, 16, bold);
  let ty = w.y - 38;
  for (const line of titleLines.slice(0, 2)) {
    w.text(line, textX, ty, 16, bold, WHITE);
    ty -= 18;
  }
  w.text(`School code  ${input.school.code}`, textX, ty - 2, 10, bold, GOLD);
  w.text(
    `${input.school.isActive ? "ACTIVE" : "INACTIVE"}  ·  Generated ${dmy(input.generatedAt)}`,
    textX,
    ty - 16,
    8,
    font,
    rgb(0.85, 0.92, 0.89),
  );
  w.y -= heroH + 10;

  if (!isCreds) {
    w.page.drawRectangle({
      x: MARGIN,
      y: w.y - 18,
      width: PAGE.w - MARGIN * 2,
      height: 22,
      color: CREAM,
    });
    w.text(
      "CONFIDENTIAL - Password-protected dossier for school onboarding. Do not forward without authorisation.",
      MARGIN + 8,
      w.y - 12,
      7.5,
      font,
      rgb(0.48, 0.35, 0.05),
    );
    w.y -= 34;
  } else {
    w.y -= 6;
  }

  w.section("School identity");
  w.kvRow(["Registered name", dash(input.school.name)], ["Display name", dash(input.settings?.schoolName)]);
  w.kvRow(["School code (login)", input.school.code], ["UDISE code", dash(input.school.udiseCode)]);
  w.kvRow(["School type", dash(input.school.schoolType)], ["Board affiliation", dash(input.school.boardAffiliation)]);
  w.kvRow(["Principal", dash(input.school.principalName)], ["Academic year", dash(input.settings?.academicYear)]);
  w.kvRow(["Status", input.school.isActive ? "Active" : "Inactive"], ["Registered on", dmy(input.school.createdAt)]);
  if (!isCreds) {
    w.kvRow(["Last updated", dmy(input.school.updatedAt)], ["Logo on file", logo ? "Yes" : "Not uploaded"]);
    if (input.settings?.tagline) {
      w.kvRow(["Tagline", input.settings.tagline]);
    }
  }

  w.section("Address and contact");
  w.kvRow(["District", dash(input.school.district)], ["Taluka", dash(input.school.taluka)]);
  w.kvRow(["City / village", dash(input.school.city)], ["PIN code", dash(input.school.pincode)]);
  w.kvRow(["Address", dash(input.school.address || input.settings?.schoolAddress)]);
  w.kvRow(
    ["Phone", dash(input.school.phone || input.settings?.schoolPhone)],
    ["Alternate phone", dash(input.school.alternatePhone)],
  );
  w.kvRow(
    ["School email", dash(input.school.email || input.settings?.schoolEmail)],
    ["Website", dash(input.school.website || input.settings?.idCardWebsite)],
  );

  w.section("Portal login");
  const admins = input.users.filter((u) => u.role === "school_admin");
  const others = input.users.filter((u) => u.role !== "school_admin");

  if (!admins.length) {
    w.detailTable([
      ["Portal URL", input.loginUrl],
      ["School code", input.school.code],
      ["Administrator", "No school administrator account is linked yet"],
      ["Login email", "-"],
    ]);
  } else {
    for (const [i, u] of admins.entries()) {
      if (admins.length > 1) {
        w.paragraph(`School administrator ${i + 1}`, 8);
      }
      w.detailTable([
        ["Portal URL", input.loginUrl],
        ["School code", input.school.code],
        ["Administrator name", dash(u.name)],
        ["Login email", u.email],
        ["Role", roleLabel(u.role)],
        ["Account status", u.isActive ? "Active" : "Inactive"],
      ]);
    }
  }

  if (isCreds) {
    return pdf.save();
  }

  if (others.length) {
    w.section("Other portal accounts");
    for (const u of others) {
      w.detailTable([
        ["Name", dash(u.name)],
        ["Login email", u.email],
        ["Role", roleLabel(u.role)],
        ["Status", u.isActive ? "Active" : "Inactive"],
        ["Last login", dmy(u.lastLoginAt)],
      ]);
    }
  }

  w.section("Subscription and contract");
  const sub = input.subscription;
  const planKey = String(sub?.planName || "standard");
  const plan = PLAN_PRESETS[planKey];
  w.kvRow(["Plan", plan?.label || titleCase(planKey)], ["Payment status", titleCase(sub?.paymentStatus)]);
  w.kvRow(["Contract number", dash(sub?.contractNumber)], ["Contract value", money(sub?.contractValue)]);
  w.kvRow(["Contract start", dmy(sub?.contractStartDate)], ["Contract end", dmy(sub?.contractEndDate)]);
  w.kvRow(["Total amount", money(sub?.totalAmount)], ["Amount paid", money(sub?.paidAmount)]);
  w.kvRow(["Next due date", dmy(sub?.nextDueDate)], ["Price hint", dash(plan?.priceHint)]);
  w.kvRow(["Signed contract file", sub?.contractDocumentPath ? "Uploaded" : "Not uploaded"]);
  if (sub?.contractNotes?.trim()) {
    w.paragraph(`Notes: ${sub.contractNotes.trim()}`, 8);
  }

  if (input.payments.length) {
    w.section("Payment history");
    for (const p of input.payments) {
      w.kvRow(
        ["Date", dmy(p.paymentDate)],
        ["Amount", money(p.amount)],
      );
      w.kvRow(
        ["Method", titleCase(p.paymentMethod)],
        ["Reference", dash(p.referenceNo)],
      );
      if (p.receivedBy || p.notes) {
        w.kvRow(["Received by", dash(p.receivedBy)], ["Notes", dash(p.notes)]);
      }
    }
  }

  w.section("Platform usage");
  w.kvRow(["Students", String(input.counts.students)], ["Staff", String(input.counts.staff)]);
  w.kvRow(["Classes", String(input.counts.classes)], ["User accounts", String(input.counts.users)]);

  const features = normalizeFeatureList(sub?.enabledFeatures);
  w.section("Enabled modules");
  if (!features.length) {
    w.paragraph("No modules listed.");
  } else {
    const labels = features.map((k) => {
      const def = SCHOOL_FEATURES.find((f) => f.key === k);
      return def?.label || k;
    });
    const colW = (PAGE.w - MARGIN * 2 - 10) / 2;
    for (let i = 0; i < labels.length; i += 2) {
      w.ensure(14);
      w.text(`-  ${labels[i]}`, MARGIN, w.y, 8.5, font, INK);
      if (labels[i + 1]) w.text(`-  ${labels[i + 1]}`, MARGIN + colW + 10, w.y, 8.5, font, INK);
      w.y -= 13;
    }
    w.y -= 4;
  }

  const formats = normalizeModuleFormats(sub?.moduleFormats);
  w.section("Print and layout formats");
  for (const key of MODULE_FORMAT_KEYS) {
    const opts = MODULE_FORMAT_OPTIONS[key];
    const id = formats[key];
    const label = opts.find((o) => o.id === id)?.label || id;
    w.kvRow([titleCase(key), label]);
  }

  w.section("Support");
  w.kvRow(["Support email", "support.codeateducation@gmail.com"], ["Phone", "+91 8735995467"]);
  w.paragraph(
    "Office: 3rd floor, Anupam Amenity Centre, Near Bus Depot, Hari Ichchha Industrial Society, Udhna Udhyog Nagar, T-22, Surat, Gujarat 394610. Contact page: /contact",
    8,
  );

  return pdf.save();
}
