export type ReportSheet = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
};

export type ReportPayload = {
  type: string;
  title: string;
  subtitle?: string;
  schoolName: string;
  generatedAt: string;
  filterSummary: string;
  sheets: ReportSheet[];
};

export type ReportQuery = {
  type: string;
  standard?: string;
  section?: string;
  classId?: string;
  status?: string;
  category?: string;
  gender?: string;
  admissionStatus?: string;
  month?: string;
  year?: string;
  academicYear?: string;
  examId?: string;
  /** Inclusive YYYY-MM-DD */
  dateFrom?: string;
  /** Inclusive YYYY-MM-DD */
  dateTo?: string;
  voucherType?: string;
};
