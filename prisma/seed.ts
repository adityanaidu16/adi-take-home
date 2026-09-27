import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.mockLedger.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.featureFlag.deleteMany();

  await prisma.refundRequest.createMany({
    data: [
      {
        customerName: "Ada Whitfield",
        amount: 1200,
        currency: "USD",
        reason: "Duplicate charge",
        bankAccount: "GB29NWBK60161331926819",
      },
      {
        customerName: "Bruno Salas",
        amount: 240,
        currency: "USD",
        reason: "Cancelled subscription",
        bankAccount: "GB33BUKB20201555555555",
      },
      {
        customerName: "Chen Wei",
        amount: 640,
        currency: "USD",
        reason: "Failed transfer",
        bankAccount: "GB94BARC10201530093459",
      },
    ],
  });

  await prisma.featureFlag.createMany({
    data: [
      {
        key: "instant_payouts",
        description: "Instant payouts for verified merchants",
        environment: "production",
        enabled: false,
      },
      {
        key: "new_kyc_flow",
        description: "New KYC onboarding flow",
        environment: "staging",
        enabled: true,
      },
      {
        key: "risk_scoring_v2",
        description: "Risk scoring model v2",
        environment: "production",
        enabled: true,
      },
    ],
  });

  console.log("Seeded fake refunds and feature flags.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
