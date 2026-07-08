import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing allocation types based on room types...\n');

  // Get all allocations with their room info
  const allocations = await prisma.allocation.findMany({
    include: {
      room: { select: { id: true, code: true, type: true } }
    }
  });

  let fixedCount = 0;

  for (const allocation of allocations) {
    const roomIsLab = allocation.room.type === 'LAB';
    const allocationIsLab = allocation.type === 'LAB';

    // Fix mismatches
    if (roomIsLab && !allocationIsLab) {
      console.log(`Fixing: ${allocation.room.code} - changing type from THEORY to LAB`);
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { type: 'LAB' }
      });
      fixedCount++;
    } else if (!roomIsLab && allocationIsLab) {
      console.log(`Fixing: ${allocation.room.code} - changing type from LAB to THEORY`);
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { type: 'THEORY' }
      });
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} allocations.`);

  // Verify counts after fix
  const theoryCount = await prisma.allocation.count({ where: { type: 'THEORY' } });
  const labCount = await prisma.allocation.count({ where: { type: 'LAB' } });
  console.log(`\nAfter fix:`);
  console.log(`THEORY allocations: ${theoryCount}`);
  console.log(`LAB allocations: ${labCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
