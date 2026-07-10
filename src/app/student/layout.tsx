"use client";

import { StudentPortalProvider } from "@/components/student-portal/student-portal-ui";

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentPortalProvider>
      <div className="student-portal-pages space-y-6 pb-8">{children}</div>
    </StudentPortalProvider>
  );
}
