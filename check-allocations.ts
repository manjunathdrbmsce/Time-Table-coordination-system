import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check CSE sections
  const sections = await prisma.section.findMany({
    where: { department: { code: 'CSE' } },
    include: { 
      allocations: true, 
      department: true 
    }
  });

  console.log('=== CSE SECTION ALLOCATIONS ===');
  sections.forEach(s => {
    const theory = s.allocations.filter(a => a.type === 'THEORY').length;
    const lab = s.allocations.filter(a => a.type === 'LAB').length;
    console.log(`${s.department.code} ${s.year}${s.division}: Theory=${theory}/${s.requiredTheoryHours}, Lab=${lab}/${s.requiredLabHours}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
