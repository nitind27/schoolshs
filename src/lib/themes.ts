export const THEME_IDS = [
  "forest",
  "navy",
  "royal",
  "ocean",
  "burgundy",
  "copper",
  "plum",
  "jade",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemePack = {
  id: ThemeId;
  name: string;
  blurb: string;
  sidebar: string;
  sidebar2: string;
  active: string;
  activeHover: string;
  hover: string;
  brand500: string;
  brand600: string;
  brand700: string;
  wash: string;
  mark: string;
  markLine: string;
};

export const THEME_PACKS: ThemePack[] = [
  {
    id: "forest",
    name: "Forest",
    blurb: "Charcoal sidebar with emerald. The original school look.",
    sidebar: "#111827",
    sidebar2: "#0f172a",
    active: "#047857",
    activeHover: "#065f46",
    hover: "#1f2937",
    brand500: "#0d9488",
    brand600: "#047857",
    brand700: "#065f46",
    wash: "#ecfdf5",
    mark: "rgba(4,120,87,.35)",
    markLine: "rgba(13,148,136,.45)",
  },
  {
    id: "navy",
    name: "Navy",
    blurb: "Midnight blue with a sapphire accent. Formal and calm.",
    sidebar: "#0b1b33",
    sidebar2: "#071226",
    active: "#1d4ed8",
    activeHover: "#1e40af",
    hover: "#13284a",
    brand500: "#3b82f6",
    brand600: "#1d4ed8",
    brand700: "#1e3a8a",
    wash: "#eff6ff",
    mark: "rgba(29,78,216,.4)",
    markLine: "rgba(147,197,253,.45)",
  },
  {
    id: "royal",
    name: "Royal",
    blurb: "Indigo night and violet. Sharp, premium, quiet.",
    sidebar: "#1e1b4b",
    sidebar2: "#17153f",
    active: "#4f46e5",
    activeHover: "#4338ca",
    hover: "#312e81",
    brand500: "#818cf8",
    brand600: "#4f46e5",
    brand700: "#3730a3",
    wash: "#eef2ff",
    mark: "rgba(79,70,229,.4)",
    markLine: "rgba(199,210,254,.5)",
  },
  {
    id: "ocean",
    name: "Ocean",
    blurb: "Deep sea and clear sky blue.",
    sidebar: "#0c4a6e",
    sidebar2: "#082f49",
    active: "#0284c7",
    activeHover: "#0369a1",
    hover: "#075985",
    brand500: "#0ea5e9",
    brand600: "#0284c7",
    brand700: "#075985",
    wash: "#f0f9ff",
    mark: "rgba(14,165,233,.35)",
    markLine: "rgba(186,230,253,.55)",
  },
  {
    id: "burgundy",
    name: "Burgundy",
    blurb: "Wine-dark sidebar with crimson. Ceremony and certificates.",
    sidebar: "#2a1218",
    sidebar2: "#1a0b10",
    active: "#be123c",
    activeHover: "#9f1239",
    hover: "#3f1d27",
    brand500: "#e11d48",
    brand600: "#be123c",
    brand700: "#9f1239",
    wash: "#fff1f2",
    mark: "rgba(190,18,60,.4)",
    markLine: "rgba(253,164,175,.45)",
  },
  {
    id: "copper",
    name: "Copper",
    blurb: "Ink black with burnt orange. Warm and confident.",
    sidebar: "#1c1410",
    sidebar2: "#120e0c",
    active: "#c2410c",
    activeHover: "#9a3412",
    hover: "#3f2a22",
    brand500: "#f97316",
    brand600: "#c2410c",
    brand700: "#9a3412",
    wash: "#fff7ed",
    mark: "rgba(194,65,12,.4)",
    markLine: "rgba(253,186,116,.5)",
  },
  {
    id: "plum",
    name: "Plum",
    blurb: "Aubergine and orchid. Distinct without being loud.",
    sidebar: "#2e1065",
    sidebar2: "#1e0a45",
    active: "#7c3aed",
    activeHover: "#6d28d9",
    hover: "#4c1d95",
    brand500: "#a78bfa",
    brand600: "#7c3aed",
    brand700: "#5b21b6",
    wash: "#f5f3ff",
    mark: "rgba(124,58,237,.4)",
    markLine: "rgba(221,214,254,.5)",
  },
  {
    id: "jade",
    name: "Jade",
    blurb: "Deep green-black with a bright jade highlight.",
    sidebar: "#042f2e",
    sidebar2: "#022c22",
    active: "#0f766e",
    activeHover: "#115e59",
    hover: "#134e4a",
    brand500: "#14b8a6",
    brand600: "#0f766e",
    brand700: "#115e59",
    wash: "#f0fdfa",
    mark: "rgba(20,184,166,.35)",
    markLine: "rgba(153,246,228,.5)",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function themeById(id: string | null | undefined): ThemePack {
  return THEME_PACKS.find((theme) => theme.id === id) || THEME_PACKS[0];
}

export const THEME_STORAGE_KEY = "shs_theme";
