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
  title: "Privacy Policy | Codeat Education",
  description:
    "Privacy Policy for the Codeat Education school ERP web portal and Android app — covering staff and student panels, data collection, security, and children’s privacy.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy | Codeat Education",
    description:
      "How Codeat Education collects and protects school, staff, and student data across web and mobile.",
    type: "website",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${lpDisplay.variable} ${lpBody.variable}`}>{children}</div>
  );
}
