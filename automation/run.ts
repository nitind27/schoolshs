import { loadEnv } from "../src/lib/load-env";
import { chromium, type BrowserContext, type Page } from "playwright";
import fs from "fs";
import { buildFieldMappings, DG_DROPDOWN_MAPPINGS } from "./selectors";
import { getDgPortalByType, parsePortalType, type DgPortalConfig } from "../src/lib/dg-portal";
import {
  ensureDgLoggedIn,
  getProfileDirForSchool,
  revalidateSessionIfNeeded,
} from "./dg-login";
import {
  fillTextFields,
  fillDropdowns,
  fillRadioAndCheckboxes,
  uploadDocuments,
  waitForUserAction,
  type LogFn,
} from "./form-filler";
import {
  navigateToStudentForm,
  autoFillAllPages,
  autoClickSubmit,
  scrapePortalStatus,
  type ApplyActionMode,
} from "./portal-navigator";
import { JobReporter, buildInitialProgress, type StudentProgressItem } from "./status-reporter";
import { isAutomationHeadless, VPS_LOGIN_HELP } from "./headless";
import { prisma } from "../src/lib/db";

loadEnv();

const jobId = process.env.AUTOMATION_JOB_ID || "";
const schoolId = process.env.AUTOMATION_SCHOOL_ID || "";
const envPortalType = process.env.AUTOMATION_PORTAL_TYPE || "";
const arg1 = process.argv[2];
const arg2 = process.argv[3] || "auto";

const isBatch = arg1 === "batch";
const studentIds = isBatch
  ? (arg2 || "").split(",").map((s) => s.trim()).filter(Boolean)
  : arg1
    ? [arg1]
    : [];
const mode = isBatch ? (process.argv[4] || "auto") : arg2;

if (studentIds.length === 0) {
  console.error("Usage: npx tsx automation/run.ts <studentId> [auto|full|fill-only]");
  console.error("       npx tsx automation/run.ts batch <id1,id2> [auto|full|fill-only]");
  process.exit(1);
}

let reporter: JobReporter | null = null;

const log: LogFn = (msg) => {
  const line = `[${new Date().toLocaleTimeString("en-IN")}] ${msg}`;
  console.log(line);
  if (reporter) void reporter.appendLog(msg);
};

