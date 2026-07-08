import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sectionId } = await params

    const section = await db.section.findUnique({
      where: { id: sectionId },
      include: {
        department: true,
        semester: true,
        allocations: {
          include: {
            room: true,
          },
          orderBy: [
            { day: 'asc' },
            { startTime: 'asc' },
          ],
        },
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Check if coordinator has access to this section
    if (session.user.role === 'COORDINATOR') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      })
      
      if (user?.departmentId !== section.departmentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Calculate allocated hours
    const allocatedTheoryHours = section.allocations
      .filter(a => a.type === 'THEORY')
      .reduce((sum, a) => {
        const start = parseInt(a.startTime.split(':')[0])
        const end = parseInt(a.endTime.split(':')[0])
        return sum + (end - start)
      }, 0)

    const allocatedLabHours = section.allocations
      .filter(a => a.type === 'LAB')
      .reduce((sum, a) => {
        const start = parseInt(a.startTime.split(':')[0])
        const end = parseInt(a.endTime.split(':')[0])
        return sum + (end - start)
      }, 0)

    return NextResponse.json({
      ...section,
      allocatedTheoryHours,
      allocatedLabHours,
    })
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
