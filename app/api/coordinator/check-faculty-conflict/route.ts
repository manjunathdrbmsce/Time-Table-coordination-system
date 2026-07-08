import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const checkConflictSchema = z.object({
  facultyIds: z.array(z.string()).min(1),
  day: z.string(),
  startTime: z.string(),
  excludeSectionId: z.string(), // Exclude current section from conflict check
})

// POST - Check for faculty scheduling conflicts
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = checkConflictSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { facultyIds, day, startTime, excludeSectionId } = validation.data

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Get faculty details
    const faculties = await db.faculty.findMany({
      where: {
        id: { in: facultyIds },
        departmentId: user.departmentId,
      },
    })

    const conflicts: Array<{
      facultyId: string
      facultyName: string
      initials: string
      conflictSection: string
      day: string
      startTime: string
      subject: string
    }> = []

    // Check each faculty for conflicts
    for (const faculty of faculties) {
      // Find allocations at the same day and time in OTHER sections
      // where this faculty is assigned (via facultyIds field which is comma-separated)
      const conflictingAllocations = await db.allocation.findMany({
        where: {
          day,
          startTime,
          sectionId: { not: excludeSectionId },
          section: {
            departmentId: user.departmentId, // Only check within the same department
          },
          // Check if facultyIds contains this faculty's ID
          // facultyIds is stored as comma-separated string
          OR: [
            { facultyIds: faculty.id }, // Exact match (single faculty)
            { facultyIds: { startsWith: `${faculty.id},` } }, // At the start
            { facultyIds: { endsWith: `,${faculty.id}` } }, // At the end
            { facultyIds: { contains: `,${faculty.id},` } }, // In the middle
          ],
        },
        include: {
          section: {
            select: {
              year: true,
              division: true,
              department: { select: { code: true } },
            },
          },
          linkedSubject: {
            select: { code: true, name: true },
          },
        },
      })

      for (const allocation of conflictingAllocations) {
        const sectionLabel = `${allocation.section.department.code} Sem ${allocation.section.year} - Sec ${allocation.section.division}`
        conflicts.push({
          facultyId: faculty.id,
          facultyName: faculty.name,
          initials: faculty.initials,
          conflictSection: sectionLabel,
          day: allocation.day,
          startTime: allocation.startTime,
          subject: allocation.linkedSubject?.code || allocation.subject,
        })
      }
    }

    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('Check faculty conflict error:', error)
    return NextResponse.json(
      { error: 'Failed to check conflicts' },
      { status: 500 }
    )
  }
}
