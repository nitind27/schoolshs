import type { PrismaClient } from "../src/generated/prisma/client";

export type StudentJobStatus = "pending" | "running" | "filled" | "submitted" | "failed" | "skipped";
export type DgActionType = "new_apply" | "edit" | "view" | "auto_detected" | "unknown";

export interface StudentProgressItem {
  studentId: string;
  name: string;
  aadhaarNumber: string;
  status: StudentJobStatus;
  dgAction: DgActionType;
  dgPortalStatus?: string;
  step: string;
  percent: number;
  message?: string;
}

export class JobReporter {
  private logs: string[] = [];
  private progress: StudentProgressItem[] = [];

  constructor(
    private jobId: string,
    private prisma: PrismaClient
  ) {}

  initProgress(items: StudentProgressItem[]) {
    this.progress = items;
  }

  getProgress() {
    return this.progress;
  }

  updateStudent(studentId: string, patch: Partial<StudentProgressItem>) {
    this.progress = this.progress.map((p) =>
      p.studentId === studentId ? { ...p, ...patch } : p
    );
  }

  async appendLog(msg: string) {
    const line = `[${new Date().toLocaleTimeString("en-IN")}] ${msg}`;
    this.logs.push(line);
    await this.flush({ currentStep: msg });
    return line;
  }

  async setRunning(index: number, step: string) {
    await this.flush({
      status: "running",
      currentIndex: index,
      currentStep: step,
      startedAt: new Date(),
    });
  }

  async flush(extra: Record<string, unknown> = {}) {
    const completedCount = this.progress.filter((p) =>
      ["submitted", "filled", "skipped"].includes(p.status)
    ).length;
    const failedCount = this.progress.filter((p) => p.status === "failed").length;

    await this.prisma.automationJob.update({
      where: { id: this.jobId },
      data: {
        logs: this.logs.slice(-500).join("\n"),
        studentProgress: JSON.stringify(this.progress),
        completedCount,
        failedCount,
        ...extra,
      },
    });
  }

  async complete(finalStatus: "completed" | "failed" | "partial") {
    await this.flush({
      status: finalStatus,
      finishedAt: new Date(),
      currentStep: finalStatus === "completed" ? "All done" : "Finished with errors",
    });
  }
}

export function buildInitialProgress(
  students: { id: string; firstName: string; surname: string; aadhaarNumber: string }[]
): StudentProgressItem[] {
  return students.map((s) => ({
    studentId: s.id,
    name: `${s.firstName} ${s.surname}`,
    aadhaarNumber: s.aadhaarNumber,
    status: "pending",
    dgAction: "unknown",
    step: "Waiting",
    percent: 0,
  }));
}
