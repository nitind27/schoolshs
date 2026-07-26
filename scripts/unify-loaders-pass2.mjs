/**
 * Pass 2 — remaining animate-spin rounded-full patterns → Spinner / PageLoader
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
    } else if (/\.(tsx|jsx)$/.test(name.name)) out.push(p);
  }
  return out;
}

function ensureImport(src, names) {
  const want = [...new Set(names)];
  const existing = src.match(/import\s*\{([^}]*)\}\s*from\s*["']@\/components\/ui\/loader["']/);
  if (existing) {
    const have = existing[1].split(",").map((s) => s.trim()).filter(Boolean);
    const merged = [...new Set([...have, ...want])];
    return src.replace(existing[0], `import { ${merged.join(", ")} } from "@/components/ui/loader";`);
  }
  const line = `import { ${want.join(", ")} } from "@/components/ui/loader";`;
  if (/^"use client";/m.test(src)) {
    return src.replace(/^"use client";\s*\n/, `"use client";\n\n${line}\n`);
  }
  if (/^import /m.test(src)) {
    return src.replace(/^(import .+?\n)/, `${line}\n$1`);
  }
  return `${line}\n${src}`;
}

function cleanLucide(src) {
  const withoutImport = src.replace(/import\s*\{[^}]*\}\s*from\s*["']lucide-react["'];?\n?/, "");
  if (/\bLoader2\b/.test(withoutImport)) return src;
  return src.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?\n?/,
    (full, inner) => {
      const parts = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== "Loader2");
      if (!parts.length) return "";
      return `import { ${parts.join(", ")} } from "lucide-react";\n`;
    },
  );
}

const REPLACERS = [
  {
    re: /<div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"\s*\/><\/div>/g,
    to: "<PageLoader />",
    names: ["PageLoader"],
  },
  {
    re: /<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600"\s*\/><\/div>/g,
    to: "<PageLoader />",
    names: ["PageLoader"],
  },
  {
    re: /<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(?:blue|pink)-600"\s*\/><\/div>/g,
    to: "<PageLoader />",
    names: ["PageLoader"],
  },
  {
    re: /fallback=\{\s*<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(?:blue|pink)-600"\s*\/><\/div>\s*\}/g,
    to: "fallback={<PageLoader />}",
    names: ["PageLoader"],
  },
  // Generic div spinners
  {
    re: /<div className="animate-spin rounded-full h-10 w-10 border-2 border-(?:violet|blue|emerald)-200 border-t-(?:violet|blue|emerald)-600"\s*\/>/g,
    to: '<Spinner size="lg" />',
    names: ["Spinner"],
  },
  {
    re: /<div className="animate-spin rounded-full h-8 w-8 border-2 border-(?:violet|blue|emerald)-200 border-t-(?:violet|blue|emerald)-600"\s*\/>/g,
    to: '<Spinner size="lg" />',
    names: ["Spinner"],
  },
  {
    re: /<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(?:blue|pink)-600"\s*\/>/g,
    to: '<Spinner size="lg" />',
    names: ["Spinner"],
  },
  {
    re: /<div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"\s*\/>/g,
    to: '<Spinner size="md" />',
    names: ["Spinner"],
  },
  {
    re: /<div className="h-3\.5 w-3\.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"\s*\/>/g,
    to: '<Spinner size="sm" />',
    names: ["Spinner"],
  },
  {
    re: /<Loader2 className="h-8 w-8 text-blue-600 animate-spin"\s*\/>/g,
    to: '<Spinner size="lg" />',
    names: ["Spinner"],
  },
  {
    re: /<div className="h-10 w-10 animate-spin rounded-full border-2 border-\[#d4dfd9\] border-t-\[#1a6550\]"\s*\/>/g,
    to: '<Spinner size="lg" />',
    names: ["Spinner"],
  },
];

let files = 0;
let count = 0;

for (const file of walk(ROOT)) {
  if (file.includes(`${path.sep}ui${path.sep}loader`)) continue;
  if (file.includes(`${path.sep}route-progress`)) continue;

  let src = fs.readFileSync(file, "utf8");
  const original = src;
  const names = [];

  for (const r of REPLACERS) {
    src = src.replace(r.re, () => {
      names.push(...r.names);
      count += 1;
      return r.to;
    });
  }

  // teacher page template spinner
  src = src.replace(
    /<div className=\{`animate-spin rounded-full h-8 w-8 \$\{tp\.spinner\}`\}\s*\/>/g,
    () => {
      names.push("Spinner");
      count += 1;
      return '<Spinner size="lg" />';
    },
  );

  // wrap lone Spinner in flex center h-48/h-64 → PageLoader
  src = src.replace(
    /<div className="flex (?:items-center )?justify-center(?: items-center)?(?: h-\d+| py-\d+)?(?: items-center)?">\s*<Spinner size="lg"\s*\/>\s*<\/div>/g,
    () => {
      names.push("PageLoader");
      count += 1;
      return "<PageLoader />";
    },
  );

  if (src === original) continue;
  src = ensureImport(src, names);
  src = cleanLucide(src);
  fs.writeFileSync(file, src);
  files += 1;
  console.log("updated", path.relative(process.cwd(), file));
}

console.log(`Done. ${files} files, ${count} replacements.`);