async function fillCurrentPage(page: Page, student: Record<string, unknown>) {
  log("Auto-filling form...");
  const mappings = buildFieldMappings(student);
  const textFilled = await fillTextFields(page, mappings, log);
  const dropdownFilled = await fillDropdowns(page, student, DG_DROPDOWN_MAPPINGS, log);
  await fillRadioAndCheckboxes(page, student, log);

  const docs = [
    { label: "photo", path: String(student.photoPath || "") },
    { label: "aadhaar", path: String(student.aadhaarDocPath || "") },
    { label: "income", path: String(student.incomeCertPath || "") },
    { label: "caste", path: String(student.casteCertPath || "") },
    { label: "10th", path: String(student.marksheet10Path || "") },
    { label: "12th", path: String(student.marksheet12Path || "") },
    { label: "bank", path: String(student.bankPassbookPath || "") },
    { label: "fee", path: String(student.feeReceiptPath || "") },
  ];
  const uploaded = await uploadDocuments(page, docs, log);
  log(`Filled ${textFilled} text, ${dropdownFilled} dropdowns, ${uploaded} docs`);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function runStudentFlow(
  page: Page,
  studentId: string,
  index: number,
  total: number,
  actionMode: ApplyActionMode,
  profileDir: string,
  portal: DgPortalConfig
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error(`Student not found: ${studentId}`);

  const name = `${student.firstName} ${student.surname}`;
  log(`\n━━━ [${index + 1}/${total}] ${name} ━━━`);

  if (reporter) {
    reporter.updateStudent(studentId, { status: "running", step: "Opening DG portal", percent: 10 });
    await reporter.setRunning(index, `Processing ${name}`);
  }

  await revalidateSessionIfNeeded(
    page,
    prisma,
    schoolId || student.schoolId,
    student as unknown as Record<string, unknown>,
    log,
    profileDir,
    portal,
    jobId,
    reporter
  );

  if (mode !== "fill-only") {
    const nav = await navigateToStudentForm(
      page,
      student as unknown as Record<string, unknown>,
      actionMode,
      log,
      portal,
      profileDir
    );

    if (reporter) {
      reporter.updateStudent(studentId, {
        dgAction: nav.action === "manual" ? "unknown" : nav.action,
        dgPortalStatus: nav.portalStatus,
        step: nav.action === "new_apply" ? "New Apply opened" : nav.action === "edit" ? "Edit opened" : "Manual navigation",
        percent: 25,
      });
      await reporter.flush();
    }

    if (nav.action === "manual") {
      await waitForUserAction(
        page,
        `${name} ka form manually kholein (New Apply ya Edit), phir Continue dabayein`,
        log,
        300000,
        { stepLabel: `${name} — Form kholein` }
      );
    }
  }

  if (reporter) {
    reporter.updateStudent(studentId, { step: "Auto-filling all pages", percent: 40 });
    await reporter.flush();
  }

  const fillFn = () => fillCurrentPage(page, student as unknown as Record<string, unknown>);
  await fillFn();

  const pagesDone = await autoFillAllPages(page, fillFn, log, 8);

  if (pagesDone < 2) {
    await waitForUserAction(
      page,
      `Verify karein → NEXT/SUBMIT portal pe dabayein → phir Continue`,
      log,
      600000,
      { stepLabel: `${name} — Verify & Submit` }
    );
    await autoClickSubmit(page, log);
  }

  const finalPortalStatus = await scrapePortalStatus(page);
  const submitted = finalPortalStatus?.toLowerCase().includes("submit") || pagesDone >= 2;

  await prisma.student.update({
    where: { id: studentId },
    data: {
      status: submitted ? "submitted" : "ready",
      submissionDate: submitted ? new Date() : undefined,
      lastAutomationAt: new Date(),
      lastAutomationLog: `[Auto Apply] ${name} — ${submitted ? "submitted" : "filled"} | ${pagesDone} pages | DG: ${finalPortalStatus || "—"}`,
    },
  });

  if (reporter) {
    reporter.updateStudent(studentId, {
      status: submitted ? "submitted" : "filled",
      dgPortalStatus: finalPortalStatus || (submitted ? "submitted" : "filled"),
      step: submitted ? "Submitted on DG" : "Form filled — verify submit",
      percent: 100,
      message: `${pagesDone} pages auto-processed`,
    });
    await reporter.flush();
  }

  log(`✅ ${name} — ${submitted ? "submitted" : "filled"} (${pagesDone} pages)`);
}

function verifyPlaywrightChromium(log: LogFn): void {
  let execPath: string;
  try {
    execPath = chromium.executablePath();
  } catch {
    throw new Error(
      `Playwright Chromium install nahi mila. VPS par chalao: npm run playwright:setup — ${VPS_LOGIN_HELP}`
    );
  }
  if (!fs.existsSync(execPath)) {
    throw new Error(
      `Chromium missing at ${execPath}. Run: npm run playwright:setup`
    );
  }
  log(`Chromium ready: ${execPath}`);
}

async function launchBrowser(
  portal: DgPortalConfig,
  loginStudent: Record<string, unknown>
): Promise<{ context: BrowserContext; profileDir: string }> {
  const fallbackLoginId = String(loginStudent.dgLoginId || loginStudent.mobileNumber || "default");
  const profileDir = getProfileDirForSchool(portal, schoolId || String(loginStudent.schoolId || ""), fallbackLoginId);
  log(`Browser profile (${portal.type}): ${profileDir}`);

  verifyPlaywrightChromium(log);

  const isLinux = process.platform === "linux";
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const headless = isAutomationHeadless();

  log(
    `Launching Chromium: headless=${headless} isLinux=${isLinux} DISPLAY=${process.env.DISPLAY || "—"} WAYLAND_DISPLAY=${
      process.env.WAYLAND_DISPLAY || "—"
    } AUTOMATION_HEADLESS=${process.env.AUTOMATION_HEADLESS || "—"}`
  );

  if (isLinux && !hasDisplay && !headless) {
    throw new Error(
      `Linux VPS par browser dikhane ke liye xvfb chahiye. ${VPS_LOGIN_HELP}`
    );
  }

  const launchArgs = [
    "--start-maximized",
    "--disable-blink-features=AutomationControlled",
  ];
  if (isLinux) {
    launchArgs.push("--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage");
  }
  if (!headless) {
    launchArgs.push("--window-position=0,0");
  }

  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      headless,
      slowMo: headless ? 0 : 50,
      viewport: headless ? { width: 1366, height: 768 } : null,
      acceptDownloads: true,
      ignoreDefaultArgs: ["--enable-automation"],
      args: launchArgs,
    });

    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});

    return { context, profileDir };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Executable doesn't exist") || msg.includes("browserType.launch")) {
      throw new Error(
        `Playwright browser launch fail. VPS par: npm run playwright:setup — ${msg}`
      );
    }
    throw err;
  }
}

