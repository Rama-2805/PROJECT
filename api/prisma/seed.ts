import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SmartCampus AI database...");

  // Create roles
  const roles = [
    { name: "SUPER_ADMIN", label: "Super Admin" },
    { name: "INSTITUTION_ADMIN", label: "Institution Admin" },
    { name: "TEACHER", label: "Teacher" },
    { name: "DEVICE_MANAGER", label: "Device Manager" },
    { name: "RESEARCH_ANALYST", label: "Research Analyst" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { label: role.label },
      create: role,
    });
  }

  console.log("✅ Roles seeded successfully");
  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
