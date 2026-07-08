import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const buildingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(20),
  address: z.string().optional(),
  floors: z.number().int().min(1).default(1),
})

// GET - List all buildings
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildings = await db.building.findMany({
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(buildings)
  } catch (error) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new building
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = buildingSchema.parse(body)

    // Check if code already exists
    const existing = await db.building.findUnique({
      where: { code: validatedData.code.toUpperCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Building code already exists' },
        { status: 400 }
      )
    }

    const building = await db.building.create({
      data: {
        ...validatedData,
        code: validatedData.code.toUpperCase(),
      },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_BUILDING',
        entityType: 'Building',
        entityId: building.id,
        details: `Created building: ${building.name} (${building.code})`,
      },
    })

    return NextResponse.json(building, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating building:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
