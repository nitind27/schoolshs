import { prisma } from "../src/lib/db";
import { verifyPassword } from "../src/lib/auth";
import { getSchoolEnabledFeatures } from "../src/lib/school-feature-access";

async function main() {
  const u = await prisma.user.findUnique({ where: { email: "ca@songadh.local" } });
  console.log("user:", u?.email, u?.role, "verified:", u?.emailVerified);
  console.log("password ok:", u ? verifyPassword("CA@12345", u.passwordHash) : false);

  const school = await prisma.school.findFirst({
    where: { code: "24261004405" },
    include: { subscription: true },
  });
  console.log("school:", school?.code, school?.isActive);
  console.log("sub:", school?.subscription?.planName, school?.subscription?.paymentStatus);
  console.log("enabledFeatures raw:", school?.subscription?.enabledFeatures);

  if (school) {
    const features = await getSchoolEnabledFeatures(school.id);
    console.log("portal_ca enabled:", features.includes("portal_ca"));
    console.log("features count:", features.length);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
