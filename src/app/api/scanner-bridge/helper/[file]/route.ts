import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { projectPath } from "@/lib/project-path";

const ALLOWED = new Set([
  "client-helper.ps1",
  "list-devices.ps1",
  "scan.ps1",
  "install.ps1",
  "install.bat",
]);

const TYPES: Record<string, string> = {
  ".ps1": "text/plain; charset=utf-8",
  ".bat": "application/octet-stream",
};

export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!ALLOWED.has(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body = await readFile(projectPath("scanner-bridge", file), "utf8");
  const origin = request.nextUrl.origin.replace(/"/g, "");
  if (file === "install.ps1") {
    body = body.replace(/\[string\]\$PortalUrl\s*=\s*""/, `[string]$PortalUrl = "${origin}"`);
  }
  if (file === "install.bat") {
    body = `@echo off\r\ncd /d "%~dp0"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -PortalUrl "${origin}"\r\nif errorlevel 1 pause\r\n`;
  }

  const ext = file.slice(file.lastIndexOf("."));
  return new NextResponse(body, {
    headers: {
      "Content-Type": TYPES[ext] || "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
