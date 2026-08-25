import { writeFileSync } from "fs";
import path from "path";
import { CSV_HEADERS } from "../src/lib/constants";
import { buildStudentImportWorkbook } from "../src/lib/import/import-template";
import { embedImportFormMacros } from "../src/lib/import/embed-import-macros";
import type { ImportFieldKey } from "../src/lib/import/student-import";

async function main() {
  const out = path.join(process.cwd(), "src", "lib", "import", "macros", "_test-import-form.xlsm");
  const buf = await buildStudentImportWorkbook([...CSV_HEADERS] as ImportFieldKey[], {
    includeSample: true,
  });
  const xlsm = await embedImportFormMacros(buf);
  writeFileSync(out, xlsm);
  console.log("wrote", out, xlsm.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
