"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Add Class is a modal on /classes — keep this route as a redirect. */
export default function NewClassPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/classes");
  }, [router]);
  return (
    <PageLoader />
  );
}
