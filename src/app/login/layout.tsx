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

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${lpDisplay.variable} ${lpBody.variable} h-dvh overflow-hidden`}>
      {children}
    </div>
  );
}
