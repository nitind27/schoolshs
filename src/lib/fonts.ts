import localFont from "next/font/local";

/**
 * Self-hosted fonts — do not use next/font/google.
 * Next 16 Turbopack fails builds when Google returns /l/font?kit=…&skey=… URLs
 * ("queries have exactly one entry" / Can't resolve @vercel/turbopack-next/...).
 */

export const geistSans = localFont({
  src: "../fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

export const geistMono = localFont({
  src: "../fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

export const notoGujarati = localFont({
  src: "../fonts/noto-sans-gujarati.woff2",
  variable: "--font-noto-gujarati",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
});

/** Landing / login / public-page display face */
export const lpDisplay = localFont({
  src: "../fonts/outfit-latin.woff2",
  variable: "--font-lp-display",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
});

/** Landing / login / public-page body face */
export const lpBody = localFont({
  src: "../fonts/source-sans-3-latin.woff2",
  variable: "--font-lp-body",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: false,
});

export const appFontVariables = [
  geistSans.variable,
  geistMono.variable,
  notoGujarati.variable,
  lpDisplay.variable,
  lpBody.variable,
].join(" ");
