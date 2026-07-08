import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSubjectSchema = z.object({
  code: z.string().min(1, 'Subject code is required'),
  name: z.string().min(1, 'Subject name is required'),
  shortName: z.string().optional(),
  type: z.enum(['THEORY', 'LAB', 'TUTORIAL']),
  credits: z.number().int().min(1).max(10).default(3),
  hoursPerWeek: z.number().int().min(1).max(10).default(3),
  semesterNum: z.number().int().min(1).max(8),
})

// GET - List all subjects for coordinator's department
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semesterNum = searchParams.get('semester')
    const type = searchParams.get('type')

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const where: any = { departmentId: user.departmentId }
    
    if (semesterNum) {
      where.semesterNum = parseInt(semesterNum)
    }
    if (type) {
      where.type = type
    }

    const subjects = await db.subject.findMany({
      where,
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { facultyMappings: true },
        },
      },
      orderBy: [{ semesterNum: 'asc' }, { code: 'asc' }],
    })

    return NextResponse.json(subjects)
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new subject
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
    const validatedData = createSubjectSchema.parse(body)

    // Check if subject with same code already exists in department for this semester
    const existing = await db.subject.findFirst({
      where: {
        code: validatedData.code,
        departmentId: user.departmentId,
        semesterNum: validatedData.semesterNum,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Subject with this code already exists for this semester' },
        { status: 400 }
      )
    }

    const subject = await db.subject.create({
      data: {
        ...validatedData,
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
        action: 'CREATE_SUBJECT',
        entityType: 'Subject',
        entityId: subject.id,
        details: `Created subject: ${subject.code} - ${subject.name}`,
      },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating subject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
