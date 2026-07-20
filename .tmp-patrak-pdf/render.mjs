import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath =
  "c:/Users/nitin_22xo2ke/AppData/Roaming/Cursor/User/workspaceStorage/74b97b86ef6684d949836e94ee3c0910/pdfs/bf869978-e2c9-4099-bed0-02bb5ae5959d/0r.pdf";
const outDir = path.dirname(fileURLToPath(import.meta.url));

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
console.log("pages", doc.numPages);

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const viewport = page.getViewport({ scale: 2.0 });
  console.log(`page ${i}: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}`);
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  const out = path.join(outDir, `ref-page-${i}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("wrote", out);

  const text = await page.getTextContent();
  const lines = text.items.map((it) => it.str).filter(Boolean);
  console.log("--- text sample page", i, "---");
  console.log(lines.slice(0, 80).join(" | "));
}
