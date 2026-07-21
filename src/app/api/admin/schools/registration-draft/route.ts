import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s/g, "");
}

type DraftPayload = {
  form: Record<string, unknown>;
  codeManuallyEdited?: boolean;
};

function summaryFromRow(row: { code: string; step: number; payload: unknown; updatedAt: Date }) {
  const payload = row.payload as DraftPayload;
  const form = payload?.form && typeof payload.form === "object" ? payload.form : {};
  const name = String(form.name || "").trim();
  let fieldCount = 0;
  for (const [k, v] of Object.entries(form)) {
    if (k === "code" || k === "enabledFeatures") continue;
    if (typeof v === "string" && v.trim()) fieldCount += 1;
  }
  if (Array.isArray(form.enabledFeatures) && form.enabledFeatures.length > 0) fieldCount += 1;

  return {
    code: row.code,
    schoolName: name || "Unnamed school",
    savedAt: row.updatedAt.toISOString(),
    step: row.step,
    fieldCount,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const code = normalizeCode(request.nextUrl.searchParams.get("code") || "");

    if (!code) {
      const rows = await prisma.schoolRegistrationDraft.findMany({
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ drafts: rows.map(summaryFromRow) });
    }

    if (code.length < 3) {
      return NextResponse.json({ error: "School code too short" }, { status: 400 });
    }

    const row = await prisma.schoolRegistrationDraft.findUnique({ where: { code } });
    if (!row) return NextResponse.json({ draft: null });

    const payload = row.payload as DraftPayload;
    return NextResponse.json({
      draft: {
        code: row.code,
        step: row.step,
        form: payload?.form ?? {},
        codeManuallyEdited: Boolean(payload?.codeManuallyEdited),
        savedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("registration-draft GET", e);
    return NextResponse.json({ error: "Failed to load draft" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    const code = normalizeCode(String(body.code || body.form?.code || ""));
    if (code.length < 3) {
      return NextResponse.json({ error: "School code required (min 3 chars)" }, { status: 400 });
    }

    const previousCode = normalizeCode(String(body.previousCode || ""));
    const form =
      body.form && typeof body.form === "object" ? (body.form as Record<string, unknown>) : {};
    form.code = code;

    const step = Math.max(0, Number(body.step) || 0);
    const payload = {
      form,
      codeManuallyEdited: Boolean(body.codeManuallyEdited),
    } as Prisma.InputJsonValue;

    const row = await prisma.schoolRegistrationDraft.upsert({
      where: { code },
      create: { code, step, payload },
      update: { step, payload },
    });

    if (previousCode && previousCode !== code) {
      await prisma.schoolRegistrationDraft.deleteMany({ where: { code: previousCode } });
    }

    return NextResponse.json({
      ok: true,
      draft: {
        code: row.code,
        step: row.step,
        savedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("registration-draft PUT", e);
    const message = e instanceof Error ? e.message : "Failed to save draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const code = normalizeCode(request.nextUrl.searchParams.get("code") || "");
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    await prisma.schoolRegistrationDraft.deleteMany({ where: { code } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
