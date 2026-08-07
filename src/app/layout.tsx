import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoGujarati = Noto_Sans_Gujarati({
  variable: "--font-noto-gujarati",
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Codeat Education",
    template: "%s · Codeat Education",
  },
  description:
    "Codeat Education — multi-school platform for scholarship, results, accounting, certificates and role-based portals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu" className={`${geistSans.variable} ${geistMono.variable} ${notoGujarati.variable} h-full antialiased`}>
      <body className={`${geistSans.className} ${notoGujarati.className} min-h-full`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="shs_locale_v3",e="shs_locale_explicit";localStorage.removeItem("shs_locale");localStorage.removeItem("shs_locale_v2");var explicit=localStorage.getItem(e)==="1";var stored=localStorage.getItem(k);var loc=(explicit&&(stored==="en"||stored==="gu"))?stored:"gu";if(!explicit){localStorage.setItem(k,"gu");loc="gu";}document.documentElement.lang=loc==="gu"?"gu":"en";document.documentElement.classList.add(loc==="gu"?"locale-gu":"locale-en");document.documentElement.classList.remove(loc==="gu"?"locale-en":"locale-gu");}catch(err){}})();`,
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
