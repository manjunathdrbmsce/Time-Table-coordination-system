import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Get sections for the current coordinator's department
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { department: true },
    })

    // For coordinators without a department, return empty array instead of error
    if (!user?.departmentId && session.user.role !== 'ADMIN') {
      console.log('Coordinator has no department assigned:', session.user.id)
      return NextResponse.json([])
    }

    const sections = await db.section.findMany({
      where: session.user.role === 'ADMIN' 
        ? {} 
        : { departmentId: user!.departmentId! },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { year: 'asc' },
        { division: 'asc' },
      ],
    })

    return NextResponse.json(sections)
  } catch (error) {
    console.error('Error fetching coordinator sections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
