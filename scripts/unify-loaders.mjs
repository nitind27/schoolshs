/**
 * One-off codemod: replace ad-hoc CSS/Loader2 page spinners with <PageLoader />.
 * Run: node scripts/unify-loaders.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === "generated") continue;
      walk(p, out);
    } else if (/\.(tsx|jsx)$/.test(name.name)) {
      out.push(p);
    }
  }
  return out;
}

function ensureImport(src, importLine) {
  if (src.includes("@/components/ui/loader")) return src;
  if (/^"use client";/m.test(src)) {
    return src.replace(/^"use client";\s*\n/, `"use client";\n\n${importLine}\n`);
  }
  if (/^import /m.test(src)) {
    return src.replace(/^(import .+?\n)/, `${importLine}\n$1`);
  }
  return `${importLine}\n${src}`;
}

function stripUnusedLoader2(src) {
  if (src.includes("Loader2")) return src;
  return src
    .replace(/,?\s*Loader2\s*,?/g, (m) => {
      // handled below more carefully
      return m;
    });
}

function cleanLucideImport(src) {
  // Remove Loader2 from lucide-react imports if unused
  if (/\bLoader2\b/.test(src.replace(/import\s*\{[^}]*\}\s*from\s*["']lucide-react["'];?/, ""))) {
    return src; // still used
  }
  return src.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?/,
    (full, inner) => {
      const parts = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== "Loader2");
      if (parts.length === 0) return "";
      return `import { ${parts.join(", ")} } from "lucide-react";`;
    },
  );
}

const PAGE_PATTERNS = [
  // flex h-48 + border spinner
  {
    re: /<div className="flex h-48 items-center justify-center">\s*<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex h-48 items-center justify-center">\s*<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex h-48 items-center justify-center">\s*<Loader2 className="h-8 w-8 animate-spin text-blue-600"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex h-48 items-center justify-center">\s*<Loader2 className=\{`h-8 w-8 animate-spin \$\{tp\.icon\}`\}\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-600"\s*\/><\/div>/g,
    to: "<PageLoader />",
  },
  // lone centered Loader2 blocks
  {
    re: /<div className="flex min-h-\[[^\]]+\] items-center justify-center[^"]*">\s*<Loader2 className="h-8 w-8 animate-spin[^"]*"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex items-center justify-center py-16">\s*<Loader2 className="h-8 w-8 animate-spin[^"]*"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex items-center justify-center py-20">\s*<Loader2 className="h-8 w-8 animate-spin[^"]*"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  {
    re: /<div className="flex items-center justify-center p-12">\s*<Loader2 className="h-8 w-8 animate-spin[^"]*"\s*\/>\s*<\/div>/g,
    to: "<PageLoader />",
  },
  // Suspense fallbacks with raw spinner
  {
    re: /fallback=\{\s*<div className="flex h-48 items-center justify-center">\s*<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"\s*\/>\s*<\/div>\s*\}/g,
    to: 'fallback={<PageLoader />}',
  },
  {
    re: /fallback=\{\s*<div className="p-8">Loading\.\.\.<\/div>\s*\}/g,
    to: 'fallback={<PageLoader />}',
  },
];

const INLINE_SPINNER_REPLACEMENTS = [
  {
    re: /<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"\s*\/>/g,
    to: "<Spinner size=\"md\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-12 w-12 animate-spin rounded-full border-\[3px\] border-blue-100 border-t-blue-600"\s*\/>/g,
    to: "<Spinner size=\"xl\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-9 w-9 animate-spin rounded-full border-\[3px\] border-blue-100 border-t-blue-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-teal-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className=\{`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-teal-600`\}\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-100 border-t-cyan-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<Loader2 className="h-8 w-8 animate-spin text-blue-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<Loader2 className="h-8 w-8 animate-spin text-emerald-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<Loader2 className="h-8 w-8 animate-spin text-violet-600"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<Loader2 className="h-8 w-8 animate-spin text-\[var\(--sp-accent,#0d7377\)\]"\s*\/>/g,
    to: "<Spinner size=\"lg\" />",
    need: "Spinner",
  },
  {
    re: /<Loader2 className="h-8 w-8 animate-spin text-white"\s*\/>/g,
    to: "<Spinner size=\"lg\" white />",
    need: "Spinner",
  },
];

let changedFiles = 0;
let replacements = 0;

for (const file of walk(ROOT)) {
  if (file.includes(`${path.sep}ui${path.sep}loader.tsx`)) continue;
  if (file.includes(`${path.sep}layout${path.sep}route-progress.tsx`)) continue;

  let src = fs.readFileSync(file, "utf8");
  const original = src;
  let needsPage = false;
  let needsSpinner = false;

  for (const p of PAGE_PATTERNS) {
    const next = src.replace(p.re, () => {
      needsPage = true;
      replacements += 1;
      return p.to;
    });
    src = next;
  }

  for (const p of INLINE_SPINNER_REPLACEMENTS) {
    const next = src.replace(p.re, () => {
      needsSpinner = true;
      replacements += 1;
      return p.to;
    });
    src = next;
  }

  // Common centered wrappers left with only Spinner inside → PageLoader
  src = src.replace(
    /<div className="flex h-48 items-center justify-center">\s*<Spinner size="lg"\s*\/>\s*<\/div>/g,
    () => {
      needsPage = true;
      replacements += 1;
      return "<PageLoader />";
    },
  );

  if (src === original) continue;

  const imports = [];
  if (needsPage) imports.push("PageLoader");
  if (needsSpinner) imports.push("Spinner");
  if (imports.length) {
    src = ensureImport(src, `import { ${[...new Set(imports)].join(", ")} } from "@/components/ui/loader";`);
  }
  src = cleanLucideImport(src);

  fs.writeFileSync(file, src);
  changedFiles += 1;
  console.log("updated", path.relative(process.cwd(), file));
}

console.log(`Done. ${changedFiles} files, ~${replacements} replacements.`);
