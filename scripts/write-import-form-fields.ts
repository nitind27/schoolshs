import { writeFileSync } from "fs";
import path from "path";
import { CSV_HEADERS, CSV_HEADER_LABELS } from "../src/lib/constants";

const LIST_KEYS = new Set([
  "gender",
  "category",
  "religion",
  "standard",
  "section",
  "isOrphan",
  "isHosteler",
  "financialYear",
  "residentType",
  "habitationType",
  "maritalStatus",
  "courseType",
  "bloodGroup",
  "sscSeatPrefix",
  "hscSeatPrefix",
  "admissionType",
  "currentYear",
  "board10th",
  "board12th",
  "currentDistrict",
  "permanentDistrict",
  "institutionDistrict",
]);

const lines = ["key,label,kind"];
for (const key of CSV_HEADERS) {
  const label = (CSV_HEADER_LABELS[key] || key).replace(/"/g, '""');
  const kind = LIST_KEYS.has(key) ? "list" : "text";
  lines.push(`${key},"${label}",${kind}`);
}

const out = path.join(process.cwd(), "src", "lib", "import", "macros", "form-fields.csv");
writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
console.log("wrote", out, CSV_HEADERS.length);
