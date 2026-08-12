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
import { normalizeSchoolAssetPath } from "@/lib/id-card-share";
import { formatSchoolDateTime } from "@/lib/school-timezone";

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 40;
const BRAND = rgb(0.102, 0.396, 0.314);
const BRAND_DEEP = rgb(0.059, 0.263, 0.212);
const GOLD = rgb(0.651, 0.486, 0.039);
const INK = rgb(0.063, 0.125, 0.11);
const MUTED = rgb(0.353, 0.427, 0.396);
const LINE = rgb(0.831, 0.875, 0.851);
const CARD = rgb(0.965, 0.98, 0.973);
const CREAM = rgb(1, 0.973, 0.906);
const WHITE = rgb(1, 1, 1);

export type MemberCredentialPdfRow = {
  name: string;
  email: string;
  password: string;
  role: string;
  roleLabel: string;
  designation: string | null;
  employeeId: string | null;
  mobileNumber: string | null;
  isActive: boolean;
  schoolName: string;
  schoolCode: string;
  schoolLogoPath: string | null;
  loginUrl: string;
};

export type MemberCredentialsPdfInput = {
  members: MemberCredentialPdfRow[];
  generatedAt: Date;
  /** Cover page for bulk export */
  title?: string;
};

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

class CardWriter {
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;

  constructor(page: PDFPage, font: PDFFont, bold: PDFFont) {
    this.page = page;
    this.font = font;
    this.bold = bold;
    this.y = PAGE.h - MARGIN;
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

  detailTable(rows: [string, string][], highlightLabel?: string) {
    const labelW = 148;
    const innerW = PAGE.w - MARGIN * 2;
    const valueW = innerW - labelW - 16;
    for (const [label, value] of rows) {
      const highlight = highlightLabel === label;
      const lines = this.wrap(value, valueW, highlight ? 12 : 9, this.bold);
      const h = Math.max(highlight ? 26 : 20, 8 + lines.length * 12);
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
      this.text(
        label,
        MARGIN + 8,
        this.y - 6,
        7.5,
        this.bold,
        highlight ? rgb(0.48, 0.35, 0.05) : MUTED,
      );
      let ty = this.y - 6;
      for (const line of lines) {
        this.text(
          line,
          MARGIN + labelW + 8,
          ty,
          highlight ? 12 : 9,
          this.bold,
          highlight ? rgb(0.48, 0.22, 0.04) : INK,
        );
        ty -= 12;
      }
      this.y -= h;
    }
    this.y -= 10;
  }
}

function drawPageChrome(page: PDFPage, font: PDFFont, pageNo?: number) {
  page.drawRectangle({ x: 0, y: PAGE.h - 8, width: PAGE.w, height: 8, color: BRAND });
  page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: 22, color: BRAND_DEEP });
  page.drawText(pdfSafe("Codeat Education"), {
    x: MARGIN,
    y: 8,
    size: 7,
    font,
    color: WHITE,
  });
  if (pageNo != null) {
    const label = `Page ${pageNo}`;
    const w = font.widthOfTextAtSize(label, 7);
    page.drawText(label, {
      x: PAGE.w - MARGIN - w,
      y: 8,
      size: 7,
      font,
      color: WHITE,
    });
  }
}

