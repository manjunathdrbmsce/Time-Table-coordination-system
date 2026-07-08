import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Get rooms accessible to the coordinator
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all rooms (coordinators can see all rooms to request slots)
    const rooms = await db.room.findMany({
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        statistics: true,
      },
      orderBy: [
        { department: { code: 'asc' } },
        { code: 'asc' },
      ],
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Error fetching coordinator rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
