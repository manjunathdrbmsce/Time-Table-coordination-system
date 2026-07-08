import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const allocationSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  subject: z.string().min(1),
  faculty: z.string().min(1),
  type: z.enum(['THEORY', 'LAB']),
  roomId: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sectionId } = await params
    const body = await request.json()
    
    const validatedData = allocationSchema.parse(body)

    // Verify section exists and coordinator has access
    const section = await db.section.findUnique({
      where: { id: sectionId },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      if (user?.departmentId !== section.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Verify room exists
    const room = await db.room.findUnique({
      where: { id: validatedData.roomId },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check for conflicts - same room, same time
    const roomConflict = await db.allocation.findFirst({
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
          {
            AND: [
              { startTime: { gte: validatedData.startTime } },
              { endTime: { lte: validatedData.endTime } },
            ],
          },
        ],
      },
    })

    if (roomConflict) {
      return NextResponse.json(
        { message: 'Room is already booked for this time slot' },
        { status: 409 }
      )
    }

    // Check for section conflicts - same section, same time
    const sectionConflict = await db.allocation.findFirst({
      where: {
        sectionId,
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
          {
            AND: [
              { startTime: { gte: validatedData.startTime } },
              { endTime: { lte: validatedData.endTime } },
            ],
          },
        ],
      },
    })

    if (sectionConflict) {
      return NextResponse.json(
        { message: 'Section already has a class at this time' },
        { status: 409 }
      )
    }

    // Create the allocation
    // Note: isModified should be false for normal allocations
    // It should only be true for slot requests from other departments (set in approvals route)
    const allocation = await db.allocation.create({
      data: {
        sectionId,
        roomId: validatedData.roomId,
        day: validatedData.day,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        subject: validatedData.subject,
        faculty: validatedData.faculty,
        type: validatedData.type,
        isModified: false,
      },
      include: {
        room: true,
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
        action: 'CREATE_ALLOCATION',
        entityType: 'Allocation',
        entityId: allocation.id,
        details: `Created allocation for ${validatedData.subject} on ${validatedData.day} ${validatedData.startTime}-${validatedData.endTime}`,
      },
    })

    return NextResponse.json(allocation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
