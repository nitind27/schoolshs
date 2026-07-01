import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ALL_CATEGORY_IDS,
  effectiveCategory,
  getCategoryMeta,
  normalizeCategory,
  type DgCategory,
} from "@/lib/category-inference";
import {
  addToGenderCounts,
  emptyGenderCounts,
  matchesGenderFilter,
  normalizeGender,
  type GenderCounts,
} from "@/lib/gender-utils";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

function buildGenderBreakdown(students: { gender: string; effectiveCategory: DgCategory }[]) {
  const overall = emptyGenderCounts();
  const byCategory: Record<DgCategory, GenderCounts> = Object.fromEntries(
    ALL_CATEGORY_IDS.map((id) => [id, emptyGenderCounts()])
  ) as Record<DgCategory, GenderCounts>;

  for (const s of students) {
    addToGenderCounts(overall, s.gender);
    addToGenderCounts(byCategory[s.effectiveCategory], s.gender);
  }

  return { overall, byCategory };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get("category");
    const genderFilter = searchParams.get("gender") || "all";
    const standardFilter = searchParams.get("standard");
    const sectionFilter = searchParams.get("section");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search");
    const listStudents = searchParams.get("list") === "true";

    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        caste: true,
        religion: true,
        category: true,
        gender: true,
        mobileNumber: true,
        standard: true,
        section: true,
        rollNumber: true,
        grNumber: true,
        status: true,
        scholarshipScheme: true,
        dateOfBirth: true,
        aadhaarNumber: true,
        institutionName: true,
      },
      orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }, { surname: "asc" }],
    });

    const enriched = students.map((s) => ({
      ...s,
      effectiveCategory: effectiveCategory(s),
      normalizedGender: normalizeGender(s.gender),
    }));

    const { overall, byCategory } = buildGenderBreakdown(enriched);

    const categoryBreakdown = ALL_CATEGORY_IDS.map((id) => ({
      ...getCategoryMeta(id),
      count: byCategory[id].total,
      percent: students.length > 0 ? Math.round((byCategory[id].total / students.length) * 100) : 0,
      gender: byCategory[id],
    }));

    if (listStudents) {
      let filtered = enriched;

      if (categoryFilter && categoryFilter.toLowerCase() !== "all") {
        const cat = normalizeCategory(categoryFilter);
        if (cat) filtered = filtered.filter((s) => s.effectiveCategory === cat);
      }

      filtered = filtered.filter((s) => matchesGenderFilter(s.gender, genderFilter));

      if (standardFilter) filtered = filtered.filter((s) => s.standard === standardFilter);
      if (sectionFilter) filtered = filtered.filter((s) => s.section === sectionFilter);
      if (statusFilter) filtered = filtered.filter((s) => s.status === statusFilter);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.firstName.toLowerCase().includes(q) ||
            s.surname.toLowerCase().includes(q) ||
            s.mobileNumber.includes(q) ||
            (s.rollNumber || "").includes(q) ||
            s.aadhaarNumber.includes(q)
        );
      }

      const catNorm =
        categoryFilter && categoryFilter.toLowerCase() !== "all"
          ? normalizeCategory(categoryFilter)
          : null;

      return NextResponse.json({
        category: catNorm || "ALL",
        gender: genderFilter,
        meta: catNorm ? getCategoryMeta(catNorm) : { label: "All Categories", id: "ALL" },
        students: filtered,
        total: filtered.length,
        genderSummary: catNorm ? byCategory[catNorm] : overall,
      });
    }

    return NextResponse.json({
      total: students.length,
      overallGender: overall,
      categoryBreakdown,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Failed to fetch category stats" }, { status: 500 });
  }
}
