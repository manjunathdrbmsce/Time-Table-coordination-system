import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find room C208
  const room = await prisma.room.findFirst({
    where: { actualName: "C208" },
    include: {
      allocations: {
        include: {
          section: {
            include: { department: true }
          }
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      }
    }
  });

  if (!room) {
    console.log("Room C208 not found");
    return;
  }

  console.log(`Room: ${room.code} (${room.actualName})`);
  console.log(`Total allocations: ${room.allocations.length}`);
  console.log("\n--- Allocations ---");
  
  room.allocations.forEach((a) => {
    console.log(`${a.day} | ${a.startTime} | ${a.section.department.code}-${a.section.year}${a.section.division} | ${a.subject}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