async function drawCredentialCard(
  pdf: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  member: MemberCredentialPdfRow,
  generatedAt: Date,
  pageNo?: number,
) {
  drawPageChrome(page, font, pageNo);
  const logo = await embedLogo(pdf, member.schoolLogoPath);
  const w = new CardWriter(page, font, bold);

  const heroH = 108;
  page.drawRectangle({
    x: MARGIN - 6,
    y: w.y - heroH + 8,
    width: PAGE.w - MARGIN * 2 + 12,
    height: heroH,
    color: BRAND_DEEP,
  });
  page.drawRectangle({
    x: MARGIN - 6,
    y: w.y - heroH + 8,
    width: 5,
    height: heroH,
    color: GOLD,
  });

  const logoBox = 56;
  const logoX = MARGIN + 12;
  const logoY = w.y - 72;
  page.drawRectangle({
    x: logoX - 3,
    y: logoY - 3,
    width: logoBox + 6,
    height: logoBox + 6,
    color: WHITE,
  });
  if (logo) {
    const scale = Math.min(logoBox / logo.width, logoBox / logo.height);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    page.drawImage(logo, {
      x: logoX + (logoBox - lw) / 2,
      y: logoY + (logoBox - lh) / 2,
      width: lw,
      height: lh,
    });
  } else {
    w.text("CE", logoX + 14, logoY + 20, 16, bold, BRAND);
  }

  const textX = logoX + logoBox + 14;
  w.text("CODEAT EDUCATION", textX, w.y - 16, 7.5, bold, GOLD);
  w.text("Portal Login Credentials", textX, w.y - 30, 11, bold, WHITE);
  const schoolLines = w.wrap(member.schoolName, PAGE.w - textX - MARGIN - 12, 13, bold);
  let ty = w.y - 48;
  for (const line of schoolLines.slice(0, 2)) {
    w.text(line, textX, ty, 13, bold, WHITE);
    ty -= 15;
  }
  w.text(`School code  ${member.schoolCode}`, textX, ty, 9, bold, GOLD);
  w.y -= heroH + 14;

  page.drawRectangle({
    x: MARGIN,
    y: w.y - 20,
    width: PAGE.w - MARGIN * 2,
    height: 24,
    color: CREAM,
  });
  w.text(
    "CONFIDENTIAL - Keep this document private. Do not share your password.",
    MARGIN + 8,
    w.y - 14,
    7.5,
    font,
    rgb(0.48, 0.35, 0.05),
  );
  w.y -= 34;

  w.text("Member", MARGIN, w.y, 7.5, font, MUTED);
  const nameLines = w.wrap(member.name, PAGE.w - MARGIN * 2, 18, bold);
  let ny = w.y - 16;
  for (const line of nameLines.slice(0, 2)) {
    w.text(line, MARGIN, ny, 18, bold, INK);
    ny -= 20;
  }
  w.y = ny - 6;

  if (member.designation) {
    w.text(dash(member.designation), MARGIN, w.y, 10, font, MUTED);
    w.y -= 16;
  }

  page.drawLine({
    start: { x: MARGIN, y: w.y },
    end: { x: PAGE.w - MARGIN, y: w.y },
    thickness: 0.6,
    color: LINE,
  });
  w.y -= 14;

  const rows: [string, string][] = [
    ["Portal URL", member.loginUrl],
    ["School code", member.schoolCode],
    ["Member name", member.name],
    ["Designation", dash(member.designation)],
    ["Employee ID", dash(member.employeeId)],
    ["Login email", member.email],
    ["Portal role", member.roleLabel],
    ["Account status", member.isActive ? "Active" : "Inactive"],
    ["Password", member.password],
    ["Generated on", formatSchoolDateTime(generatedAt)],
  ];
  if (member.mobileNumber) {
    rows.splice(5, 0, ["Mobile", member.mobileNumber]);
  }
  w.detailTable(rows, "Password");

  w.text(
    "Sign in at the portal URL using your login email and password above.",
    MARGIN,
    w.y,
    8.5,
    font,
    MUTED,
  );
  w.y -= 14;
  w.text(
    "Support: support.codeateducation@gmail.com  |  +91 8735995467",
    MARGIN,
    w.y,
    7.5,
    font,
    MUTED,
  );
}

async function drawCoverPage(
  pdf: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  input: MemberCredentialsPdfInput,
) {
  drawPageChrome(page, font, 1);
  const w = new CardWriter(page, font, bold);
  const heroH = 140;
  page.drawRectangle({
    x: MARGIN - 6,
    y: w.y - heroH + 8,
    width: PAGE.w - MARGIN * 2 + 12,
    height: heroH,
    color: BRAND_DEEP,
  });
  page.drawRectangle({
    x: MARGIN - 6,
    y: w.y - heroH + 8,
    width: 5,
    height: heroH,
    color: GOLD,
  });
  w.text("CODEAT EDUCATION", MARGIN + 16, w.y - 28, 9, bold, GOLD);
  w.text("Portal Credentials Pack", MARGIN + 16, w.y - 52, 20, bold, WHITE);
  w.text(
    dash(input.title || "School members with stored passwords"),
    MARGIN + 16,
    w.y - 78,
    11,
    font,
    rgb(0.85, 0.92, 0.89),
  );
  w.text(`${input.members.length} credential sheet(s)`, MARGIN + 16, w.y - 98, 10, bold, GOLD);
  w.y -= heroH + 24;

  w.text("Contents", MARGIN, w.y, 10, bold, BRAND);
  w.y -= 16;
  for (const [i, m] of input.members.entries()) {
    if (w.y < MARGIN + 80) break;
    w.text(`${i + 1}. ${m.name}`, MARGIN + 8, w.y, 9, font, INK);
    w.text(`${m.schoolCode}  ·  ${m.email}`, MARGIN + 20, w.y - 12, 7.5, font, MUTED);
    w.y -= 28;
  }

  w.y = MARGIN + 60;
  w.text(`Generated ${formatSchoolDateTime(input.generatedAt)}`, MARGIN, w.y, 8, font, MUTED);
  w.text(
    "Each following page contains one member's login credentials.",
    MARGIN,
    w.y - 14,
    8,
    font,
    MUTED,
  );
}

export async function buildMemberCredentialsPdf(
  input: MemberCredentialsPdfInput,
): Promise<Uint8Array> {
  if (!input.members.length) {
    throw new Error("No members with stored credentials to export");
  }

  const pdf = await PDFDocument.create();
  const isBulk = input.members.length > 1;
  pdf.setTitle(
    isBulk
      ? `Portal credentials - ${input.members.length} members`
      : `${input.members[0]!.name} - Portal credentials`,
  );
  pdf.setAuthor("Codeat Education");
  pdf.setSubject("Portal login credentials");
  pdf.setCreator("Codeat Education Super Admin");
  pdf.setProducer("Codeat Infotech");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const generatedAt = input.generatedAt;

  if (isBulk) {
    const cover = pdf.addPage([PAGE.w, PAGE.h]);
    await drawCoverPage(pdf, cover, font, bold, input);
  }

  for (const [idx, member] of input.members.entries()) {
    const page = pdf.addPage([PAGE.w, PAGE.h]);
    await drawCredentialCard(
      pdf,
      page,
      font,
      bold,
      member,
      generatedAt,
      isBulk ? idx + 2 : 1,
    );
  }

  return pdf.save();
}
