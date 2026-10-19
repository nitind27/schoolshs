"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  DEFAULT_PRAGATI_LAYOUT,
  PRAGATI_LAYOUT_PASSWORD,
  isPragatiLayoutSchool,
  loadPragatiLayout,
  pragatiLayoutStyle,
  savePragatiLayout,
  type PragatiLayout,
} from "@/lib/results/pragati-layout";

type Field = {
  key: keyof PragatiLayout;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "પાનું",
    fields: [
      { key: "sheetPadTop", label: "ઉપર પેડિંગ", min: 0, max: 12, step: 0.1, unit: "mm" },
      { key: "sheetPadX", label: "બાજુ પેડિંગ", min: 0, max: 12, step: 0.1, unit: "mm" },
      { key: "sheetPadBottom", label: "નીચે પેડિંગ", min: 0, max: 12, step: 0.1, unit: "mm" },
    ],
  },
  {
    title: "હેડર",
    fields: [
      { key: "headerPadTop", label: "ઉપર પેડિંગ", min: 0, max: 12, step: 0.1, unit: "mm" },
      { key: "headerPadX", label: "બાજુ પેડિંગ", min: 0, max: 10, step: 0.1, unit: "mm" },
      { key: "headerPadBottom", label: "નીચે પેડિંગ", min: 0, max: 10, step: 0.1, unit: "mm" },
      { key: "headerMargin", label: "નીચે માર્જિન", min: 0, max: 8, step: 0.1, unit: "mm" },
    ],
  },
  {
    title: "લોગો",
    fields: [
      { key: "logoW", label: "પહોળાઈ", min: 12, max: 45, step: 0.5, unit: "mm" },
      { key: "logoH", label: "ઊંચાઈ", min: 12, max: 50, step: 0.5, unit: "mm" },
    ],
  },
  {
    title: "મંડળ લખાણ",
    fields: [{ key: "fontTrust", label: "ફોન્ટ", min: 8, max: 20, step: 0.5, unit: "px" }],
  },
  {
    title: "શાળાનું નામ",
    fields: [{ key: "fontSchool", label: "ફોન્ટ", min: 10, max: 26, step: 0.5, unit: "px" }],
  },
  {
    title: "વિભાગ",
    fields: [{ key: "fontSection", label: "ફોન્ટ", min: 8, max: 22, step: 0.5, unit: "px" }],
  },
  {
    title: "વર્ષ",
    fields: [{ key: "fontYear", label: "ફોન્ટ", min: 8, max: 20, step: 0.5, unit: "px" }],
  },
  {
    title: "ગ્રેડ બોક્સ",
    fields: [
      { key: "legendW", label: "પહોળાઈ", min: 28, max: 70, step: 0.5, unit: "mm" },
      { key: "fontLegendTitle", label: "શીર્ષક ફોન્ટ", min: 8, max: 16, step: 0.5, unit: "px" },
      { key: "fontLegend", label: "લખાણ ફોન્ટ", min: 7, max: 16, step: 0.5, unit: "px" },
    ],
  },
  {
    title: "ડાયસ / UID",
    fields: [{ key: "fontBar", label: "ફોન્ટ", min: 8, max: 18, step: 0.5, unit: "px" }],
  },
  {
    title: "વિદ્યાર્થી",
    fields: [
      { key: "fontStudent", label: "ફોન્ટ", min: 8, max: 18, step: 0.5, unit: "px" },
      { key: "studentPadY", label: "ઉપર-નીચે પેડિંગ", min: 0, max: 6, step: 0.1, unit: "mm" },
      { key: "studentPadX", label: "બાજુ પેડિંગ", min: 0, max: 8, step: 0.1, unit: "mm" },
    ],
  },
  {
    title: "ગુણ ટેબલ",
    fields: [
      { key: "fontTable", label: "ફોન્ટ", min: 8, max: 16, step: 0.5, unit: "px" },
      { key: "colSubject", label: "વિષય કોલમ પહોળાઈ", min: 16, max: 40, step: 0.5, unit: "%" },
    ],
  },
  {
    title: "શેરો",
    fields: [
      { key: "remarksW", label: "પહોળાઈ", min: 36, max: 80, step: 0.5, unit: "mm" },
      { key: "fontRemarks", label: "ફોન્ટ", min: 7, max: 14, step: 0.5, unit: "px" },
    ],
  },
  {
    title: "સૂચના",
    fields: [{ key: "fontNotice", label: "ફોન્ટ", min: 7, max: 14, step: 0.5, unit: "px" }],
  },
  {
    title: "સહી",
    fields: [{ key: "fontSign", label: "ફોન્ટ", min: 8, max: 18, step: 0.5, unit: "px" }],
  },
];

export function usePragatiLayout(schoolCode?: string | null) {
  const enabled = isPragatiLayoutSchool(schoolCode);
  const [layout, setLayout] = useState<PragatiLayout>(DEFAULT_PRAGATI_LAYOUT);

  useEffect(() => {
    if (!enabled) return;
    setLayout(loadPragatiLayout());
  }, [enabled]);

  return {
    enabled,
    style: enabled ? (pragatiLayoutStyle(layout) as CSSProperties) : undefined,
    editor: enabled ? (
      <PragatiLayoutEditor layout={layout} onChange={setLayout} />
    ) : null,
  };
}

function PragatiLayoutEditor({
  layout,
  onChange,
}: {
  layout: PragatiLayout;
  onChange: (next: PragatiLayout) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const requestOpen = () => {
    setPassword("");
    setError("");
    setAsk(true);
  };

  const submitPassword = () => {
    if (password.trim() !== PRAGATI_LAYOUT_PASSWORD) {
      setError("પાસવર્ડ ખોટો છે");
      return;
    }
    setAsk(false);
    setOpen(true);
  };

  const update = (key: keyof PragatiLayout, value: number) => {
    const next = { ...layout, [key]: value };
    onChange(next);
    savePragatiLayout(next);
  };

  const reset = () => {
    onChange(DEFAULT_PRAGATI_LAYOUT);
    savePragatiLayout(DEFAULT_PRAGATI_LAYOUT);
  };

  return (
    <div className="no-print">
      <button
        type="button"
        onClick={requestOpen}
        className="mb-3 rounded-lg border border-amber-700 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-950"
      >
        લેઆઉટ એડિટ
      </button>

      {ask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              submitPassword();
            }}
          >
            <p className="text-sm font-semibold text-slate-800">લેઆઉટ એડિટ માટે પાસવર્ડ</p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600"
                onClick={() => setAsk(false)}
              >
                બંધ
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-semibold text-white"
              >
                ખોલો
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {open ? (
        <aside className="fixed bottom-3 right-3 top-3 z-40 flex w-[320px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <strong className="text-sm">પ્રગતિપત્રક લેઆઉટ</strong>
            <button type="button" className="text-sm text-slate-500" onClick={() => setOpen(false)}>
              બંધ
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {GROUPS.map((group) => (
              <section key={group.title} className="rounded-lg border border-slate-200 p-2">
                <h3 className="mb-2 text-xs font-bold text-slate-700">{group.title}</h3>
                <div className="space-y-2">
                  {group.fields.map((field) => (
                    <label key={field.key} className="block text-xs text-slate-600">
                      <span className="mb-0.5 flex justify-between">
                        <span>{field.label}</span>
                        <span>
                          {layout[field.key]}
                          {field.unit}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={layout[field.key]}
                        onChange={(e) => update(field.key, Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="border-t px-3 py-2">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg border border-slate-300 py-1.5 text-sm"
            >
              મૂળ માપ પાછા
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
