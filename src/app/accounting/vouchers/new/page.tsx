"use client";

import { useEffect, useState } from "react";
import { VoucherForm } from "@/components/accounting/voucher-form";

export default function NewVoucherPage() {
  const [locked, setLocked] = useState(false);
  const [fyLabel, setFyLabel] = useState("");

  useEffect(() => {
    fetch("/api/accounting")
      .then((r) => r.json())
      .then((d) => {
        setLocked(Boolean(d.financialYear?.isLocked));
        setFyLabel(d.financialYear?.label || "");
      })
      .catch(() => {});
  }, []);

  return <VoucherForm mode="create" locked={locked} fyLabel={fyLabel} />;
}
