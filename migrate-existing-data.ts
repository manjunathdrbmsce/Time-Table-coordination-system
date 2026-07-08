// Migration script to map existing data to default Building and Academic Session
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' migrate-existing-data.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration...\n')

  // 1. Create default Building - PJ Block
  console.log('1. Creating PJ Block building...')
  const building = await prisma.building.upsert({
    where: { code: 'PJ-BLOCK' },
    update: {},
    create: {
      name: 'PJ Block',
      code: 'PJ-BLOCK',
      address: 'Main Campus',
      floors: 5,
    },
  })
  console.log(`   ✓ Building created: ${building.name} (${building.id})`)

  // 2. Create default Academic Session - 2025-26 EVEN
  console.log('\n2. Creating 2025-26 EVEN academic session...')
  const session = await prisma.academicSession.upsert({
    where: {
      academicYear_semesterType: {
        academicYear: '2025-26',
        semesterType: 'EVEN',
      },
    },
    update: { isActive: true },
    create: {
      name: '2025-26 Even Semester',
      academicYear: '2025-26',
      semesterType: 'EVEN',
      isActive: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-05-31'),
    },
  })
  console.log(`   ✓ Session created: ${session.name} (${session.id})`)

  // 3. Update all rooms to belong to PJ Block
  console.log('\n3. Assigning all rooms to PJ Block...')
  const roomsUpdate = await prisma.room.updateMany({
    where: { buildingId: null },
    data: { buildingId: building.id },
  })
  console.log(`   ✓ Updated ${roomsUpdate.count} rooms`)

  // 4. Update all sections to belong to the session
  console.log('\n4. Assigning all sections to 2025-26 EVEN session...')
  const sectionsUpdate = await prisma.section.updateMany({
    where: { sessionId: null },
    data: { sessionId: session.id },
  })
  console.log(`   ✓ Updated ${sectionsUpdate.count} sections`)

  // 5. Update all allocations to belong to the session
  console.log('\n5. Assigning all allocations to 2025-26 EVEN session...')
  const allocationsUpdate = await prisma.allocation.updateMany({
    where: { sessionId: null },
    data: { sessionId: session.id },
  })
  console.log(`   ✓ Updated ${allocationsUpdate.count} allocations`)

  // 6. Update all slot requests to belong to the session
  console.log('\n6. Assigning all slot requests to 2025-26 EVEN session...')
  const requestsUpdate = await prisma.slotRequest.updateMany({
    where: { sessionId: null },
    data: { sessionId: session.id },
  })
  console.log(`   ✓ Updated ${requestsUpdate.count} slot requests`)

  // 7. Update all timetable uploads to belong to the session
  console.log('\n7. Assigning all timetable uploads to 2025-26 EVEN session...')
  const uploadsUpdate = await prisma.timetableUpload.updateMany({
    where: { sessionId: null },
    data: { sessionId: session.id },
  })
  console.log(`   ✓ Updated ${uploadsUpdate.count} uploads`)

  // Summary
  console.log('\n========================================')
  console.log('Migration completed successfully!')
  console.log('========================================')
  console.log(`Building: ${building.name} (${building.code})`)
  console.log(`Session: ${session.name} (Active: ${session.isActive})`)
  console.log(`Rooms assigned: ${roomsUpdate.count}`)
  console.log(`Sections assigned: ${sectionsUpdate.count}`)
  console.log(`Allocations assigned: ${allocationsUpdate.count}`)
  console.log(`Slot requests assigned: ${requestsUpdate.count}`)
  console.log(`Uploads assigned: ${uploadsUpdate.count}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
