import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateAllocationSchema = z.object({
  subject: z.string().min(1).optional(),
  faculty: z.string().min(1).optional(),
  type: z.enum(['THEORY', 'LAB']).optional(),
  subjectId: z.string().optional(),
  facultyIds: z.string().nullable().optional(), // comma-separated faculty IDs
})

// Update room statistics helper
async function updateRoomStats(roomId: string) {
  const roomAllocations = await db.allocation.count({
    where: { roomId },
  })

  const totalSlots = 48 // 8 slots × 6 days
  const occupiedSlots = roomAllocations
  const freeSlots = Math.max(0, totalSlots - occupiedSlots)
  const utilizationPct = Math.round((occupiedSlots / totalSlots) * 100)

  await db.roomStats.upsert({
    where: { roomId },
    update: {
      occupiedSlots,
      freeSlots,
      utilizationPct,
      lastUpdated: new Date(),
    },
    create: {
      roomId,
      totalSlots,
      occupiedSlots,
      freeSlots,
      utilizationPct,
    },
  })
}

// Update department statistics helper
async function updateDepartmentStats(departmentId: string) {
  // Get all sections for this department
  const sections = await db.section.findMany({
    where: { departmentId },
    include: {
      allocations: true,
    },
  })

  let achievedClassHours = 0
  let achievedLabHours = 0
  let targetClassHours = 0
  let targetLabHours = 0

  sections.forEach(section => {
    targetClassHours += section.requiredTheoryHours
    targetLabHours += section.requiredLabHours
    section.allocations.forEach(a => {
      if (a.type === 'THEORY') achievedClassHours++
      else if (a.type === 'LAB') achievedLabHours++
    })
  })

  const classGapHours = Math.max(0, targetClassHours - achievedClassHours)
  const labGapHours = Math.max(0, targetLabHours - achievedLabHours)
  const totalTarget = targetClassHours + targetLabHours
  const totalAchieved = achievedClassHours + achievedLabHours
  const allocationPercent = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0

  await db.departmentStats.upsert({
    where: { departmentId },
    update: {
      targetClassHours,
      achievedClassHours,
      classGapHours,
      targetLabHours,
      achievedLabHours,
      labGapHours,
      allocationPercent,
      totalSections: sections.length,
      lastUpdated: new Date(),
    },
    create: {
      departmentId,
      totalSections: sections.length,
      targetClassHours,
      achievedClassHours,
      classGapHours,
      targetLabHours,
      achievedLabHours,
      labGapHours,
      allocationPercent,
    },
  })
}

// PATCH - Update allocation details (subject, faculty, type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { allocationId } = await params
    const body = await request.json()
    const validatedData = updateAllocationSchema.parse(body)

    // Verify allocation exists
    const allocation = await db.allocation.findUnique({
      where: { id: allocationId },
      include: {
        section: true,
      },
    })

    if (!allocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
    }

    // Check if coordinator has access to this allocation's section
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      if (user?.departmentId !== allocation.section.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Update the allocation
    // Build update data - DON'T set isModified when just updating subject/faculty mapping
    // isModified should only be true when slot time/day/room changes (pending approval scenario)
    const updateData: any = {}

    // When mapping subject/faculty, reset isModified to false
    // This removes the "Requested" status for slots that now have proper mapping
    let shouldResetModified = false

    if (validatedData.subject) updateData.subject = validatedData.subject
    if (validatedData.faculty) updateData.faculty = validatedData.faculty
    if (validatedData.type) updateData.type = validatedData.type
    
    // Handle subject mapping
    if (validatedData.subjectId !== undefined) {
      shouldResetModified = true // Subject is being updated, reset modified status
      if (validatedData.subjectId) {
        // Verify subject exists and get its details
        const subject = await db.subject.findUnique({
          where: { id: validatedData.subjectId },
        })
        if (subject) {
          updateData.subjectId = validatedData.subjectId
          // Update the subject display text to use shortName or code
          updateData.subject = subject.shortName || subject.code
        }
      } else {
        // Clear subject mapping - mark as FREE so free-slots report picks it up
        updateData.subjectId = null
        updateData.subject = '-'
        updateData.allocationType = 'FREE'
      }
    }

    // Handle faculty mapping
    if (validatedData.facultyIds !== undefined) {
      shouldResetModified = true // Faculty is being updated, reset modified status
      if (validatedData.facultyIds) {
        // Verify faculty exist and get their initials
        const facultyIdArray = validatedData.facultyIds.split(',').filter(Boolean)
        const faculties = await db.faculty.findMany({
          where: { id: { in: facultyIdArray } },
        })
        if (faculties.length > 0) {
          updateData.facultyIds = validatedData.facultyIds
          // Update the faculty display text to use initials
          updateData.faculty = faculties.map(f => f.initials).join(', ')
          // Restore allocation type if subject is also set
          if (updateData.subject !== '-') {
            updateData.allocationType = 'ALLOCATED'
          }
        }
      } else {
        // Clear faculty mapping - also clear the display field
        updateData.facultyIds = null
        updateData.faculty = '-'
      }
    }

    // Reset isModified when subject/faculty mapping is done
    // This removes the yellow "Requested" status from the cell
    if (shouldResetModified) {
      updateData.isModified = false
    }

    const updatedAllocation = await db.allocation.update({
      where: { id: allocationId },
      data: updateData,
      include: {
        room: true,
        section: {
          include: { department: true },
        },
        linkedSubject: true,
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_ALLOCATION',
        entityType: 'Allocation',
        entityId: allocationId,
        details: `Updated allocation: ${JSON.stringify(validatedData)}`,
      },
    })

    return NextResponse.json(updatedAllocation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ allocationId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { allocationId } = await params

    // Verify allocation exists
    const allocation = await db.allocation.findUnique({
      where: { id: allocationId },
      include: {
        section: true,
      },
    })

    if (!allocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
    }

    // Check if coordinator has access to this allocation's section
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      if (user?.departmentId !== allocation.section.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const roomId = allocation.roomId
    const departmentId = allocation.section.departmentId

    // Delete the allocation
    await db.allocation.delete({
      where: { id: allocationId },
    })

    // Update room statistics after deletion
    await updateRoomStats(roomId)

    // Update department statistics after deletion
    await updateDepartmentStats(departmentId)

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_ALLOCATION',
        entityType: 'Allocation',
        entityId: allocationId,
        details: `Deleted allocation for ${allocation.subject} on ${allocation.day} ${allocation.startTime}-${allocation.endTime}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
