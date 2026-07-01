import sharp from "sharp";
import type { DocType } from "@/components/documents/document-uploader";
import { DG_DOC_LIMITS } from "./dg-document-limits";

export interface ServerCompressResult {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
}

async function compressImageBuffer(
  input: Buffer,
  docType: DocType
): Promise<ServerCompressResult> {
  const limits = DG_DOC_LIMITS[docType];
  const maxBytes = limits.maxKB * 1024;
  const originalSize = input.length;

  let pipeline = sharp(input)
    .rotate()
    .resize(limits.maxWidth, limits.maxHeight, { fit: "inside", withoutEnlargement: true });

  let quality = 85;
  let buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  while (buffer.length > maxBytes && quality > 20) {
    quality -= 10;
    buffer = await sharp(input)
      .rotate()
      .resize(limits.maxWidth, limits.maxHeight, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  if (buffer.length > maxBytes) {
    const meta = await sharp(buffer).metadata();
    let scale = 0.8;
    while (buffer.length > maxBytes && scale > 0.4) {
      const w = Math.round((meta.width || limits.maxWidth) * scale);
      const h = Math.round((meta.height || limits.maxHeight) * scale);
      buffer = await sharp(input)
        .rotate()
        .resize(w, h, { fit: "inside" })
        .jpeg({ quality: 70, mozjpeg: true })
        .toBuffer();
      scale -= 0.1;
    }
  }

  return {
    buffer,
    mimeType: "image/jpeg",
    ext: ".jpg",
    originalSize,
    compressedSize: buffer.length,
    compressed: buffer.length < originalSize || originalSize > maxBytes,
  };
}

export async function compressDocumentServer(
  buffer: Buffer,
  mimeType: string,
  docType: DocType
): Promise<ServerCompressResult> {
  const maxBytes = DG_DOC_LIMITS[docType].maxKB * 1024;

  if (mimeType === "application/pdf") {
    if (buffer.length <= maxBytes) {
      return {
        buffer,
        mimeType: "application/pdf",
        ext: ".pdf",
        originalSize: buffer.length,
        compressedSize: buffer.length,
        compressed: false,
      };
    }
    // PDF still too large after client conversion shouldn't happen; keep as-is or error
    return {
      buffer,
      mimeType: "application/pdf",
      ext: ".pdf",
      originalSize: buffer.length,
      compressedSize: buffer.length,
      compressed: false,
    };
  }

  if (mimeType.startsWith("image/") || mimeType === "application/octet-stream") {
    return compressImageBuffer(buffer, docType);
  }

  throw new Error("Unsupported file type");
}
