import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Recalculate all room and section statistics
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, fix allocation types based on room types
    // Get all allocations with their room info
    const allocations = await db.allocation.findMany({
      include: {
        room: { select: { id: true, type: true } }
      }
    })

    let fixedAllocations = 0
    for (const allocation of allocations) {
      const roomIsLab = allocation.room.type === 'LAB'
      const allocationIsLab = allocation.type === 'LAB'
      
      // Fix mismatches: if room is LAB, allocation should be LAB, and vice versa
      if (roomIsLab && !allocationIsLab) {
        await db.allocation.update({
          where: { id: allocation.id },
          data: { type: 'LAB' }
        })
        fixedAllocations++
      } else if (!roomIsLab && allocationIsLab) {
        await db.allocation.update({
          where: { id: allocation.id },
          data: { type: 'THEORY' }
        })
        fixedAllocations++
      }
    }

    // Recalculate room statistics
    const rooms = await db.room.findMany({
      include: {
        allocations: true,
      },
    })

    for (const room of rooms) {
      const totalSlots = 48 // 8 slots × 6 days
      const occupiedSlots = room.allocations.length
      const freeSlots = Math.max(0, totalSlots - occupiedSlots)
      const utilizationPct = Math.round((occupiedSlots / totalSlots) * 100)

      await db.roomStats.upsert({
        where: { roomId: room.id },
        update: {
          totalSlots,
          occupiedSlots,
          freeSlots,
          utilizationPct,
          lastUpdated: new Date(),
        },
        create: {
          roomId: room.id,
          totalSlots,
          occupiedSlots,
          freeSlots,
          utilizationPct,
        },
      })
    }

    // Recalculate department statistics
    const departments = await db.department.findMany({
      include: {
        sections: {
          include: {
            allocations: true,
          },
        },
        rooms: true,
      },
    })

    for (const dept of departments) {
      const totalSections = dept.sections.length
      const totalRooms = dept.rooms.length
      
      // Calculate total required hours and allocated hours
      let totalRequired = 0
      let totalAllocated = 0
      
      for (const section of dept.sections) {
        totalRequired += section.requiredTheoryHours + section.requiredLabHours
        totalAllocated += section.allocations.length
      }
      
      const allocationPercent = totalRequired > 0 
        ? Math.round((totalAllocated / totalRequired) * 100)
        : 0

      await db.departmentStats.upsert({
        where: { departmentId: dept.id },
        update: {
          totalSections,
          totalRooms,
          allocationPercent,
          lastUpdated: new Date(),
        },
        create: {
          departmentId: dept.id,
          totalSections,
          totalRooms,
          allocationPercent,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Statistics recalculated successfully. Fixed ${fixedAllocations} allocation types.`,
      fixedAllocations,
      rooms: rooms.length,
      departments: departments.length,
    })
  } catch (error) {
    console.error('Error recalculating statistics:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate statistics' },
      { status: 500 }
    )
  }
}
