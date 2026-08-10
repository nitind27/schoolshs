"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  SCHOOL_TYPES,
  SCHOOL_TYPE_OTHER,
  isPresetSchoolType,
  schoolTypeCustomValue,
  schoolTypeSelectValue,
} from "@/lib/school-features";
import { cn } from "@/lib/utils";

type SchoolTypeFieldProps = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
};

/**
 * School Type dropdown — selecting "Other" reveals a free-text field.
 * `value` is the stored type (preset name or custom text).
 */
export function SchoolTypeField({
  value,
  onChange,
  className,
  disabled,
  error,
}: SchoolTypeFieldProps) {
  const selectValue = schoolTypeSelectValue(value);
  const customValue = schoolTypeCustomValue(value);
  const showOther = selectValue === SCHOOL_TYPE_OTHER;

  return (
    <div className={cn("space-y-3", className)}>
      <Select
        label="School Type"
        options={[...SCHOOL_TYPES]}
        emptyLabel="Select school type"
        value={selectValue}
        disabled={disabled}
        error={error && !showOther ? error : undefined}
        onChange={(e) => {
          const next = e.target.value;
          if (next === SCHOOL_TYPE_OTHER) {
            // Keep existing custom text if already custom; otherwise start blank
            onChange(isPresetSchoolType(value) || !value.trim() ? SCHOOL_TYPE_OTHER : value);
          } else {
            onChange(next);
          }
        }}
      />
      {showOther && (
        <Input
          label="Specify school type"
          placeholder="e.g. Ashram Shala, Madhyamik, Special School"
          value={customValue}
          disabled={disabled}
          error={error}
          required
          onChange={(e) => {
            const text = e.target.value;
            onChange(text.trim() ? text : SCHOOL_TYPE_OTHER);
          }}
        />
      )}
    </div>
  );
}
