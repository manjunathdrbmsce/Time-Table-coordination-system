import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get available rooms for a specific day and time slot
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const day = searchParams.get('day')
    const startTime = searchParams.get('startTime')

    if (!day || !startTime) {
      return NextResponse.json(
        { error: 'Day and startTime are required' },
        { status: 400 }
      )
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Get all rooms (both department-owned and shared)
    const allRooms = await db.room.findMany({
      where: {
        OR: [
          { departmentId: user.departmentId }, // Department owned rooms
          { departmentId: null }, // Shared rooms (no specific department)
        ],
      },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        building: {
          select: { id: true, name: true, code: true },
        },
        statistics: {
          select: { utilizationPct: true, occupiedSlots: true, totalSlots: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { logicalName: 'asc' },
      ],
    })

    // Get allocations for this day and time slot
    const occupiedAllocations = await db.allocation.findMany({
      where: {
        day: day,
        startTime: startTime,
      },
      select: {
        roomId: true,
        room: {
          select: {
            id: true,
            logicalName: true,
            actualName: true,
          },
        },
        section: {
          select: {
            year: true,
            division: true,
            department: {
              select: { code: true },
            },
          },
        },
        subject: true,
      },
    })

    // Create a set of occupied room IDs
    const occupiedRoomIds = new Set(
      occupiedAllocations
        .filter(a => a.roomId)
        .map(a => a.roomId!)
    )

    // Also check for pending slot requests for this slot
    const pendingRequests = await db.slotRequest.findMany({
      where: {
        day: day,
        startTime: startTime,
        status: 'PENDING',
      },
      select: {
        roomId: true,
      },
    })

    const pendingRoomIds = new Set(pendingRequests.map(r => r.roomId))

    // Categorize rooms
    const availableClassrooms: typeof allRooms = []
    const availableLabs: typeof allRooms = []
    const occupiedRooms: Array<{
      room: typeof allRooms[0];
      occupiedBy: string;
      subject: string;
    }> = []
    const pendingRooms: typeof allRooms = []

    for (const room of allRooms) {
      if (pendingRoomIds.has(room.id)) {
        pendingRooms.push(room)
      } else if (occupiedRoomIds.has(room.id)) {
        const allocation = occupiedAllocations.find(a => a.roomId === room.id)
        occupiedRooms.push({
          room,
          occupiedBy: allocation ? 
            `${allocation.section.department.code} ${allocation.section.year}${allocation.section.division}` : 
            'Unknown',
          subject: allocation?.subject || '-',
        })
      } else {
        // Room is available
        if (room.type === 'LAB') {
          availableLabs.push(room)
        } else {
          availableClassrooms.push(room)
        }
      }
    }

    return NextResponse.json({
      day,
      startTime,
      availableClassrooms,
      availableLabs,
      occupiedRooms,
      pendingRooms,
      summary: {
        totalRooms: allRooms.length,
        availableClassrooms: availableClassrooms.length,
        availableLabs: availableLabs.length,
        occupied: occupiedRooms.length,
        pending: pendingRooms.length,
      },
    })
  } catch (error) {
    console.error('Error fetching available rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
