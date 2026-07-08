import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const sessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-YY (e.g., 2025-26)'),
  semesterType: z.enum(['ODD', 'EVEN']),
  isActive: z.boolean().default(false),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
})

// GET - List all academic sessions or get active session
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') === 'true'

    if (activeOnly) {
      const activeSession = await db.academicSession.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          academicYear: true,
          semesterType: true,
        },
      })
      return NextResponse.json(activeSession)
    }

    const sessions = await db.academicSession.findMany({
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
      orderBy: [
        { academicYear: 'desc' },
        { semesterType: 'asc' },
      ],
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new academic session
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = sessionSchema.parse(body)

    // Check if session already exists
    const existing = await db.academicSession.findUnique({
      where: {
        academicYear_semesterType: {
          academicYear: validatedData.academicYear,
          semesterType: validatedData.semesterType,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This academic session already exists' },
        { status: 400 }
      )
    }

    // If setting as active, deactivate all other sessions
    if (validatedData.isActive) {
      await db.academicSession.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const academicSession = await db.academicSession.create({
      data: {
        name: validatedData.name,
        academicYear: validatedData.academicYear,
        semesterType: validatedData.semesterType,
        isActive: validatedData.isActive,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
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
        action: 'CREATE_SESSION',
        entityType: 'AcademicSession',
        entityId: academicSession.id,
        details: `Created session: ${academicSession.name}`,
      },
    })

    return NextResponse.json(academicSession, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
