/**
 * Seed via running dev server API (uses existing DB pool — good for remote MySQL)
 * Run: npm run db:seed-via-api
 */
const BASE = process.env.APP_URL || "http://localhost:3000";

async function main() {
  console.log(`POST ${BASE}/api/seed/full-school\n`);

  const seedRes = await fetch(`${BASE}/api/seed/full-school`, { method: "POST" });
  const text = await seedRes.text();
  let seedJson: Record<string, unknown>;
  try {
    seedJson = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 500));
    process.exit(1);
  }
  if (!seedRes.ok) {
    console.error("Seed failed:", seedJson.error || seedRes.status);
    process.exit(1);
  }

  console.log("✓ Seed complete\n");
  console.log(JSON.stringify(seedJson, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
