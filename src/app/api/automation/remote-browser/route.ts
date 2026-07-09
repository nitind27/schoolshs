import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getRemoteBrowserConfig } from "@/lib/remote-browser";

export async function GET() {
  try {
    await requireSchoolAuth();
    return NextResponse.json(getRemoteBrowserConfig());
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load remote browser config" }, { status: 500 });
  }
}
