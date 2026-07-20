import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { lookupIndianPincode } from "@/lib/pincode-lookup";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> },
) {
  try {
    await requireAuth(["super_admin"]);
    const { pincode } = await params;
    const result = await lookupIndianPincode(pincode);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Pincode lookup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
