import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateFacultySchema = z.object({
  name: z.string().min(1).optional(),
  initials: z.string().min(1).max(10).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
})

// GET - Get single faculty
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ facultyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { facultyId } = await params

    const faculty = await db.faculty.findUnique({
      where: { id: facultyId },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        subjectMappings: {
          include: {
            subject: true,
            section: {
              include: {
                semester: true,
              },
            },
          },
        },
      },
    })

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // Check department access for coordinators
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      if (user?.departmentId !== faculty.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(faculty)
  } catch (error) {
    console.error('Error fetching faculty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update faculty
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ facultyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { facultyId } = await params
    const body = await request.json()
    const validatedData = updateFacultySchema.parse(body)

    // Check if faculty exists
    const existing = await db.faculty.findUnique({
      where: { id: facultyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // Check department access for coordinators
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      if (user?.departmentId !== existing.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Check for duplicate initials if initials are being changed
    if (validatedData.initials && validatedData.initials.toUpperCase() !== existing.initials) {
      const duplicate = await db.faculty.findFirst({
        where: {
          initials: validatedData.initials.toUpperCase(),
          departmentId: existing.departmentId,
          id: { not: facultyId },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Faculty with these initials already exists in your department' },
          { status: 400 }
        )
      }
    }

    const faculty = await db.faculty.update({
      where: { id: facultyId },
      data: {
        ...validatedData,
        initials: validatedData.initials?.toUpperCase() || existing.initials,
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
        action: 'UPDATE_FACULTY',
        entityType: 'Faculty',
        entityId: faculty.id,
        details: `Updated faculty: ${faculty.name} (${faculty.initials})`,
      },
    })

    return NextResponse.json(faculty)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating faculty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete faculty
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ facultyId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { facultyId } = await params

    // Check if faculty exists
    const existing = await db.faculty.findUnique({
      where: { id: facultyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // Check department access for coordinators
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      if (user?.departmentId !== existing.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Delete the faculty (cascades to mappings)
    await db.faculty.delete({
      where: { id: facultyId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_FACULTY',
        entityType: 'Faculty',
        entityId: facultyId,
        details: `Deleted faculty: ${existing.name} (${existing.initials})`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting faculty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
