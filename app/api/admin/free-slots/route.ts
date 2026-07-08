import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Slot period definitions
const SLOT_PERIODS = {
  morning: {
    label: 'ðŸŒ… Morning',
    slots: ['Slot 1', 'Slot 2', 'Slot 3'],
    time: '8:00 AM - 10:45 AM'
  },
  midday: {
    label: 'â˜€ï¸ Midday',
    slots: ['Slot 4', 'Slot 5'],
    time: '11:15 AM - 12:45 PM'
  },
  afternoon: {
    label: 'ðŸŒ† Afternoon',
    slots: ['Slot 6', 'Slot 7', 'Slot 8'],
    time: '1:00 PM - 4:45 PM'
  }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ALL_SLOTS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Slot 6', 'Slot 7', 'Slot 8']

const SLOT_TIME_MAP: Record<string, string> = {
  'Slot 1': '8:00-8:55',
  'Slot 2': '8:55-9:50',
  'Slot 3': '9:50-10:45',
  'Slot 4': '11:15-12:10',
  'Slot 5': '12:10-1:05',
  'Slot 6': '1:05-2:00 / 2:00-2:55',
  'Slot 7': '2:50-3:50',
  'Slot 8': '3:50-4:45',
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'HOD', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const buildingId = searchParams.get('buildingId')
    const roomType = searchParams.get('roomType')
    const departmentId = searchParams.get('departmentId') || session.user.departmentId

    // Get active session
    const activeSession = await db.academicSession.findFirst({
      where: { isActive: true },
    })

    if (!activeSession) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Build room filter
    const roomFilter: Record<string, unknown> = {}
    if (roomId) {
      roomFilter.id = roomId
    }
    if (buildingId) {
      roomFilter.buildingId = buildingId
    }
    if (roomType) {
      roomFilter.type = roomType
    }
    if (departmentId && departmentId !== 'all') {
      roomFilter.departmentId = departmentId
    }

    // Get rooms
    const rooms = await db.room.findMany({
      where: roomFilter,
      include: {
        building: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
      orderBy: [
        { building: { name: 'asc' } },
        { code: 'asc' },
      ],
    })

    // Get all real allocations for these rooms in active session
    const roomIds = rooms.map(r => r.id)
    const allocations = await db.allocation.findMany({
      where: {
        roomId: { in: roomIds },
        sessionId: activeSession.id,
        // Exclude slots marked as FREE (cleared by coordinator)
        allocationType: { not: 'FREE' },
        // Exclude cleared/placeholder subjects
        NOT: {
          subject: { in: ['-', ''] },
        },
      },
      select: {
        roomId: true,
        day: true,
        startTime: true,
        subject: true,
        faculty: true,
        type: true,
        section: {
          select: {
            year: true,
            division: true,
            semester: { select: { code: true } },
            department: { select: { code: true } },
          },
        },
      },
    })

    // Build free slots map
    const freeSlots: Record<string, Record<string, {
      morning: { slot: string; isFree: boolean; occupiedBy?: string }[];
      midday: { slot: string; isFree: boolean; occupiedBy?: string }[];
      afternoon: { slot: string; isFree: boolean; occupiedBy?: string }[];
    }>> = {}

    // Initialize all rooms with all slots as free
    rooms.forEach(room => {
      freeSlots[room.id] = {}
      DAYS.forEach(day => {
        freeSlots[room.id][day] = {
          morning: SLOT_PERIODS.morning.slots.map(slot => ({ slot, isFree: true })),
          midday: SLOT_PERIODS.midday.slots.map(slot => ({ slot, isFree: true })),
          afternoon: SLOT_PERIODS.afternoon.slots.map(slot => ({ slot, isFree: true })),
        }
      })
    })

    // Mark occupied slots
    allocations.forEach(alloc => {
      const roomSlots = freeSlots[alloc.roomId]
      if (!roomSlots) return

      const daySlots = roomSlots[alloc.day]
      if (!daySlots) return

      const sectionLabel = alloc.section
        ? `${alloc.section.department?.code || ''} ${alloc.section.semester?.code || ''}-${alloc.section.year}${alloc.section.division}`
        : ''
      const facultyLabel = alloc.faculty ? ` [${alloc.faculty}]` : ''
      const occupiedBy = `${alloc.subject || ''}${facultyLabel} (${sectionLabel})`

      // Find which period this slot belongs to
      for (const period of ['morning', 'midday', 'afternoon'] as const) {
        const slotInfo = daySlots[period].find(s => s.slot === alloc.startTime)
        if (slotInfo) {
          slotInfo.isFree = false
          slotInfo.occupiedBy = occupiedBy
          break
        }
      }
    })

    // Calculate statistics per room
    const roomStats = rooms.map(room => {
      const roomData = freeSlots[room.id]
      let totalSlots = 0
      let freeCount = 0
      let morningFree = 0
      let middayFree = 0
      let afternoonFree = 0

      DAYS.forEach(day => {
        const dayData = roomData[day]
        dayData.morning.forEach(s => {
          totalSlots++
          if (s.isFree) { freeCount++; morningFree++ }
        })
        dayData.midday.forEach(s => {
          totalSlots++
          if (s.isFree) { freeCount++; middayFree++ }
        })
        dayData.afternoon.forEach(s => {
          totalSlots++
          if (s.isFree) { freeCount++; afternoonFree++ }
        })
      })

      return {
        room: {
          id: room.id,
          code: room.code,
          name: room.actualName || room.code,
          type: room.type,
          capacity: room.capacity,
          building: room.building?.name || '',
          buildingCode: room.building?.code || '',
          department: room.department?.name || '',
          departmentCode: room.department?.code || '',
        },
        stats: {
          totalSlots,
          freeSlots: freeCount,
          occupiedSlots: totalSlots - freeCount,
          utilization: totalSlots > 0 ? Math.round(((totalSlots - freeCount) / totalSlots) * 100) : 0,
          morningFree,
          middayFree,
          afternoonFree,
        },
        slots: roomData,
      }
    })

    // Get buildings for filter
    const buildings = await db.building.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      rooms: roomStats,
      buildings,
      slotPeriods: SLOT_PERIODS,
      slotTimeMap: SLOT_TIME_MAP,
      days: DAYS,
      session: {
        id: activeSession.id,
        name: activeSession.name,
      },
    })
  } catch (error) {
    console.error('Error fetching free slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch free slots' },
      { status: 500 }
    )
  }
}
