import { ANNUAL_RESULT_TOTAL_MARKS } from "./config";
import {
  DEFAULT_EXAM_RULES,
  gradeFromPercent,
  isPassingPercent,
  type ExamRules,
} from "./exam-rules";

export type SubjectMarkInput = {
  marksObtained: number;
  achievementMarks?: number;
  graceMarks?: number;
  maxMarks: number;
  isAbsent?: boolean;
};

export function subjectFinalMarks(m: SubjectMarkInput): number {
  if (m.isAbsent) return 0;
  return (m.marksObtained || 0) + (m.achievementMarks || 0) + (m.graceMarks || 0);
}

export function computeStudentTotals(
  marks: SubjectMarkInput[],
  rules: ExamRules = DEFAULT_EXAM_RULES,
) {
  const totalObtained = marks.reduce((s, m) => s + (m.isAbsent ? 0 : m.marksObtained || 0), 0);
  const totalAchievement = marks.reduce((s, m) => s + (m.achievementMarks || 0), 0);
  const totalGrace = marks.reduce((s, m) => s + (m.graceMarks || 0), 0);
  const totalFinal = marks.reduce((s, m) => s + subjectFinalMarks(m), 0);
  const maxMarks = marks.reduce((s, m) => s + m.maxMarks, 0) || ANNUAL_RESULT_TOTAL_MARKS;
  const percentage = maxMarks > 0 ? (totalFinal / maxMarks) * 100 : 0;
  return {
    totalObtained,
    totalAchievement,
    totalGrace,
    totalFinal,
    maxMarks,
    percentage,
    grade: gradeFromPercent(percentage, rules),
  };
}

export function computeResultStatus(
  percentage: number,
  totalGrace: number,
  rules: ExamRules = DEFAULT_EXAM_RULES,
): string {
  if (!isPassingPercent(percentage, rules)) return "નાપાસ થાય છે";
  if (totalGrace > 0) return "ઉપર ચઢાવવામાં આવે છે";
  return "પાસ થાય છે";
}

export function assignRanks<T extends { studentId: string; percentage: number; totalFinal: number }>(
  rows: T[],
): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.totalFinal - a.totalFinal;
  });
  const ranked: (T & { rank: number })[] = [];
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].percentage !== sorted[i - 1].percentage) rank = i + 1;
    ranked.push({ ...sorted[i], rank });
  }
  return ranked;
}
