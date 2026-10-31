import type { Metadata } from "next";

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
  return children;
}
