import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get rooms occupied by OTHER departments for a specific day and time slot
// This is used for exchange requests - shows what rooms can be exchanged
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
    const excludeAllocationId = searchParams.get('excludeAllocationId') // Current allocation to exclude

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

    // Get allocations from OTHER departments for this day/time
    const occupiedAllocations = await db.allocation.findMany({
      where: {
        day: day,
        startTime: startTime,
        // Exclude the current allocation if provided
        ...(excludeAllocationId && { id: { not: excludeAllocationId } }),
        // Only get allocations from OTHER departments
        section: {
          departmentId: { not: user.departmentId },
        },
      },
      include: {
        room: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
            building: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        section: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        linkedSubject: {
          select: { code: true, name: true, shortName: true },
        },
      },
      orderBy: [
        { room: { type: 'asc' } },
        { room: { logicalName: 'asc' } },
      ],
    })

    // Check for pending exchange requests on these allocations
    const allocationIds = occupiedAllocations.map(a => a.id)
    const pendingExchanges = await db.exchangeRequest.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { sourceAllocationId: { in: allocationIds } },
          { targetAllocationId: { in: allocationIds } },
        ],
      },
      select: {
        sourceAllocationId: true,
        targetAllocationId: true,
      },
    })

    // Create a set of allocation IDs that have pending exchange requests
    const pendingAllocationIds = new Set<string>()
    pendingExchanges.forEach(ex => {
      pendingAllocationIds.add(ex.sourceAllocationId)
      pendingAllocationIds.add(ex.targetAllocationId)
    })

    // Categorize allocations
    const availableForExchange: typeof occupiedAllocations = []
    const pendingExchangeAllocations: typeof occupiedAllocations = []

    for (const allocation of occupiedAllocations) {
      if (pendingAllocationIds.has(allocation.id)) {
        pendingExchangeAllocations.push(allocation)
      } else {
        availableForExchange.push(allocation)
      }
    }

    // Format the response
    const formatAllocation = (allocation: typeof occupiedAllocations[0]) => ({
      id: allocation.id,
      day: allocation.day,
      startTime: allocation.startTime,
      endTime: allocation.endTime,
      subject: allocation.linkedSubject?.shortName || allocation.linkedSubject?.code || allocation.subject,
      faculty: allocation.faculty,
      type: allocation.type,
      room: {
        id: allocation.room.id,
        code: allocation.room.code,
        logicalName: allocation.room.logicalName,
        actualName: allocation.room.actualName,
        type: allocation.room.type,
        capacity: allocation.room.capacity,
        department: allocation.room.department,
        building: allocation.room.building,
      },
      section: {
        id: allocation.section.id,
        year: allocation.section.year,
        division: allocation.section.division,
        department: allocation.section.department,
      },
    })

    return NextResponse.json({
      day,
      startTime,
      availableForExchange: availableForExchange.map(formatAllocation),
      pendingExchange: pendingExchangeAllocations.map(formatAllocation),
      summary: {
        total: occupiedAllocations.length,
        available: availableForExchange.length,
        pending: pendingExchangeAllocations.length,
      },
    })
  } catch (error) {
    console.error('Error fetching occupied rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
