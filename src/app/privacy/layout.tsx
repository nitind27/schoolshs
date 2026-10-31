import type { Metadata } from "next";

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
  return children;
}
