import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateBuildingSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  code: z.string().min(1, 'Code is required').max(20).optional(),
  address: z.string().optional().nullable(),
  floors: z.number().int().min(1).optional(),
})

// GET - Get single building
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { buildingId } = await params

    const building = await db.building.findUnique({
      where: { id: buildingId },
      include: {
        rooms: {
          include: {
            department: { select: { code: true, name: true } },
          },
        },
        _count: { select: { rooms: true } },
      },
    })

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    return NextResponse.json(building)
  } catch (error) {
    console.error('Error fetching building:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update building
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { buildingId } = await params
    const body = await request.json()
    const validatedData = updateBuildingSchema.parse(body)

    // Check if building exists
    const existing = await db.building.findUnique({
      where: { id: buildingId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // If code is being updated, check for duplicates
    if (validatedData.code && validatedData.code.toUpperCase() !== existing.code) {
      const duplicate = await db.building.findUnique({
        where: { code: validatedData.code.toUpperCase() },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Building code already exists' },
          { status: 400 }
        )
      }
    }

    const building = await db.building.update({
      where: { id: buildingId },
      data: {
        ...validatedData,
        code: validatedData.code?.toUpperCase(),
      },
      include: {
        _count: { select: { rooms: true } },
      },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_BUILDING',
        entityType: 'Building',
        entityId: building.id,
        details: `Updated building: ${building.name}`,
      },
    })

    return NextResponse.json(building)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating building:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete building
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { buildingId } = await params

    // Check if building exists and has rooms
    const building = await db.building.findUnique({
      where: { id: buildingId },
      include: { _count: { select: { rooms: true } } },
    })

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    if (building._count.rooms > 0) {
      return NextResponse.json(
        { error: `Cannot delete building with ${building._count.rooms} rooms. Reassign rooms first.` },
        { status: 400 }
      )
    }

    await db.building.delete({
      where: { id: buildingId },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_BUILDING',
        entityType: 'Building',
        entityId: buildingId,
        details: `Deleted building: ${building.name} (${building.code})`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting building:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
