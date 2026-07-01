/**
 * One-time: switch Prisma schema from SQLite to MySQL (Hostinger / Vercel).
 * Run: npm run db:switch-mysql
 * Then set DB_PROVIDER=mysql and Hostinger creds in .env
 */
import fs from "fs";
import path from "path";

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes('provider = "mysql"')) {
  console.log("Schema already uses MySQL provider.");
  process.exit(0);
}

schema = schema.replace('provider = "sqlite"', 'provider = "mysql"');

const textFields: [string, string][] = [
 ["  body       String", "  body       String   @db.Text"],
 ["  currentAddress     String", "  currentAddress     String   @db.Text"],
 ["  permanentAddress   String", "  permanentAddress   String   @db.Text"],
 ["  lastAutomationLog   String?", "  lastAutomationLog   String?  @db.Text"],
 ["  notes            String?", "  notes            String?  @db.Text"],
 ["  validationErrors String?", "  validationErrors String?  @db.Text"],
 ["  studentIds  String\n  results", "  studentIds  String   @db.Text\n  results"],
 ["  results     String?", "  results     String?  @db.Text"],
 ["  studentIds      String\n  currentIndex", "  studentIds      String    @db.Text\n  currentIndex"],
 ["  logs            String?", "  logs            String?   @db.Text"],
 ["  studentProgress String?", "  studentProgress String?   @db.Text"],
];

for (const [from, to] of textFields) {
  schema = schema.replace(from, to);
}

fs.writeFileSync(schemaPath, schema);
console.log("✓ prisma/schema.prisma → MySQL provider");
console.log("Next: set DB_PROVIDER=mysql + Hostinger creds in .env, then: npx prisma db push");
