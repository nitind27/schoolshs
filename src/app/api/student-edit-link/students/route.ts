import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrolledStudentStatusFilter } from "@/lib/student-list-filters";
import { sortStudentsBySavedRoll } from "@/lib/roll-order";
import { EDIT_LINK_FIELDS, readEditLinkToken, readStoredFields, type EditLinkField } from "@/lib/student-edit-link";
import { mergeReligionNames } from "@/lib/school-religions";

function bearer(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function openLink(request: NextRequest) {
  const parsed = readEditLinkToken(bearer(request));
  if (!parsed) return null;
  const link = await prisma.studentEditLink.findFirst({
    where: { id: parsed.linkId, isActive: true },
    include: {
      schoolClass: { select: { id: true, name: true, standard: true, section: true } },
    },
  });
  return link;
}

export async function GET(request: NextRequest) {
  try {
    const link = await openLink(request);
    if (!link) return NextResponse.json({ error: "Open the link again" }, { status: 401 });

    const fields = readStoredFields(link.fieldsJson);
    const students = sortStudentsBySavedRoll(
      await prisma.student.findMany({
        where: {
          schoolId: link.schoolId,
          classId: link.classId,
          status: enrolledStudentStatusFilter(),
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          surname: true,
          firstNameGu: true,
          middleNameGu: true,
          surnameGu: true,
          fatherName: true,
          fatherNameGu: true,
          motherName: true,
          motherNameGu: true,
          guardianName: true,
          category: true,
          caste: true,
          religion: true,
          gender: true,
          dateOfBirth: true,
          mobileNumber: true,
          email: true,
          bloodGroup: true,
          rollNumber: true,
          grNumber: true,
          aadhaarNumber: true,
          childUid: true,
          apaarId: true,
          penNumber: true,
          currentAddress: true,
          currentCity: true,
          currentDistrict: true,
          currentPincode: true,
          permanentAddress: true,
          permanentCity: true,
          permanentDistrict: true,
          permanentPincode: true,
        },
      }),
    );

    const customReligions = await prisma.schoolReligion.findMany({
      where: { schoolId: link.schoolId },
      select: { name: true },
    });
    const used = students.map((student) => student.religion).filter(Boolean);
    const religions = mergeReligionNames(
      customReligions.map((row) => row.name),
      used,
    );

    const rows = students.map((student) => {
      const values: Partial<Record<EditLinkField, string>> = {};
      for (const field of fields) {
        const value = student[field];
        values[field] = value == null ? "" : String(value);
      }
      return {
        id: student.id,
        rollNumber: student.rollNumber || "",
        name: [student.firstName, student.middleName, student.surname].filter(Boolean).join(" "),
        grNumber: student.grNumber || "",
        values,
      };
    });

    return NextResponse.json({
      className: link.schoolClass.name,
      standard: link.schoolClass.standard,
      section: link.schoolClass.section,
      fields,
      fieldOrder: EDIT_LINK_FIELDS.filter((field) => fields.includes(field)),
      religions,
      students: rows,
    });
  } catch (error) {
    console.error("[student-edit-link students]", error);
    return NextResponse.json({ error: "Could not load students" }, { status: 500 });
  }
}
