import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  editLinkPasswordMatches,
  readStoredFields,
  signEditLinkToken,
} from "@/lib/student-edit-link";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = String(body.code || "").trim().toUpperCase();
    const password = String(body.password || "").trim();
    if (!code || !password) {
      return NextResponse.json({ error: "ID and password are required" }, { status: 400 });
    }

    const link = await prisma.studentEditLink.findUnique({
      where: { code },
      include: {
        schoolClass: { select: { name: true, standard: true, section: true } },
      },
    });
    if (!link || !link.isActive) {
      return NextResponse.json({ error: "This link is closed or the ID is wrong" }, { status: 401 });
    }
    if (!editLinkPasswordMatches(link.passwordEnc, password)) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    await prisma.studentEditLink.update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      token: signEditLinkToken(link.id),
      className: link.schoolClass.name,
      standard: link.schoolClass.standard,
      section: link.schoolClass.section,
      fields: readStoredFields(link.fieldsJson),
    });
  } catch (error) {
    console.error("[student-edit-link auth]", error);
    return NextResponse.json({ error: "Could not open the link" }, { status: 500 });
  }
}
