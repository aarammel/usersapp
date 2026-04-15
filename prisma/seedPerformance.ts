import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { Deleted: false },
    select: { UserID: true, department: true },
  });

  const startDate = new Date("2026-03-01");
  const days = 30;

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const existing = await prisma.userPerformance.findFirst({
        where: { userId: u.UserID, date },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const production = 8 + Math.floor(Math.random() * 18); // 8..25
      await prisma.userPerformance.create({
        data: {
          userId: u.UserID,
          department: u.department,
          date,
          production,
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} records, skipped ${skipped} duplicates across ${users.length} users`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
