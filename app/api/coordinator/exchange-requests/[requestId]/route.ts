import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const responseSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
})

// GET - Get a single exchange request
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

    const exchangeRequest = await db.exchangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        responder: {
          select: { id: true, name: true, email: true },
        },
        sourceAllocation: {
          include: {
            room: { include: { department: true, building: true } },
            section: { include: { department: true } },
            linkedSubject: true,
          },
        },
        targetAllocation: {
          include: {
            room: { include: { department: true, building: true } },
            section: { include: { department: true } },
            linkedSubject: true,
          },
        },
      },
    })

    if (!exchangeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json(exchangeRequest)
  } catch (error) {
    console.error('Error fetching exchange request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Approve or reject an exchange request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { requestId } = await params
    const body = await request.json()
    const validatedData = responseSchema.parse(body)

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Get the exchange request
    const exchangeRequest = await db.exchangeRequest.findUnique({
      where: { id: requestId },
      include: {
        sourceAllocation: {
          include: {
            room: true,
            section: { include: { department: true } },
          },
        },
        targetAllocation: {
          include: {
            room: true,
            section: { include: { department: true } },
          },
        },
      },
    })

    if (!exchangeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (exchangeRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    // Verify the responder is from the target department
    if (session.user.role !== 'ADMIN') {
      if (exchangeRequest.targetAllocation.section.departmentId !== user!.departmentId) {
        return NextResponse.json(
          { error: 'Only the target department can respond to this request' },
          { status: 403 }
        )
      }
    }

    // Cannot approve/reject your own request
    if (exchangeRequest.requesterId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot respond to your own request' },
        { status: 400 }
      )
    }

    if (validatedData.decision === 'APPROVED') {
      // Perform the exchange: swap roomIds between the two allocations
      const sourceAllocationId = exchangeRequest.sourceAllocationId
      const targetAllocationId = exchangeRequest.targetAllocationId
      const sourceRoomId = exchangeRequest.sourceAllocation.roomId
      const targetRoomId = exchangeRequest.targetAllocation.roomId

      // Use interactive transaction to swap rooms
      // The constraint is on (roomId, day, startTime, sessionId), so we need to handle it carefully
      // Strategy: Drop constraint AND unique index, swap, recreate both (within transaction for safety)
      await db.$transaction(async (tx) => {
        const constraintName = 'Allocation_roomId_day_startTime_sessionId_key'
        
        // Step 1: Drop the unique constraint (if exists as constraint)
        await tx.$executeRawUnsafe(`
          ALTER TABLE "Allocation" DROP CONSTRAINT IF EXISTS "${constraintName}"
        `)
        
        // Step 2: Drop any unique index with the same name (Prisma might create index instead)
        await tx.$executeRawUnsafe(`
          DROP INDEX IF EXISTS "${constraintName}"
        `)

        // Step 3: Update source allocation to use target's room
        await tx.$executeRaw`
          UPDATE "Allocation"
          SET "roomId" = ${targetRoomId},
              "isModified" = true,
              "updatedAt" = NOW()
          WHERE id = ${sourceAllocationId}
        `

        // Step 4: Update target allocation to use source's old room
        await tx.$executeRaw`
          UPDATE "Allocation"
          SET "roomId" = ${sourceRoomId},
              "isModified" = true,
              "updatedAt" = NOW()
          WHERE id = ${targetAllocationId}
        `

        // Step 5: Recreate the unique index (Prisma uses unique index for @@unique)
        await tx.$executeRawUnsafe(`
          CREATE UNIQUE INDEX "${constraintName}" 
          ON "Allocation" ("roomId", "day", "startTime", "sessionId")
        `)

        // Update the exchange request status
        await tx.exchangeRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            responderId: session.user.id,
            responseComment: validatedData.comment,
            respondedAt: new Date(),
          },
        })
      })

      // Log the action
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'APPROVE_EXCHANGE_REQUEST',
          entityType: 'ExchangeRequest',
          entityId: requestId,
          details: `Approved exchange: ${exchangeRequest.sourceAllocation.room.code} ↔ ${exchangeRequest.targetAllocation.room.code}`,
        },
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Exchange approved and rooms swapped successfully' 
      })
    } else {
      // Reject the request
      await db.exchangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          responderId: session.user.id,
          responseComment: validatedData.comment,
          respondedAt: new Date(),
        },
      })

      // Log the action
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'REJECT_EXCHANGE_REQUEST',
          entityType: 'ExchangeRequest',
          entityId: requestId,
          details: `Rejected exchange request`,
        },
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Exchange request rejected' 
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error processing exchange request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel a pending exchange request (only by requester)
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

    // Get the exchange request
    const exchangeRequest = await db.exchangeRequest.findUnique({
      where: { id: requestId },
      include: {
        sourceAllocation: {
          include: { room: true },
        },
        targetAllocation: {
          include: { room: true },
        },
      },
    })

    if (!exchangeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only the requester or admin can delete
    if (exchangeRequest.requesterId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can only delete pending requests
    if (exchangeRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      )
    }

    // Delete the request
    await db.exchangeRequest.delete({
      where: { id: requestId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_EXCHANGE_REQUEST',
        entityType: 'ExchangeRequest',
        entityId: requestId,
        details: `Cancelled exchange request: ${exchangeRequest.sourceAllocation.room.code} ↔ ${exchangeRequest.targetAllocation.room.code}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exchange request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
