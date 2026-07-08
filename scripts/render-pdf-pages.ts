import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

const pdfPath =
  process.argv[2] ||
  String.raw`c:\Users\nitin_22xo2ke\AppData\Roaming\Cursor\User\workspaceStorage\74b97b86ef6684d949836e94ee3c0910\pdfs\9f1f30f5-beeb-4ea2-b32c-316d499ac34c\Adobe Scan 06 Jul 2026.pdf`;

const outDir = path.join(process.cwd(), "tmp-pdf-pages");
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  console.log("pages:", doc.numPages);

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({
      // pdfjs types expect browser canvas; for this local utility script we pass node-canvas handles.
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const out = path.join(outDir, `page-${i}.png`);
    fs.writeFileSync(out, canvas.toBuffer("image/png"));
    console.log("wrote", out);
  }
}

main().catch(console.error);
