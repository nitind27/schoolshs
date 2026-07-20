"use client";

import { StudentPortalProvider } from "@/components/student-portal/student-portal-ui";

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return <StudentPortalProvider>{children}</StudentPortalProvider>;
}
