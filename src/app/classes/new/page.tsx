"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Add Class is a modal on /classes — keep this route as a redirect. */
export default function NewClassPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/classes");
  }, [router]);
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  );
}
