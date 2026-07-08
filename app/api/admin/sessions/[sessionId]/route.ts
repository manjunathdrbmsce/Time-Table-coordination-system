import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

// GET - Get single session with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const academicSession = await db.academicSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { 
            sections: true,
            allocations: true,
            slotRequests: true,
            uploads: true,
          },
        },
      },
    })

    if (!academicSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(academicSession)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update session (including setting as active)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sessionId } = await params
    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    // Check if session exists
    const existing = await db.academicSession.findUnique({
      where: { id: sessionId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // If setting as active, deactivate all other sessions
    if (validatedData.isActive === true) {
      await db.academicSession.updateMany({
        where: { 
          isActive: true,
          id: { not: sessionId },
        },
        data: { isActive: false },
      })
    }

    const academicSession = await db.academicSession.update({
      where: { id: sessionId },
      data: {
        name: validatedData.name,
        isActive: validatedData.isActive,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      },
      include: {
        _count: {
          select: { 
            sections: true,
            allocations: true,
            slotRequests: true,
            uploads: true,
          },
        },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: validatedData.isActive ? 'ACTIVATE_SESSION' : 'UPDATE_SESSION',
        entityType: 'AcademicSession',
        entityId: academicSession.id,
        details: validatedData.isActive 
          ? `Activated session: ${academicSession.name}`
          : `Updated session: ${academicSession.name}`,
      },
    })

    return NextResponse.json(academicSession)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete session (only if no data attached)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sessionId } = await params

    // Check if session exists and has data
    const academicSession = await db.academicSession.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { 
            sections: true,
            allocations: true,
            slotRequests: true,
            uploads: true,
          },
        },
      },
    })

    if (!academicSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const totalData = 
      academicSession._count.sections +
      academicSession._count.allocations +
      academicSession._count.slotRequests +
      academicSession._count.uploads

    if (totalData > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete session with existing data. This session has ${academicSession._count.sections} sections, ${academicSession._count.allocations} allocations, ${academicSession._count.slotRequests} requests, and ${academicSession._count.uploads} uploads.` 
        },
        { status: 400 }
      )
    }

    if (academicSession.isActive) {
      return NextResponse.json(
        { error: 'Cannot delete the active session. Set another session as active first.' },
        { status: 400 }
      )
    }

    await db.academicSession.delete({
      where: { id: sessionId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_SESSION',
        entityType: 'AcademicSession',
        entityId: sessionId,
        details: `Deleted session: ${academicSession.name}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
