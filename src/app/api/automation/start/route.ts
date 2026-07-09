import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";

function assertPlaywrightReady(): void {
  try {
    const execPath = chromium.executablePath();
    if (!fs.existsSync(execPath)) {
      throw new Error("Chromium browser missing on server. Run: npm run playwright:setup");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      msg.includes("Chromium") || msg.includes("missing")
        ? msg
        : "Playwright not ready. VPS par SSH se chalao: npm run playwright:setup"
    );
  }
}

function getTsxRunner(): { command: string; args: string[] } {
  const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  if (fs.existsSync(tsxCli)) {
    return { command: process.execPath, args: [tsxCli] };
  }
  const tsxBin = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsx.cmd" : "tsx"
  );
  if (fs.existsSync(tsxBin)) {
    return { command: tsxBin, args: [] };
  }
  throw new Error(
    "tsx runner not found. Install production dependencies correctly (npm install) so automation worker can start."
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { studentId, studentIds, mode = "auto", actionMode = "auto", portalType = "sjed" } = await request.json();

    const validPortal = portalType === "citizen" ? "citizen" : "sjed";

    const ids: string[] = studentIds?.length ? studentIds : studentId ? [studentId] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "studentId or studentIds required" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: ids }, schoolId: session.schoolId },
      select: { id: true, firstName: true, surname: true, aadhaarNumber: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "No valid students found" }, { status: 404 });
    }

    assertPlaywrightReady();

    const validIds = students.map((s) => s.id);

    const initialProgress = students.map((s) => ({
      studentId: s.id,
      name: `${s.firstName} ${s.surname}`,
      aadhaarNumber: s.aadhaarNumber,
      status: "pending",
      dgAction: "unknown",
      step: "Queued",
      percent: 0,
    }));

    const job = await prisma.automationJob.create({
      data: {
        school: { connect: { id: session.schoolId } },
        status: "pending",
        mode,
        actionMode,
        portalType: validPortal,
        studentIds: JSON.stringify(validIds),
        totalCount: validIds.length,
        studentProgress: JSON.stringify(initialProgress),
        logs: "Job created — starting browser...\n",
      },
    });

    const scriptPath = path.join(process.cwd(), "automation", "run.ts");
    const { command, args: runnerArgs } = getTsxRunner();

    const scriptArgs =
      validIds.length === 1
        ? [...runnerArgs, scriptPath, validIds[0], mode]
        : [...runnerArgs, scriptPath, "batch", validIds.join(","), mode];

    const logsDir = path.join(process.cwd(), "automation", "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    const logFile = path.join(logsDir, `${job.id}.log`);
    const logFd = fs.openSync(logFile, "a");

    const child = spawn(command, scriptArgs, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: process.cwd(),
      env: {
        ...process.env,
        AUTOMATION_JOB_ID: job.id,
        AUTOMATION_SCHOOL_ID: session.schoolId,
        AUTOMATION_PORTAL_TYPE: validPortal,
      },
      windowsHide: true,
    });

    fs.closeSync(logFd);
    child.unref();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      count: validIds.length,
      message: "Auto Apply started — live status dashboard par dekhein",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Automation start error:", error);
    const message = error instanceof Error ? error.message : "Failed to start automation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
