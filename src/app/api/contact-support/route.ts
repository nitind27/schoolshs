import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateContactForm } from "@/lib/contact-support";
import { validateLeadForm } from "@/lib/landing-lead";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = body.source === "landing_modal" ? "landing_modal" : "contact_form";

    if (source === "landing_modal") {
      const result = validateLeadForm({
        name: body.name,
        email: body.email,
        phone: body.phone,
        instituteName: body.instituteName,
        roleType: body.roleType,
      });

      if (!result.ok) {
        const firstField = (Object.keys(result.errors)[0] || "name") as keyof typeof result.errors;
        return NextResponse.json(
          {
            error: result.errors[firstField],
            field: firstField,
            code: result.codes[firstField],
            errors: result.errors,
            codes: result.codes,
          },
          { status: 400 }
        );
      }

      const { name, email, phone, instituteName, roleType } = result.data;

      const row = await prisma.contactSupportMessage.create({
        data: {
          name,
          email,
          phone,
          instituteName,
          roleType,
          schoolCode: null,
          subject: "Expert consultation — landing popup",
          message: `Role: ${roleType}\nInstitute: ${instituteName}\nSubmitted from homepage expert popup.`,
          source: "landing_modal",
          status: "new",
        },
      });

      return NextResponse.json({ ok: true, id: row.id });
    }

    const result = validateContactForm({
      name: body.name,
      email: body.email,
      phone: body.phone,
      schoolCode: body.schoolCode,
      subject: body.subject,
      message: body.message,
    });

    if (!result.ok) {
      const firstField = (Object.keys(result.errors)[0] || "message") as keyof typeof result.errors;
      return NextResponse.json(
        {
          error: result.errors[firstField],
          field: firstField,
          code: result.codes[firstField],
          errors: result.errors,
          codes: result.codes,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, schoolCode, subject, message } = result.data;

    const row = await prisma.contactSupportMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        schoolCode: schoolCode || null,
        subject,
        message,
        source: "contact_form",
        status: "new",
      },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("contact-support POST", e);
    return NextResponse.json({ error: "Could not send message. Try again." }, { status: 500 });
  }
}
