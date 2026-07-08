import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Get incoming exchange requests for the coordinator's department
export async function GET() {
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

    if (!user?.departmentId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Get exchange requests where the TARGET allocation belongs to user's department
    // These are requests from other departments wanting to exchange with our rooms
    const requests = await db.exchangeRequest.findMany({
      where: {
        status: 'PENDING',
        // Target allocation must belong to user's department
        targetAllocation: {
          section: {
            departmentId: user!.departmentId!,
          },
        },
        // Exclude own requests
        requesterId: { not: session.user.id },
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        sourceAllocation: {
          include: {
            room: {
              include: { department: true, building: true },
            },
            section: {
              include: { department: true },
            },
            linkedSubject: true,
          },
        },
        targetAllocation: {
          include: {
            room: {
              include: { department: true, building: true },
            },
            section: {
              include: { department: true },
            },
            linkedSubject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching incoming exchange requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
