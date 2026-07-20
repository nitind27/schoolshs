import { Outfit, Source_Sans_3 } from "next/font/google";
import { SchoolLandingPage } from "@/components/landing/school-landing-page";

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

export default function HomePage() {
  return (
    <div className={`${lpDisplay.variable} ${lpBody.variable}`}>
      <SchoolLandingPage />
    </div>
  );
}
