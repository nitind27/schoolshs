import sharp from "sharp";

const PASSPORT_WIDTH = 1200;
const PASSPORT_HEIGHT = 1600;
const PINK_SHIRT = { r: 233, g: 30, b: 140 };

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Whiten near-white background pixels for passport-style photo */
function whitenBackground(data: Buffer, width: number, height: number): void {
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = luminance(r, g, b);
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (lum > 210 && maxDiff < 35) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else if (lum > 185 && maxDiff < 25) {
      const blend = (lum - 185) / 70;
      data[i] = Math.round(r + (255 - r) * blend * 0.85);
      data[i + 1] = Math.round(g + (255 - g) * blend * 0.85);
      data[i + 2] = Math.round(b + (255 - b) * blend * 0.85);
    }
  }
}

/** Apply pink uniform tint to torso region (lower ~58% of portrait) */
function applyPinkUniformTint(data: Buffer, width: number, height: number): void {
  const torsoStart = Math.floor(height * 0.38);
  for (let y = torsoStart; y < height; y++) {
    const rowBlend = Math.min(1, (y - torsoStart) / (height * 0.25));
    const tintStrength = 0.22 * rowBlend;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = luminance(r, g, b);
      if (lum > 240) continue;
      data[i] = Math.round(r * (1 - tintStrength) + PINK_SHIRT.r * tintStrength);
      data[i + 1] = Math.round(g * (1 - tintStrength) + PINK_SHIRT.g * tintStrength);
      data[i + 2] = Math.round(b * (1 - tintStrength) + PINK_SHIRT.b * tintStrength);
    }
  }
}

export interface ProcessedIdPhoto {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Process student photo for ID card:
 * - Passport 3:4 crop (face-top centered)
 * - 1200×1600 HD output
 * - White background normalization
 * - Pink school-uniform tint on torso
 */
export async function processIdCardPhoto(input: Buffer): Promise<ProcessedIdPhoto> {
  const base = sharp(input)
    .rotate()
    .resize(PASSPORT_WIDTH, PASSPORT_HEIGHT, {
      fit: "cover",
      position: "top",
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.3 })
    .normalize()
    .modulate({ brightness: 1.04, saturation: 0.92 });

  const { data, info } = await base
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  whitenBackground(pixels, info.width, info.height);
  applyPinkUniformTint(pixels, info.width, info.height);

  const buffer = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 96, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return {
    buffer,
    width: info.width,
    height: info.height,
    mimeType: "image/jpeg",
  };
}

export async function processIdCardPhotoFromPath(filePath: string): Promise<ProcessedIdPhoto> {
  const input = await sharp(filePath).toBuffer();
  return processIdCardPhoto(input);
}
