import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const exchangeRequestSchema = z.object({
  sourceAllocationId: z.string().min(1, 'Source allocation is required'),
  targetAllocationId: z.string().min(1, 'Target allocation is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

// GET - Get exchange requests for the current user (outgoing)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requests = await db.exchangeRequest.findMany({
      where: {
        requesterId: session.user.id,
      },
      include: {
        sourceAllocation: {
          include: {
            room: {
              include: { department: true, building: true },
            },
            section: {
              include: { department: true },
            },
            linkedSubject: true,
          },
        },
        targetAllocation: {
          include: {
            room: {
              include: { department: true, building: true },
            },
            section: {
              include: { department: true },
            },
            linkedSubject: true,
          },
        },
        responder: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching exchange requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new exchange request
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
    const validatedData = exchangeRequestSchema.parse(body)

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Verify source allocation exists and belongs to requester's department
    const sourceAllocation = await db.allocation.findUnique({
      where: { id: validatedData.sourceAllocationId },
      include: {
        section: true,
        room: true,
      },
    })

    if (!sourceAllocation) {
      return NextResponse.json({ error: 'Source allocation not found' }, { status: 404 })
    }

    if (sourceAllocation.section.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Source allocation must belong to your department' },
        { status: 403 }
      )
    }

    // Verify target allocation exists and belongs to ANOTHER department
    const targetAllocation = await db.allocation.findUnique({
      where: { id: validatedData.targetAllocationId },
      include: {
        section: {
          include: { department: true },
        },
        room: true,
      },
    })

    if (!targetAllocation) {
      return NextResponse.json({ error: 'Target allocation not found' }, { status: 404 })
    }

    if (targetAllocation.section.departmentId === user.departmentId) {
      return NextResponse.json(
        { error: 'Cannot exchange with your own department' },
        { status: 400 }
      )
    }

    // Verify both allocations are for the same day and time
    if (sourceAllocation.day !== targetAllocation.day || 
        sourceAllocation.startTime !== targetAllocation.startTime) {
      return NextResponse.json(
        { error: 'Allocations must be for the same day and time slot' },
        { status: 400 }
      )
    }

    // Check if there's already a pending exchange request involving either allocation
    const existingRequest = await db.exchangeRequest.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { sourceAllocationId: validatedData.sourceAllocationId },
          { targetAllocationId: validatedData.sourceAllocationId },
          { sourceAllocationId: validatedData.targetAllocationId },
          { targetAllocationId: validatedData.targetAllocationId },
        ],
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A pending exchange request already exists for one of these allocations' },
        { status: 409 }
      )
    }

    // Create the exchange request
    const exchangeRequest = await db.exchangeRequest.create({
      data: {
        requesterId: session.user.id,
        sourceAllocationId: validatedData.sourceAllocationId,
        targetAllocationId: validatedData.targetAllocationId,
        reason: validatedData.reason,
        status: 'PENDING',
      },
      include: {
        sourceAllocation: {
          include: {
            room: { include: { department: true } },
            section: { include: { department: true } },
          },
        },
        targetAllocation: {
          include: {
            room: { include: { department: true } },
            section: { include: { department: true } },
          },
        },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_EXCHANGE_REQUEST',
        entityType: 'ExchangeRequest',
        entityId: exchangeRequest.id,
        details: `Requested exchange: ${sourceAllocation.room.code} ↔ ${targetAllocation.room.code} on ${sourceAllocation.day} ${sourceAllocation.startTime}`,
      },
    })

    return NextResponse.json(exchangeRequest, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating exchange request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
