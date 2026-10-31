import { Geist, Geist_Mono, Noto_Sans_Gujarati, Outfit, Source_Sans_3 } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const notoGujarati = Noto_Sans_Gujarati({
  variable: "--font-noto-gujarati",
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

/** Landing / login / public-page display face. Instantiated once for Turbopack. */
export const lpDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-lp-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

/** Landing / login / public-page body face. Instantiated once for Turbopack. */
export const lpBody = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-lp-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const appFontVariables = [
  geistSans.variable,
  geistMono.variable,
  notoGujarati.variable,
  lpDisplay.variable,
  lpBody.variable,
].join(" ");
