/**
 * Build a real .xlsm template (sheets + macros) for VBA verification.
 */
import { writeFileSync } from "fs";
import path from "path";
import { resolveImportTemplateFields } from "../src/lib/import/student-import";
import { buildStudentImportWorkbook } from "../src/lib/import/import-template";
import { embedImportFormMacros, hasImportFormMacros } from "../src/lib/import/embed-import-macros";

async function main() {
  if (!hasImportFormMacros()) throw new Error("vbaProject.bin missing — run build-import-form-vba.ps1 first");
  const fields = resolveImportTemplateFields([]);
  const xlsx = await buildStudentImportWorkbook(fields, { includeSample: true });
  const xlsm = await embedImportFormMacros(xlsx);
  const out = path.join(process.env.TEMP || "/tmp", "shs-import-form-full-verify.xlsm");
  writeFileSync(out, xlsm);
  console.log("wrote", out, xlsm.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
