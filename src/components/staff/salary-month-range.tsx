"use client";

import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import { monthKey, type YearMonth } from "@/lib/salary-month-range";

export function SalaryMonthRange({
  months,
  labelFor,
  from,
  to,
  onChange,
}: {
  months: YearMonth[];
  labelFor: (item: YearMonth) => string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useT();
  const options = months.map((item) => ({ value: monthKey(item), label: labelFor(item) }));
  const indexOf = (key: string) => options.findIndex((opt) => opt.value === key);

  return (
    <>
      <Select
        label={t("salaryRange.from")}
        value={from}
        hideEmptyOption
        onChange={(e) => {
          const next = e.target.value;
          const toIndex = indexOf(to);
          const fromIndex = indexOf(next);
          onChange(next, fromIndex > toIndex && toIndex >= 0 ? next : to);
        }}
        options={options}
        className="w-32"
      />
      <Select
        label={t("salaryRange.to")}
        value={to}
        hideEmptyOption
        onChange={(e) => {
          const next = e.target.value;
          const fromIndex = indexOf(from);
          const toIndex = indexOf(next);
          onChange(toIndex < fromIndex ? next : from, next);
        }}
        options={options}
        className="w-32"
      />
    </>
  );
}
