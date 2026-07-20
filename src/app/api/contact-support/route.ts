import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function clean(s: unknown, max = 200) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = clean(body.phone, 30) || null;
    const schoolCode = clean(body.schoolCode, 40).toUpperCase() || null;
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 4000);

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }
    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: "Please enter a subject" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Please enter a message (at least 10 characters)" }, { status: 400 });
    }

    const row = await prisma.contactSupportMessage.create({
      data: { name, email, phone, schoolCode, subject, message, status: "new" },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("contact-support POST", e);
    return NextResponse.json({ error: "Could not send message. Try again." }, { status: 500 });
  }
}
