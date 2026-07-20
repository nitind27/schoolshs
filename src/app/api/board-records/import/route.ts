import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseSeatInput } from "@/lib/gseb/fetch-ssc-result";

interface ImportRow {
  section: string;
  roll: string;
  firstName: string;
  surname: string;
  seat: string;
  percentage: number;
  year?: string;
  grNumber?: string;
  gender?: string;
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h.includes(name));

  const iSection = idx("section") >= 0 ? idx("section") : idx("division");
  const iRoll = idx("roll");
  const iFirst = idx("first") >= 0 ? idx("first") : idx("name");
  const iSurname = idx("surname");
  const iSeat = idx("seat") >= 0 ? idx("seat") : idx("gseb");
  const iPct = idx("percent") >= 0 ? idx("percent") : idx("pct");
  const iYear = idx("year");
  const iGr = idx("gr");
  const iGender = idx("gender");

  const rows: ImportRow[] = [];
  for (let l = 1; l < lines.length; l++) {
    const cols = lines[l].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 4) continue;
    const seat = cols[iSeat] || cols[iGr] || "";
    const pct = parseFloat(cols[iPct]);
    if (!seat || !Number.isFinite(pct)) continue;
    rows.push({
      section: (cols[iSection] || "A").toUpperCase(),
      roll: cols[iRoll] || String(l),
      firstName: cols[iFirst] || "STUDENT",
      surname: cols[iSurname] || String(l),
      seat,
      percentage: pct,
      year: cols[iYear] || "2025",
      grNumber: cols[iGr] || undefined,
      gender: cols[iGender] || "Male",
    });
  }
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const csv = String(body.csv || "");
    const academicYear = String(body.academicYear || "2025-26");

    const rows = parseCsv(csv);
    if (!rows.length) {
      return NextResponse.json({ error: "No valid rows — CSV needs: section,roll,firstName,surname,seat,percentage" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: session.schoolId } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const seat = parseSeatInput(row.seat) || parseSeatInput(row.grNumber || "");
      const section = row.section.replace(/DIV(ISION)?\s*/i, "").toUpperCase() || "A";

      const cls = await prisma.schoolClass.upsert({
        where: {
          schoolId_standard_section_stream_academicYear: {
            schoolId: school.id,
            standard: "10",
            section,
            stream: "",
            academicYear,
          },
        },
        create: {
          schoolId: school.id,
          name: `Class 10-${section}`,
          standard: "10",
          section,
          stream: "",
          academicYear,
          institutionName: school.name,
          institutionDistrict: school.district || "Tapi",
        },
        update: {},
      });

      const aadhaar = `99${row.seat.replace(/\D/g, "").padStart(10, "0").slice(0, 10)}`;
      const fullName = `${row.firstName} ${row.surname}`;

      const data = {
        schoolId: school.id,
        classId: cls.id,
        standard: "10",
        section,
        rollNumber: row.roll,
        grNumber: row.grNumber || row.seat.replace(/[ABSCP]/gi, ""),
        sscSeatPrefix: seat?.prefix || "A",
        sscSeatNumber: seat?.number || row.seat.replace(/\D/g, "").slice(-7),
        firstName: row.firstName.toUpperCase(),
        surname: row.surname.toUpperCase(),
        aadhaarName: fullName.toUpperCase(),
        aadhaarNumber: aadhaar,
        gender: row.gender || "Male",
        percentage10th: row.percentage,
        year10th: row.year || "2025",
        board10th: "GSEB",
        dateOfBirth: "01/07/2010",
        mobileNumber: "9876543210",
        motherName: "MOTHER",
        fatherName: "FATHER",
        category: "Open",
        religion: "Hindu",
        parentOccupation: "Farmer",
        annualFamilyIncome: 80000,
        currentAddress: school.address || "Gujarat",
        currentDistrict: school.district || "Tapi",
        currentCity: "Songadh",
        currentPincode: "394670",
        permanentAddress: school.address || "Gujarat",
        permanentDistrict: school.district || "Tapi",
        permanentCity: "Songadh",
        permanentPincode: "394670",
        scholarshipScheme: "Post Matric Scholarship - SC",
        financialYear: academicYear,
        courseType: "Secondary",
        courseName: "Class 10 (SSC)",
        institutionDistrict: school.district || "Tapi",
        institutionName: school.name,
        currentYear: "1st Year",
        bankName: "BANK OF BARODA",
        branchName: "SONGADH",
        accountNumber: `02670100${aadhaar.slice(-6)}`,
        ifscCode: "BARB0FORTSO",
        accountHolderName: fullName.toUpperCase(),
        status: "ready",
        admissionStatus: "verified",
      };

      const existing = await prisma.student.findUnique({
        where: { schoolId_aadhaarNumber: { schoolId: school.id, aadhaarNumber: aadhaar } },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            classId: cls.id,
            standard: "10",
            section,
            rollNumber: row.roll,
            grNumber: data.grNumber,
            sscSeatPrefix: data.sscSeatPrefix,
            sscSeatNumber: data.sscSeatNumber,
            percentage10th: row.percentage,
            year10th: data.year10th,
            board10th: "GSEB",
          },
        });
        updated++;
      } else {
        await prisma.student.create({ data });
        created++;
      }
    }

    return NextResponse.json({ created, updated, total: rows.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
