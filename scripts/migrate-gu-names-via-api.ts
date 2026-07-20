/**
 * Add Gujarati name columns + backfill (uses dev server DB pool)
 * Run: npm run db:migrate-gu-names
 */
const BASE = process.env.APP_URL || "http://localhost:3000";

async function main() {
  console.log(`POST ${BASE}/api/dev/migrate-gu-names\n`);

  const res = await fetch(`${BASE}/api/dev/migrate-gu-names`, { method: "POST" });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 500));
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