async function main() {
  let actionMode: ApplyActionMode = "auto";
  let portalType = parsePortalType(envPortalType);

  if (jobId) {
    const job = await prisma.automationJob.findUnique({ where: { id: jobId } });
    if (job?.actionMode === "new_apply" || job?.actionMode === "edit") {
      actionMode = job.actionMode;
    }
    if (job?.portalType) {
      portalType = parsePortalType(job.portalType);
    }
  }

  const portal = getDgPortalByType(portalType);

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, firstName: true, surname: true, aadhaarNumber: true },
  });

  if (jobId) {
    reporter = new JobReporter(jobId, prisma);
    reporter.initProgress(buildInitialProgress(students));
    await reporter.setRunning(0, "Starting automation");
  }

  log(`Auto Apply — ${studentIds.length} student(s), portal: ${portal.label}, mode: ${mode}, action: ${actionMode}`);

  const firstStudent = await prisma.student.findUnique({ where: { id: studentIds[0] } });
  if (!firstStudent) throw new Error("First student not found");

  const { context, profileDir } = await launchBrowser(portal, firstStudent as unknown as Record<string, unknown>);
  const page = context.pages()[0] || (await context.newPage());

  log(`Opening Digital Gujarat browser → ${portal.loginUrl}`);
  if (reporter) await reporter.flush({ currentStep: "Digital Gujarat browser khul raha hai..." });
  await page.goto(portal.loginUrl, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.bringToFront().catch(() => {});
  log(`Browser URL: ${page.url()}`);

  try {
    if (mode !== "fill-only") {
      await ensureDgLoggedIn(
        page,
        prisma,
        schoolId || firstStudent.schoolId,
        firstStudent as unknown as Record<string, unknown>,
        log,
        profileDir,
        portal,
        jobId,
        reporter
      );
    }

    for (let i = 0; i < studentIds.length; i++) {
      await runStudentFlow(page, studentIds[i], i, studentIds.length, actionMode, profileDir, portal);
    }

    log(`🎉 Done — ${studentIds.length} student(s) processed`);
    if (reporter) await reporter.complete("completed");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Error: ${errMsg}`);
    if (reporter) {
      const current = reporter.getProgress().find((p) => p.status === "running");
      if (current) {
        reporter.updateStudent(current.studentId, { status: "failed", step: "Failed", message: errMsg, percent: 0 });
      }
      await reporter.flush({ status: "failed", errorMessage: errMsg, finishedAt: new Date() });
    }
    throw error;
  } finally {
    log("Browser closing in 30s...");
    await page.waitForTimeout(30000);
    await context.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
