import type { PrismaClient } from "@/generated/prisma/client";

/** Phone bridge / SMS Forwarder se OTP save + running job ko turant OTP do */
export async function pushOtpToSchool(
  prisma: PrismaClient,
  schoolId: string,
  otp: string,
  sender: string | null,
  body: string
) {
  await prisma.smsInboxMessage.create({
    data: {
      schoolId,
      sender,
      body: body.slice(0, 2000),
      otpCode: otp,
      consumed: false,
    },
  });

  const activeJob = await prisma.automationJob.findFirst({
    where: { schoolId, status: { in: ["pending", "running"] } },
    orderBy: { createdAt: "desc" },
  });
  if (activeJob) {
    await prisma.automationJob.update({
      where: { id: activeJob.id },
      data: { otpCode: otp },
    });
  }
}
