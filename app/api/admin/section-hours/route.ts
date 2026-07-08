import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  semesterId: z.string().min(1, 'Semester is required'),
  requiredTheoryHours: z.number().min(0).max(50),
  requiredLabHours: z.number().min(0).max(50),
})

// GET - Fetch current hours configuration grouped by department and semester
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all departments with their semesters and sections
    const departments = await db.department.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: 'asc' },
    })

    const semesters = await db.semester.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    })

    // Get sections grouped by department and semester with their hours
    const sections = await db.section.findMany({
      select: {
        id: true,
        departmentId: true,
        semesterId: true,
        year: true,
        division: true,
        requiredTheoryHours: true,
        requiredLabHours: true,
        _count: {
          select: {
            allocations: true,
          },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { semesterId: 'asc' }, { year: 'asc' }, { division: 'asc' }],
    })

    // Group sections by department and semester
    const groupedConfig: Record<string, {
      departmentId: string;
      semesterId: string;
      requiredTheoryHours: number;
      requiredLabHours: number;
      sectionCount: number;
      totalAllocations: number;
    }> = {}

    sections.forEach(section => {
      const key = `${section.departmentId}-${section.semesterId}`
      if (!groupedConfig[key]) {
        groupedConfig[key] = {
          departmentId: section.departmentId,
          semesterId: section.semesterId,
          requiredTheoryHours: section.requiredTheoryHours,
          requiredLabHours: section.requiredLabHours,
          sectionCount: 0,
          totalAllocations: 0,
        }
      }
      groupedConfig[key].sectionCount++
      groupedConfig[key].totalAllocations += section._count.allocations
    })

    return NextResponse.json({
      departments,
      semesters,
      configurations: Object.values(groupedConfig),
    })
  } catch (error) {
    console.error('Error fetching section hours config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Bulk update hours for all sections in a department+semester
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkUpdateSchema.parse(body)

    // Update all sections in the specified department and semester
    const result = await db.section.updateMany({
      where: {
        departmentId: validatedData.departmentId,
        semesterId: validatedData.semesterId,
      },
      data: {
        requiredTheoryHours: validatedData.requiredTheoryHours,
        requiredLabHours: validatedData.requiredLabHours,
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPDATE_SECTION_HOURS',
        entityType: 'Section',
        entityId: `${validatedData.departmentId}-${validatedData.semesterId}`,
        details: `Updated ${result.count} sections: Theory=${validatedData.requiredTheoryHours}h, Lab=${validatedData.requiredLabHours}h`,
      },
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} sections successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating section hours:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
