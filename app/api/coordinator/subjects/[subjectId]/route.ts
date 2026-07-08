import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSubjectSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  shortName: z.string().optional().nullable(),
  type: z.enum(['THEORY', 'LAB', 'TUTORIAL']).optional(),
  credits: z.number().int().min(1).max(10).optional(),
  hoursPerWeek: z.number().int().min(1).max(10).optional(),
  semesterNum: z.number().int().min(1).max(8).optional(),
})

// GET - Get single subject
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subjectId } = await params

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        facultyMappings: {
          include: {
            faculty: true,
            section: true,
          },
        },
      },
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Check department access for coordinators
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      if (user?.departmentId !== subject.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error('Error fetching subject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update subject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subjectId } = await params
    const body = await request.json()
    const validatedData = updateSubjectSchema.parse(body)

    // Check if subject exists
    const existing = await db.subject.findUnique({
      where: { id: subjectId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
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

    // Check for duplicate code if code is being changed
    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicate = await db.subject.findFirst({
        where: {
          code: validatedData.code,
          departmentId: existing.departmentId,
          semesterNum: validatedData.semesterNum || existing.semesterNum,
          id: { not: subjectId },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Subject with this code already exists for this semester' },
          { status: 400 }
        )
      }
    }

    const subject = await db.subject.update({
      where: { id: subjectId },
      data: validatedData,
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
        action: 'UPDATE_SUBJECT',
        entityType: 'Subject',
        entityId: subject.id,
        details: `Updated subject: ${subject.code} - ${subject.name}`,
      },
    })

    return NextResponse.json(subject)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating subject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subjectId } = await params

    // Check if subject exists
    const existing = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: { facultyMappings: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
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

    // Delete the subject (cascades to mappings)
    await db.subject.delete({
      where: { id: subjectId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_SUBJECT',
        entityType: 'Subject',
        entityId: subjectId,
        details: `Deleted subject: ${existing.code} - ${existing.name}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
