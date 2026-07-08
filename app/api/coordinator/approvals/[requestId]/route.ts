import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const approvalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
})

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
    const validatedData = approvalSchema.parse(body)

    // Verify the request exists and is pending
    const slotRequest = await db.slotRequest.findUnique({
      where: { id: requestId },
      include: {
        room: true,
        section: true,
      },
    })

    if (!slotRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (slotRequest.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'This request has already been processed' },
        { status: 400 }
      )
    }

    // Verify the coordinator can approve this request
    // Coordinators can approve requests for:
    // 1. Rooms in their department
    // 2. Shared rooms (rooms with no departmentId)
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      const roomDeptId = slotRequest.room.departmentId;
      const userDeptId = user?.departmentId;
      
      // If room has a department and it's not the coordinator's department, deny
      if (roomDeptId !== null && roomDeptId !== userDeptId) {
        return NextResponse.json(
          { message: 'You can only approve requests for rooms in your department or shared rooms' },
          { status: 403 }
        )
      }
    }

    // Cannot approve own request
    if (slotRequest.requesterId === session.user.id) {
      return NextResponse.json(
        { message: 'You cannot approve your own request' },
        { status: 400 }
      )
    }

    // Create the approval record and update the request status
    const result = await db.$transaction(async (tx) => {
      // Create approval record
      const approval = await tx.approval.create({
        data: {
          slotRequestId: requestId,
          approverId: session.user!.id,
          approverDeptId: session.user!.departmentId!,
          decision: validatedData.decision,
          comment: validatedData.comment,
        },
      })

      // Update request status
      const updatedRequest = await tx.slotRequest.update({
        where: { id: requestId },
        data: {
          status: validatedData.decision,
        },
      })

      // If approved, create the allocation
      if (validatedData.decision === 'APPROVED') {
        // Determine allocation type based on room type
        const allocationType = slotRequest.room.type === 'LAB' ? 'LAB' : 'THEORY'

        await tx.allocation.create({
          data: {
            sectionId: slotRequest.sectionId,
            roomId: slotRequest.roomId,
            day: slotRequest.day,
            startTime: slotRequest.startTime,
            endTime: slotRequest.endTime,
            subject: 'TBD', // Will be updated by the requester
            faculty: 'TBD',
            type: allocationType,
            isModified: true,
          },
        })

        // Update room statistics
        const roomAllocations = await tx.allocation.count({
          where: { roomId: slotRequest.roomId },
        })

        const totalSlots = 48 // 8 slots × 6 days
        const occupiedSlots = roomAllocations
        const freeSlots = Math.max(0, totalSlots - occupiedSlots)
        const utilizationPct = Math.round((occupiedSlots / totalSlots) * 100)

        await tx.roomStats.upsert({
          where: { roomId: slotRequest.roomId },
          update: {
            occupiedSlots,
            freeSlots,
            utilizationPct,
            lastUpdated: new Date(),
          },
          create: {
            roomId: slotRequest.roomId,
            totalSlots,
            occupiedSlots,
            freeSlots,
            utilizationPct,
          },
        })
      }

      return { approval, updatedRequest }
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: validatedData.decision === 'APPROVED' ? 'APPROVE_SLOT_REQUEST' : 'REJECT_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: requestId,
        details: `${validatedData.decision} slot request for ${slotRequest.room.code} on ${slotRequest.day}`,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error processing approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
