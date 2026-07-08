import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const slotRequestSchema = z.object({
  roomId: z.string().min(1),
  sectionId: z.string().min(1),
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  startTime: z.string().min(1), // "Slot 1", "Slot 2", etc.
  endTime: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

// Get slot requests for the current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requests = await db.slotRequest.findMany({
      where: {
        requesterId: session.user.id,
      },
      include: {
        room: {
          include: {
            department: true,
          },
        },
        section: {
          include: {
            department: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching slot requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new slot request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = slotRequestSchema.parse(body)

    // Verify room exists
    const room = await db.room.findUnique({
      where: { id: validatedData.roomId },
      include: { department: true },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Verify section exists and belongs to requester's department
    const section = await db.section.findUnique({
      where: { id: validatedData.sectionId },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Check coordinator owns this section
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      if (user?.departmentId !== section.departmentId) {
        return NextResponse.json(
          { message: 'You can only request slots for your department sections' },
          { status: 403 }
        )
      }
    }

    // Check the slot is actually free
    const existingAllocation = await db.allocation.findFirst({
      where: {
        roomId: validatedData.roomId,
        day: validatedData.day,
        OR: [
          {
            AND: [
              { startTime: { lte: validatedData.startTime } },
              { endTime: { gt: validatedData.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validatedData.endTime } },
              { endTime: { gte: validatedData.endTime } },
            ],
          },
        ],
      },
    })

    if (existingAllocation) {
      return NextResponse.json(
        { message: 'This slot is not available' },
        { status: 409 }
      )
    }

    // Check for duplicate pending request
    const existingRequest = await db.slotRequest.findFirst({
      where: {
        roomId: validatedData.roomId,
        day: validatedData.day,
        startTime: validatedData.startTime,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { message: 'A pending request already exists for this slot' },
        { status: 409 }
      )
    }

    // Create the slot request
    const slotRequest = await db.slotRequest.create({
      data: {
        requesterId: session.user.id,
        roomId: validatedData.roomId,
        sectionId: validatedData.sectionId,
        day: validatedData.day,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        reason: validatedData.reason,
        status: 'PENDING',
      },
      include: {
        room: {
          include: {
            department: true,
          },
        },
        section: {
          include: {
            department: true,
          },
        },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: slotRequest.id,
        details: `Requested ${room.code} on ${validatedData.day} ${validatedData.startTime}-${validatedData.endTime}`,
      },
    })

    return NextResponse.json(slotRequest, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating slot request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
