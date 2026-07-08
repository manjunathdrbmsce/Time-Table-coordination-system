import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Get incoming slot requests for rooms in the coordinator's department
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
    })

    if (!user?.departmentId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Get PENDING requests
    // For coordinators: show requests for rooms in their department OR shared rooms (no departmentId)
    // For admins: show all requests
    const requests = await db.slotRequest.findMany({
      where: {
        status: 'PENDING',
        // Exclude own requests
        NOT: {
          requesterId: session.user.id,
        },
        // For coordinators, filter by their department's rooms or shared rooms
        ...(session.user.role !== 'ADMIN' && {
          OR: [
            { room: { departmentId: user!.departmentId! } },
            { room: { departmentId: null } },
          ],
        }),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          include: {
            department: true,
          },
        },
        section: {
          include: {
            department: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching incoming requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
