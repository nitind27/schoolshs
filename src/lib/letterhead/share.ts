import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import {
  isLetterheadDocumentState,
  type LetterheadDocumentState,
} from "@/lib/letterhead/defaults";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const HTML_FIELDS = [
  "headerTop",
  "schoolName",
  "leftTitle",
  "leftName",
  "leftMobile",
  "centerTitle",
  "centerAddress",
  "rightTitle",
  "rightName",
  "rightMobile",
  "footerLeft",
  "footerCenter",
  "footerRight",
  "serialNo",
  "dateDay",
  "dateMonth",
  "dateYear",
  "logo",
] as const;

export function isShareToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

export function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

function cleanHtml(value: unknown): string {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function plainText(value: unknown): string {
  return cleanHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep only the chosen pages and remap stamps onto the new page order. */
export function sliceSharedLetterhead(
  data: LetterheadDocumentState,
  pages: number[],
): { snapshot: LetterheadDocumentState; title: string } | null {
  const contents = Array.isArray(data.pageContents) ? data.pageContents : [];
  const total = Math.max(contents.length, Number(data.pageCount) || 0, 1);
  const indexes = [...new Set(pages.map((n) => Math.floor(Number(n))))]
    .filter((n) => Number.isFinite(n) && n >= 0 && n < total)
    .sort((a, b) => a - b)
    .slice(0, 40);
  if (!indexes.length) return null;

  const pageMap = new Map(indexes.map((oldIndex, next) => [oldIndex + 1, next + 1]));
  const stamps = Array.isArray(data.stamps)
    ? data.stamps.flatMap((stamp) => {
        if (!stamp || typeof stamp !== "object") return [];
        const row = stamp as { pageId?: string };
        const pageNo = Number(String(row.pageId || "").replace(/\D/g, ""));
        const next = pageMap.get(pageNo);
        if (!next) return [];
        return [{ ...row, pageId: `page-${next}` }];
      })
    : [];

  const snapshot: LetterheadDocumentState = {
    ...data,
    stampLibrary: undefined,
    pageContents: indexes.map((index) => cleanHtml(contents[index] || "")),
    pageCount: indexes.length,
    stamps,
  };
  for (const field of HTML_FIELDS) {
    if (snapshot[field] != null) {
      snapshot[field] = cleanHtml(snapshot[field]);
    }
  }

  const title = (plainText(snapshot.schoolName) || "Letterhead").slice(0, 140);
  return { snapshot, title };
}

export async function saveLetterheadShare(options: {
  schoolId: string;
  createdById?: string | null;
  data: LetterheadDocumentState;
  pages: number[];
}): Promise<{ token: string; title: string; pageCount: number } | null> {
  const sliced = sliceSharedLetterhead(options.data, options.pages);
  if (!sliced) return null;
  if (JSON.stringify(sliced.snapshot).length > 2_500_000) {
    throw new Error("too_large");
  }
  const token = newShareToken();
  await prisma.letterheadShare.create({
    data: {
      token,
      schoolId: options.schoolId,
      title: sliced.title,
      snapshot: sliced.snapshot as object,
      pageCount: sliced.snapshot.pageCount || 1,
      createdById: options.createdById || null,
    },
  });
  return {
    token,
    title: sliced.title,
    pageCount: sliced.snapshot.pageCount || 1,
  };
}

export async function saveChildLetterheadShare(parentToken: string, pages: number[]) {
  if (!isShareToken(parentToken)) return null;
  const parent = await prisma.letterheadShare.findUnique({
    where: { token: parentToken },
  });
  if (!parent || !isLetterheadDocumentState(parent.snapshot)) return null;
  return saveLetterheadShare({
    schoolId: parent.schoolId,
    data: parent.snapshot,
    pages,
  });
}

export function sharePageUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/letterhead/view/${encodeURIComponent(token)}`;
}
