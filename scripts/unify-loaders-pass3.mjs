/**
 * Pass 3 — replace remaining lucide Loader2 spinners with unified Spinner
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

function ensureSpinnerImport(src) {
  const existing = src.match(/import\s*\{([^}]*)\}\s*from\s*["']@\/components\/ui\/loader["']/);
  if (existing) {
    const have = existing[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (have.includes("Spinner")) return src;
    return src.replace(existing[0], `import { ${[...have, "Spinner"].join(", ")} } from "@/components/ui/loader";`);
  }
  const line = `import { Spinner } from "@/components/ui/loader";`;
  if (/^"use client";/m.test(src)) {
    return src.replace(/^"use client";\s*\n/, `"use client";\n\n${line}\n`);
  }
  if (/^import /m.test(src)) {
    return src.replace(/^(import .+?\n)/, `${line}\n$1`);
  }
  return `${line}\n${src}`;
}

function cleanLucide(src) {
  const without = src.replace(/import\s*\{[^}]*\}\s*from\s*["']lucide-react["'];?\n?/, "");
  if (/\bLoader2\b/.test(without)) return src;
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

const RULES = [
  { re: /<Loader2 className="h-12 w-12 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="xl" />' },
  { re: /<Loader2 className="absolute inset-0 m-auto h-12 w-12 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="xl" className="absolute inset-0 m-auto" />' },
  { re: /<Loader2 className="h-6 w-6 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="md" />' },
  { re: /<Loader2 className="h-5 w-5 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="md" />' },
  { re: /<Loader2 className="h-4 w-4 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="sm" />' },
  { re: /<Loader2 className="h-3\.5 w-3\.5 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="sm" />' },
  { re: /<Loader2 className="h-3 w-3 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="sm" />' },
  { re: /<Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="sm" className="mt-1 shrink-0" />' },
  { re: /<Loader2 className="h-4 w-4 shrink-0 animate-spin[^"]*"\s*\/>/g, to: '<Spinner size="sm" className="shrink-0" />' },
  { re: /<Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0"\s*\/>/g, to: '<Spinner size="sm" className="shrink-0" />' },
  { re: /<Loader2 className="absolute inset-0 m-auto h-12 w-12 animate-spin text-violet-600"\s*\/>/g, to: '<Spinner size="xl" className="absolute inset-0 m-auto" />' },
  { re: /<Loader2 className="auth-portal-spinner"\s*\/>/g, to: '<Spinner size="sm" className="auth-portal-spinner" />' },
];

let files = 0;
let count = 0;

for (const file of walk(ROOT)) {
  if (file.includes(`${path.sep}ui${path.sep}loader`)) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("Loader2")) continue;
  const original = src;
  let touched = false;

  for (const r of RULES) {
    const next = src.replace(r.re, () => {
      touched = true;
      count += 1;
      return r.to;
    });
    src = next;
  }

  // leftover generic Loader2 with animate-spin
  src = src.replace(/<Loader2\s+className="([^"]*animate-spin[^"]*)"\s*\/>/g, (_, cls) => {
    touched = true;
    count += 1;
    const size = /h-12|w-12/.test(cls) ? "xl" : /h-8|w-8|h-6|w-6/.test(cls) ? "md" : "sm";
    const extra = cls
      .replace(/h-[\d.]+/g, "")
      .replace(/w-[\d.]+/g, "")
      .replace(/animate-spin/g, "")
      .replace(/text-\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return extra
      ? `<Spinner size="${size}" className="${extra}" />`
      : `<Spinner size="${size}" />`;
  });

  if (!touched && src === original) continue;
  src = ensureSpinnerImport(src);
  src = cleanLucide(src);
  fs.writeFileSync(file, src);
  files += 1;
  console.log("updated", path.relative(process.cwd(), file));
}

console.log(`Done. ${files} files, ${count} replacements.`);
