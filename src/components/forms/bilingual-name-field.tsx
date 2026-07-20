"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { GujaratiImeInput } from "@/components/forms/gujarati-ime-input";
import { useT } from "@/i18n/locale-provider";

type BilingualNameFieldProps = {
  label: string;
  enValue: string;
  guValue: string;
  onEnChange: (value: string) => void;
  onGuChange: (value: string) => void;
  guTouched: boolean;
  onGuTouched: () => void;
  required?: boolean;
  enPlaceholder?: string;
};

export function BilingualNameField({
  label,
  enValue,
  guValue,
  onEnChange,
  onGuChange,
  guTouched,
  onGuTouched,
  required,
  enPlaceholder,
}: BilingualNameFieldProps) {
  const t = useT();
  const enId = useId();
  const guId = useId();

  const handleEnChange = (value: string) => {
    onEnChange(value);
    // Gujarati field syncs via latinSource + suggestions
  };

  const handleGuChange = (value: string) => {
    onGuChange(value);
  };

  return (
    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-3 shadow-sm">
      <Input
        id={enId}
        label={`${label} (${t("fields.nameEnglish")})`}
        required={required}
        value={enValue}
        placeholder={enPlaceholder || t("fields.nameEnglishHint")}
        onChange={(e) => handleEnChange(e.target.value)}
        className="font-sans"
        autoComplete="off"
      />
      <GujaratiImeInput
        id={guId}
        label={`${label} (${t("fields.nameGujarati")})`}
        required={required}
        value={guValue}
        latinSource={enValue}
        syncFromLatin={!guTouched}
        onChange={handleGuChange}
        onManualGuEdit={onGuTouched}
      />
    </div>
  );
}
