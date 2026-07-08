import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateRequestSchema = z.object({
  roomId: z.string().min(1).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').optional(),
})

// Get a single slot request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await params

    const slotRequest = await db.slotRequest.findUnique({
      where: { id: requestId },
      include: {
        room: {
          include: {
            department: true,
            building: true,
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
    })

    if (!slotRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only owner or admin can view
    if (slotRequest.requesterId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(slotRequest)
  } catch (error) {
    console.error('Error fetching slot request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a slot request (only if PENDING)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await params
    const body = await request.json()
    const validatedData = updateRequestSchema.parse(body)

    // Find the existing request
    const existingRequest = await db.slotRequest.findUnique({
      where: { id: requestId },
      include: {
        room: true,
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only owner can update
    if (existingRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only update PENDING requests
    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only edit pending requests' },
        { status: 400 }
      )
    }

    // If changing room, validate the new room
    if (validatedData.roomId && validatedData.roomId !== existingRequest.roomId) {
      const newRoom = await db.room.findUnique({
        where: { id: validatedData.roomId },
      })

      if (!newRoom) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      }

      // Check the slot is still available for the new room
      const existingAllocation = await db.allocation.findFirst({
        where: {
          roomId: validatedData.roomId,
          day: existingRequest.day,
          OR: [
            {
              AND: [
                { startTime: { lte: existingRequest.startTime } },
                { endTime: { gt: existingRequest.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: existingRequest.endTime } },
                { endTime: { gte: existingRequest.endTime } },
              ],
            },
          ],
        },
      })

      if (existingAllocation) {
        return NextResponse.json(
          { error: 'This slot is not available for the selected room' },
          { status: 409 }
        )
      }

      // Check for other pending requests for this slot (excluding current)
      const otherPendingRequest = await db.slotRequest.findFirst({
        where: {
          id: { not: requestId },
          roomId: validatedData.roomId,
          day: existingRequest.day,
          startTime: existingRequest.startTime,
          status: 'PENDING',
        },
      })

      if (otherPendingRequest) {
        return NextResponse.json(
          { error: 'Another pending request exists for this slot' },
          { status: 409 }
        )
      }

      // Delete existing approvals when room changes
      await db.approval.deleteMany({
        where: { slotRequestId: requestId },
      })
    }

    // Update the request
    const updatedRequest = await db.slotRequest.update({
      where: { id: requestId },
      data: {
        ...(validatedData.roomId && { roomId: validatedData.roomId }),
        ...(validatedData.reason && { reason: validatedData.reason }),
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
        action: 'UPDATE_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: updatedRequest.id,
        details: `Updated request for ${existingRequest.day} ${existingRequest.startTime}`,
      },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating slot request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a slot request (only if PENDING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await params

    // Find the existing request
    const existingRequest = await db.slotRequest.findUnique({
      where: { id: requestId },
      include: {
        room: true,
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (existingRequest.requesterId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only delete PENDING requests
    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending requests' },
        { status: 400 }
      )
    }

    // Delete the request (approvals will cascade delete)
    await db.slotRequest.delete({
      where: { id: requestId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: requestId,
        details: `Deleted request for ${existingRequest.room.code} on ${existingRequest.day} ${existingRequest.startTime}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting slot request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
