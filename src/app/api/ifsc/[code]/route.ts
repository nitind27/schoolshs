import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

type IfscResponse = {
  BANK?: string;
  BRANCH?: string;
  ADDRESS?: string;
  CITY?: string;
  DISTRICT?: string;
  STATE?: string;
  IFSC?: string;
};

/** Lookup bank/branch from IFSC (Razorpay public IFSC API) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    await requireAuth([
      "super_admin",
      "school_admin",
      "clerk",
      "teacher",
      "ca",
    ]);
    const { code } = await params;
    const ifsc = String(code || "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return NextResponse.json({ error: "Invalid IFSC format" }, { status: 400 });
    }

    const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`, {
      next: { revalidate: 86400 },
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "IFSC not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "IFSC lookup failed" }, { status: 502 });
    }

    const data = (await res.json()) as IfscResponse;
    return NextResponse.json({
      ifsc: data.IFSC || ifsc,
      bankName: data.BANK || "",
      branchName: data.BRANCH || "",
      address: data.ADDRESS || "",
      city: data.CITY || "",
      district: data.DISTRICT || "",
      state: data.STATE || "",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "IFSC lookup failed" },
      { status: 500 },
    );
  }
}
