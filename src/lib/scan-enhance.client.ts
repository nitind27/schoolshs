import type { DocType } from "@/components/documents/document-uploader";

/** Enhance captured scan for document clarity */
export function enhanceScanCanvas(
  canvas: HTMLCanvasElement,
  docType: DocType
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const isPhoto = docType === "photo";

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (!isPhoto) {
      // Document mode: slight grayscale + high contrast
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    }

    // Contrast boost
    const contrast = isPhoto ? 1.08 : 1.25;
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;

    // Brightness
    const brightness = isPhoto ? 5 : 12;
    r = Math.min(255, Math.max(0, r + brightness));
    g = Math.min(255, Math.max(0, g + brightness));
    b = Math.min(255, Math.max(0, b + brightness));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality = 0.92
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Scan capture failed"));
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality
    );
  });
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  docType: DocType
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);

  // Passport photo: crop center square-ish if landscape
  if (docType === "photo" && canvas.width > canvas.height) {
    const size = Math.min(canvas.width, canvas.height);
    const sx = (canvas.width - size) / 2;
    const sy = (canvas.height - size) / 2;
    const cropped = document.createElement("canvas");
    cropped.width = size;
    cropped.height = size;
    cropped.getContext("2d")!.drawImage(canvas, sx, sy, size, size, 0, 0, size, size);
    return enhanceScanCanvas(cropped, docType);
  }

  return enhanceScanCanvas(canvas, docType);
}
