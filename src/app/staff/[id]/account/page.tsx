"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { StaffPortalAccountPanel } from "@/components/staff/staff-portal-account-panel";
import { useT } from "@/i18n/locale-provider";

export default function StaffAccountPage() {
  const t = useT();
  const params = useParams();
  const id = params.id as string;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setAllowed(d.user?.role === "school_admin");
      })
      .catch(() => setAllowed(false));

    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then((s) => {
        if (s?.firstName) setStaffName(`${s.firstName} ${s.lastName || ""}`.trim());
      })
      .catch(() => {});
  }, [id]);

  if (allowed === null) {
    return <PageLoader screen label={t("common.loading")} />;
  }

  if (!allowed) {
    return (
      <PageShell title={t("accountSettings.portalLogin")} breadcrumbs={[{ label: t("nav.staff"), href: "/staff" }]}>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("accountSettings.adminOnlyLogin")}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("accountSettings.staffLoginPageTitle")}
      subtitle={staffName || t("accountSettings.staffLoginPageSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("accountSettings.portalLogin") },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/staff">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {t("nav.staff")}
            </Button>
          </Link>
          <Link href={`/staff/${id}/edit`}>
            <Button variant="outline" size="sm">
              {t("staffPage.editStaff")}
            </Button>
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl">
        <StaffPortalAccountPanel staffId={id} />
      </div>
    </PageShell>
  );
}
