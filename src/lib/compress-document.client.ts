import type { DocType } from "@/components/documents/document-uploader";
import { DG_DOC_LIMITS, formatKB } from "./dg-document-limits";

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
  mimeType: string;
  message: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    );
  });
}

function fitDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let w = width;
  let h = height;
  if (w > maxWidth) {
    h = (h * maxWidth) / w;
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = (w * maxHeight) / h;
    h = maxHeight;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

async function compressImageFile(file: File, docType: DocType): Promise<CompressResult> {
  const limits = DG_DOC_LIMITS[docType];
  const maxBytes = limits.maxKB * 1024;
  const originalSize = file.size;

  if (file.type === "application/pdf") {
    return compressPdfToImage(file, docType);
  }

  const img = await loadImage(file);
  URL.revokeObjectURL(img.src);

  const { width, height } = fitDimensions(
    img.naturalWidth,
    img.naturalHeight,
    limits.maxWidth,
    limits.maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > maxBytes && quality > 0.15) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  // Still too large — shrink dimensions further
  if (blob.size > maxBytes) {
    let scale = 0.85;
    while (blob.size > maxBytes && scale > 0.35) {
      const sw = Math.round(width * scale);
      const sh = Math.round(height * scale);
      canvas.width = sw;
      canvas.height = sh;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sw, sh);
      ctx.drawImage(img, 0, 0, sw, sh);
      blob = await canvasToBlob(canvas, 0.75);
      scale -= 0.1;
    }
  }

  const fileName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const compressedFile = new File([blob], fileName, { type: "image/jpeg" });
  const compressed = compressedFile.size < originalSize || originalSize > maxBytes;

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    compressed,
    mimeType: "image/jpeg",
    message:
      compressed && originalSize > maxBytes
        ? `${formatKB(originalSize)} → ${formatKB(compressedFile.size)} (DG ready)`
        : compressed
          ? `Optimized to ${formatKB(compressedFile.size)}`
          : `Already ${formatKB(originalSize)} — DG ready`,
  };
}

async function compressPdfToImage(file: File, docType: DocType): Promise<CompressResult> {
  const originalSize = file.size;
  const maxBytes = DG_DOC_LIMITS[docType].maxKB * 1024;

  if (originalSize <= maxBytes) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressed: false,
      mimeType: "application/pdf",
      message: `PDF ${formatKB(originalSize)} — DG ready`,
    };
  }

  // PDF too large — render page 1 as compressed JPEG via pdf.js
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    const limits = DG_DOC_LIMITS[docType];
    const fitted = fitDimensions(canvas.width, canvas.height, limits.maxWidth, limits.maxHeight);

    const out = document.createElement("canvas");
    out.width = fitted.width;
    out.height = fitted.height;
    const outCtx = out.getContext("2d")!;
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, fitted.width, fitted.height);
    outCtx.drawImage(canvas, 0, 0, fitted.width, fitted.height);

    let quality = 0.85;
    let blob = await canvasToBlob(out, quality);
    while (blob.size > maxBytes && quality > 0.2) {
      quality -= 0.1;
      blob = await canvasToBlob(out, quality);
    }

    const fileName = file.name.replace(/\.pdf$/i, "") + ".jpg";
    const compressedFile = new File([blob], fileName, { type: "image/jpeg" });

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressed: true,
      mimeType: "image/jpeg",
      message: `PDF ${formatKB(originalSize)} → JPG ${formatKB(compressedFile.size)} (DG ready)`,
    };
  } catch {
    throw new Error("PDF compress nahi ho paya. Image (JPG/PNG) ke roop me upload karein.");
  }
}

export async function compressForDigitalGujarat(
  file: File,
  docType: DocType
): Promise<CompressResult> {
  const maxBytes = DG_DOC_LIMITS[docType].maxKB * 1024;

  if (file.type.startsWith("image/")) {
    if (file.size <= maxBytes && file.type === "image/jpeg") {
      return {
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressed: false,
        mimeType: file.type,
        message: `${formatKB(file.size)} — DG ready`,
      };
    }
    return compressImageFile(file, docType);
  }

  if (file.type === "application/pdf") {
    return compressPdfToImage(file, docType);
  }

  throw new Error("Sirf JPG, PNG, WEBP ya PDF allowed hai");
}
