import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// DELETE - Delete a mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { mappingId } = await params

    // Check if mapping exists
    const existing = await db.facultySubjectMapping.findUnique({
      where: { id: mappingId },
      include: {
        faculty: true,
        subject: true,
        section: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 })
    }

    // Check department access for coordinators
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      if (user?.departmentId !== existing.faculty.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Store the subject and section info before deletion
    const subjectId = existing.subjectId
    const sectionId = existing.sectionId

    // Delete the mapping
    await db.facultySubjectMapping.delete({
      where: { id: mappingId },
    })

    // Automatically update allocations - get remaining faculty mappings for this subject/section
    const remainingMappings = await db.facultySubjectMapping.findMany({
      where: {
        subjectId: subjectId,
        sectionId: sectionId,
      },
      include: {
        faculty: { select: { id: true, initials: true } },
      },
    })

    // Build the new faculty string from remaining mappings
    const facultyIds = remainingMappings.map(m => m.faculty.id).join(',')
    const facultyInitials = remainingMappings.map(m => m.faculty.initials).join(', ')

    // Update all allocations in this section with this subject
    await db.allocation.updateMany({
      where: {
        sectionId: sectionId,
        subjectId: subjectId,
      },
      data: {
        facultyIds: facultyIds || null,
        faculty: facultyInitials || '-',
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_FACULTY_MAPPING',
        entityType: 'FacultySubjectMapping',
        entityId: mappingId,
        details: `Removed mapping: ${existing.faculty.name} from ${existing.subject.code} for Section ${existing.section.year}${existing.section.division}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting mapping:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
