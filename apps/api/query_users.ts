import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Querying users in the database...");
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  for (const u of users) {
    console.log(`- Email: ${u.email}`);
    console.log(`  Full Name: ${u.fullName}`);
    console.log(`  Roles: ${u.userRoles.map((ur: any) => ur.role.name).join(", ")}`);
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
