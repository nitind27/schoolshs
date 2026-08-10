import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";

const lpDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-lp-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const lpBody = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-lp-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Contact Support | Codeat Education",
  description:
    "Contact Codeat Education support — email, phone, Surat office address and map for school portal help.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Contact Support | Codeat Education",
    description: "Reach Codeat Education support by email, phone, or visit our Surat office.",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${lpDisplay.variable} ${lpBody.variable}`}>{children}</div>
  );
}
