import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createMappingSchema = z.object({
  facultyId: z.string().min(1, 'Faculty is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  sectionId: z.string().min(1, 'Section is required'),
})

// GET - List all mappings for coordinator's department
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
    const sectionId = searchParams.get('sectionId')
    const subjectId = searchParams.get('subjectId')
    const facultyId = searchParams.get('facultyId')

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const where: any = {
      faculty: { departmentId: user.departmentId },
    }

    if (sectionId) where.sectionId = sectionId
    if (subjectId) where.subjectId = subjectId
    if (facultyId) where.facultyId = facultyId

    const mappings = await db.facultySubjectMapping.findMany({
      where,
      include: {
        faculty: {
          select: { id: true, name: true, initials: true },
        },
        subject: {
          select: { id: true, code: true, name: true, type: true, semesterNum: true },
        },
        section: {
          select: { 
            id: true, 
            year: true, 
            division: true,
            semester: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { section: { year: 'asc' } },
        { section: { division: 'asc' } },
        { subject: { code: 'asc' } },
      ],
    })

    return NextResponse.json(mappings)
  } catch (error) {
    console.error('Error fetching mappings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new mapping
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
    const validatedData = createMappingSchema.parse(body)

    // Verify faculty belongs to department
    const faculty = await db.faculty.findUnique({
      where: { id: validatedData.facultyId },
    })
    if (!faculty || faculty.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Invalid faculty' }, { status: 400 })
    }

    // Verify subject belongs to department
    const subject = await db.subject.findUnique({
      where: { id: validatedData.subjectId },
    })
    if (!subject || subject.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Invalid subject' }, { status: 400 })
    }

    // Verify section belongs to department
    const section = await db.section.findUnique({
      where: { id: validatedData.sectionId },
    })
    if (!section || section.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    // Check if mapping already exists
    const existing = await db.facultySubjectMapping.findFirst({
      where: {
        facultyId: validatedData.facultyId,
        subjectId: validatedData.subjectId,
        sectionId: validatedData.sectionId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This mapping already exists' },
        { status: 400 }
      )
    }

    // Check faculty mapping limits based on subject type
    // For TUTORIAL subjects: max 2 faculty allowed
    // For THEORY/LAB subjects: max 1 faculty allowed
    const existingMappingsCount = await db.facultySubjectMapping.count({
      where: {
        subjectId: validatedData.subjectId,
        sectionId: validatedData.sectionId,
      },
    })

    const maxFacultyAllowed = subject.type === 'TUTORIAL' ? 2 : 1

    if (existingMappingsCount >= maxFacultyAllowed) {
      const subjectTypeName = subject.type.toLowerCase()
      return NextResponse.json(
        { 
          error: `Maximum ${maxFacultyAllowed} faculty allowed for ${subjectTypeName} subjects. ${subject.type === 'TUTORIAL' ? 'Tutorial subjects allow up to 2 faculty.' : 'Theory/Lab subjects allow only 1 faculty.'}` 
        },
        { status: 400 }
      )
    }

    const mapping = await db.facultySubjectMapping.create({
      data: validatedData,
      include: {
        faculty: {
          select: { id: true, name: true, initials: true },
        },
        subject: {
          select: { id: true, code: true, name: true, type: true },
        },
        section: {
          select: { 
            id: true, 
            year: true, 
            division: true,
            semester: { select: { name: true } },
          },
        },
      },
    })

    // Automatically update allocations in this section with this subject
    // Get all faculty mapped to this subject for this section
    const allMappingsForSubject = await db.facultySubjectMapping.findMany({
      where: {
        subjectId: validatedData.subjectId,
        sectionId: validatedData.sectionId,
      },
      include: {
        faculty: { select: { id: true, initials: true } },
      },
    })

    // Build the new faculty string
    const facultyIds = allMappingsForSubject.map(m => m.faculty.id).join(',')
    const facultyInitials = allMappingsForSubject.map(m => m.faculty.initials).join(', ')

    // Update all allocations in this section with this subject
    await db.allocation.updateMany({
      where: {
        sectionId: validatedData.sectionId,
        subjectId: validatedData.subjectId,
      },
      data: {
        facultyIds: facultyIds,
        faculty: facultyInitials || '-',
        isModified: false, // Reset modified status since mapping is now set
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_FACULTY_MAPPING',
        entityType: 'FacultySubjectMapping',
        entityId: mapping.id,
        details: `Mapped ${faculty.name} to ${subject.code} for Section ${section.year}${section.division}`,
      },
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating mapping:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
