import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "file", "12-B  DAXABEN.xlsx");
const buf = fs.readFileSync(file);
const wb = XLSX.read(buf, { type: "buffer", cellDates: true, raw: false });
console.log("SHEETS", wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  console.log("\n===== SHEET", name, "ref", ws["!ref"], "=====");
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) as unknown[][];
  console.log("rowCount", rows.length);
  rows.slice(0, 15).forEach((r, i) => {
    console.log(JSON.stringify({ i: i + 1, cols: r.length, row: r }));
  });
  if (rows.length > 15) {
    console.log("... last 3 rows ...");
    rows.slice(-3).forEach((r, i) => {
      console.log(JSON.stringify({ i: rows.length - 2 + i, cols: r.length, row: r }));
    });
  }
}
