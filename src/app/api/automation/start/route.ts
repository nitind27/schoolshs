import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import {
  DG_PORTALS,
  getDgPortalConfig,
  isSpecificScholarshipScheme,
} from "@/lib/dg-portal";
import { buildAutomationPreflight } from "@/lib/automation-preflight";
import { spawnAutomationWorker } from "@/lib/spawn-automation";

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
    const {
      studentId,
      studentIds,
      mode = "auto",
      actionMode = "auto",
    } = await request.json();

    const ids: string[] = studentIds?.length ? studentIds : studentId ? [studentId] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "studentId or studentIds required" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: ids }, schoolId: session.schoolId },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "No valid students found" }, { status: 404 });
    }
    if (students.length !== new Set(ids).size) {
      return NextResponse.json(
        { error: "Some selected students were not found in this school." },
        { status: 400 },
      );
    }

    const missingScheme = students.filter(
      (student) => !isSpecificScholarshipScheme(student.scholarshipScheme),
    );
    if (missingScheme.length) {
      return NextResponse.json(
        {
          error:
            "Scholarship scheme missing or generic. Select the exact scheme before Auto Apply.",
          students: missingScheme.map((student) => ({
            id: student.id,
            name: `${student.firstName} ${student.surname}`,
          })),
        },
        { status: 400 },
      );
    }

    const preflight = students.map(buildAutomationPreflight);
    const blocked = preflight.filter((student) => !student.ready);
    if (blocked.length) {
      return NextResponse.json(
        {
          error:
            "Some students have missing fields or Digital Gujarat documents. Review the preflight preview first.",
          preflight,
        },
        { status: 400 },
      );
    }

    const portalTypes = new Set(
      students.map(
        (student) => getDgPortalConfig(student.scholarshipScheme).type,
      ),
    );
    if (portalTypes.size !== 1) {
      return NextResponse.json(
        {
          error:
            "Selected students use different Digital Gujarat portals. Run Pre-Matric and Post-Matric students separately.",
          groups: students.reduce<Record<string, number>>((groups, student) => {
            const portal = getDgPortalConfig(student.scholarshipScheme).type;
            groups[portal] = (groups[portal] || 0) + 1;
            return groups;
          }, {}),
        },
        { status: 400 },
      );
    }
    const validPortal = [...portalTypes][0]!;

    const staleBefore = new Date(
      Date.now() -
        Math.max(
          1,
          Number(process.env.AUTOMATION_STALE_MINUTES || "20"),
        ) *
          60_000,
    );
    await prisma.automationJob.updateMany({
      where: {
        schoolId: session.schoolId,
        portalType: validPortal,
        status: { in: ["pending", "running"] },
        updatedAt: { lt: staleBefore },
      },
      data: {
        status: "failed",
        currentStep: "Stale worker replaced",
        errorMessage: "Stale automation job closed before a new run.",
        finishedAt: new Date(),
      },
    });
    const existingJob = await prisma.automationJob.findFirst({
      where: {
        schoolId: session.schoolId,
        portalType: validPortal,
        status: { in: ["pending", "running"] },
        updatedAt: { gte: staleBefore },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existingJob) {
      return NextResponse.json(
        {
          error:
            "An Auto Apply job is already using this portal. Open the running job or wait for it to finish.",
          jobId: existingJob.id,
        },
        { status: 409 },
      );
    }

    const settings = await prisma.schoolSettings.findUnique({
      where: { schoolId: session.schoolId },
      select: {
        dgSjedUsername: true,
        dgCitizenLoginId: true,
      },
    });
    const loginConfigured =
      validPortal === "sjed"
        ? Boolean(settings?.dgSjedUsername?.trim())
        : Boolean(settings?.dgCitizenLoginId?.trim());
    if (!loginConfigured) {
      return NextResponse.json(
        {
          error:
            validPortal === "sjed"
              ? "Save SJED login before starting this scholarship scheme."
              : "Save Citizen login before starting this scholarship scheme.",
          portalType: validPortal,
        },
        { status: 400 },
      );
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

    const child = spawnAutomationWorker(command, scriptArgs, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: process.cwd(),
      env: {
        ...process.env,
        AUTOMATION_JOB_ID: job.id,
        AUTOMATION_SCHOOL_ID: session.schoolId,
        AUTOMATION_PORTAL_TYPE: validPortal,
        NODE_ENV: process.env.NODE_ENV || "production",
      },
      windowsHide: process.platform === "win32",
    });

    child.on("error", (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      fs.appendFileSync(logFile, `\n[spawn error] ${msg}\n`);
      void prisma.automationJob
        .update({
          where: { id: job.id },
          data: {
            status: "failed",
            errorMessage: `Worker start failed: ${msg}`,
            currentStep: "Failed to start browser",
            finishedAt: new Date(),
          },
        })
        .catch(() => {});
    });

    if (!child.pid) {
      fs.appendFileSync(logFile, "\n[spawn error] No PID — browser worker did not start\n");
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: "Browser worker could not start. Check automation/logs on server.",
          currentStep: "Failed to start browser",
          finishedAt: new Date(),
        },
      });
      return NextResponse.json({ error: "Browser worker could not start" }, { status: 500 });
    }

    fs.appendFileSync(logFile, `[spawn] pid=${child.pid} cmd=${command}\n`);

    fs.closeSync(logFd);
    child.unref();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      count: validIds.length,
      portalUrl: DG_PORTALS[validPortal].loginUrl,
      portalLabel: DG_PORTALS[validPortal].label,
      message: "Auto Apply started — Digital Gujarat browser khul raha hai",
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
