import { NextRequest, NextResponse } from "next/server";
import { fetchSsgujaratById, detectSsgujaratSearchType } from "@/lib/ssgujarat/fetch";
import { mapSsgujaratToStudent, compactStudentPartial } from "@/lib/ssgujarat/map-to-student";
import { toSsgujaratFetchError } from "@/lib/ssgujarat/browser";
import { SSG_MSG } from "@/lib/ssgujarat/message-codes";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchId = String(body.searchId || body.aadhaarNumber || body.childUid || "").replace(/\s/g, "");

    if (!detectSsgujaratSearchType(searchId)) {
      return NextResponse.json({ error: SSG_MSG.INVALID_SEARCH_ID }, { status: 400 });
    }

    const result = await fetchSsgujaratById(searchId);
    const aadhaarForMap = result.searchType === "aadhaar" ? result.searchId : undefined;

    return NextResponse.json({
      ...result,
      mappedStudents: result.records.map((r) =>
        compactStudentPartial(mapSsgujaratToStudent(r, aadhaarForMap)),
      ),
    });
  } catch (error) {
    console.error("SSGujarat fetch error:", error);
    const message = toSsgujaratFetchError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
