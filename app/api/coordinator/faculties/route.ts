import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createFacultySchema = z.object({
  name: z.string().min(1, 'Faculty name is required'),
  initials: z.string().min(1, 'Initials are required').max(10),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
})

// GET - List all faculty for coordinator's department
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const faculties = await db.faculty.findMany({
      where: { departmentId: user.departmentId },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { subjectMappings: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(faculties)
  } catch (error) {
    console.error('Error fetching faculties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new faculty
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = createFacultySchema.parse(body)

    // Check if faculty with same initials already exists in department
    const existing = await db.faculty.findFirst({
      where: {
        initials: validatedData.initials.toUpperCase(),
        departmentId: user.departmentId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Faculty with these initials already exists in your department' },
        { status: 400 }
      )
    }

    const faculty = await db.faculty.create({
      data: {
        ...validatedData,
        initials: validatedData.initials.toUpperCase(),
        departmentId: user.departmentId,
      },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_FACULTY',
        entityType: 'Faculty',
        entityId: faculty.id,
        details: `Created faculty: ${faculty.name} (${faculty.initials})`,
      },
    })

    return NextResponse.json(faculty, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating faculty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
