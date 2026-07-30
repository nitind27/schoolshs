import { statSync } from "fs";
import type { Student } from "@/generated/prisma/client";
import { normalizeCategory } from "@/lib/category-inference";
import {
  getDgPortalConfig,
  isSpecificScholarshipScheme,
} from "@/lib/dg-portal";
import { DG_DOC_LIMITS } from "@/lib/dg-document-limits";
import {
  resolveDocAbsolutePath,
} from "@/lib/student-documents.server";
import {
  requires10thBoard,
  requires12thBoard,
} from "@/lib/student-academic-rules";
import { validateStudent } from "@/lib/validation";
import type { DocType } from "@/lib/student-documents";

const DOC_FIELD: Record<DocType, keyof Student> = {
  photo: "photoPath",
  aadhaar: "aadhaarDocPath",
  income: "incomeCertPath",
  caste: "casteCertPath",
  marksheet10: "marksheet10Path",
  marksheet12: "marksheet12Path",
  bankPassbook: "bankPassbookPath",
  feeReceipt: "feeReceiptPath",
};

function requiredDocuments(student: Student): DocType[] {
  const required: DocType[] = [
    "photo",
    "aadhaar",
    "income",
    "caste",
    "bankPassbook",
  ];
  if (requires10thBoard(student.standard)) required.push("marksheet10");
  if (requires12thBoard(student.standard)) required.push("marksheet12");
  if (/post\s*matric|mysy|food bill|instrument/i.test(student.scholarshipScheme)) {
    required.push("feeReceipt");
  }
  return [...new Set(required)];
}

export type AutomationPreflightStudent = {
  id: string;
  name: string;
  scheme: string;
  portalType: "sjed" | "citizen";
  ready: boolean;
  missingFields: Array<{ field: string; message: string }>;
  documents: Array<{
    type: DocType;
    required: boolean;
    available: boolean;
    dgReady: boolean;
    size: number | null;
    maxKB: number;
  }>;
  missingDocuments: DocType[];
  invalidDocuments: DocType[];
};

export function buildAutomationPreflight(
  student: Student,
): AutomationPreflightStudent {
  const required = new Set(requiredDocuments(student));
  const documents = (Object.keys(DOC_FIELD) as DocType[]).map((type) => {
    const stored = student[DOC_FIELD[type]];
    const absolutePath = resolveDocAbsolutePath(
      student.id,
      typeof stored === "string" ? stored : null,
      type,
    );
    let size: number | null = null;
    if (absolutePath) {
      try {
        size = statSync(absolutePath).size;
      } catch {
        size = null;
      }
    }
    const available = Boolean(absolutePath && size != null);
    const dgReady =
      available && Number(size) <= DG_DOC_LIMITS[type].maxKB * 1024;
    return {
      type,
      required: required.has(type),
      available,
      dgReady,
      size,
      maxKB: DG_DOC_LIMITS[type].maxKB,
    };
  });

  const missingDocuments = documents
    .filter((document) => document.required && !document.available)
    .map((document) => document.type);
  const invalidDocuments = documents
    .filter(
      (document) =>
        document.required && document.available && !document.dgReady,
    )
    .map((document) => document.type);
  const missingFields = validateStudent(student).map((error) => ({
    field: error.field,
    message: error.message,
  }));
  if (!isSpecificScholarshipScheme(student.scholarshipScheme)) {
    missingFields.unshift({
      field: "scholarshipScheme",
      message: "Select the exact scholarship scheme",
    });
  }
  if (normalizeCategory(student.category) === "Open") {
    missingFields.unshift({
      field: "category",
      message:
        "Open / General category is not eligible for scholarship Auto Apply",
    });
  }

  return {
    id: student.id,
    name: [student.firstName, student.middleName, student.surname]
      .filter(Boolean)
      .join(" "),
    scheme: student.scholarshipScheme,
    portalType: getDgPortalConfig(student.scholarshipScheme).type,
    ready:
      missingFields.length === 0 &&
      missingDocuments.length === 0 &&
      invalidDocuments.length === 0,
    missingFields,
    documents,
    missingDocuments,
    invalidDocuments,
  };
}
