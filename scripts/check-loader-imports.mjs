import fs from "node:fs";
import path from "node:path";

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) {
      if (n.name === "node_modules" || n.name === "generated") continue;
      walk(p, out);
    } else if (/\.tsx$/.test(n.name)) out.push(p);
  }
  return out;
}

const issues = [];
for (const f of walk("src")) {
  const s = fs.readFileSync(f, "utf8");
  if (/import\s*\{\s*\}\s*from\s*["']lucide-react["']/.test(s)) {
    issues.push(`empty lucide: ${f}`);
  }
  const imports = [...s.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@\/components\/ui\/loader["']/g)];
  if (imports.length > 1) issues.push(`dup loader import: ${f}`);
  // use client must be first
  if (s.includes('"use client"') && !/^(?:\/\*[\s\S]*?\*\/\s*)?"use client";/.test(s.trimStart())) {
    const idx = s.indexOf('"use client"');
    if (idx > 0 && s.slice(0, idx).includes("import ")) {
      issues.push(`use client not first: ${f}`);
    }
  }
  // Spinner/PageLoader used but not imported
  if (/\bPageLoader\b/.test(s) && !s.includes("@/components/ui/loader") && !f.includes("loader.tsx") && !f.includes("route-progress") && !f.includes("loading.tsx")) {
    issues.push(`PageLoader missing import: ${f}`);
  }
  if (/\bSpinner\b/.test(s) && !s.includes("@/components/ui/loader") && !f.includes("loader.tsx") && !f.includes("button.tsx") && !f.includes("route-progress")) {
    issues.push(`Spinner missing import: ${f}`);
  }
}
console.log(issues.length ? issues.join("\n") : "ok — no structural issues");
