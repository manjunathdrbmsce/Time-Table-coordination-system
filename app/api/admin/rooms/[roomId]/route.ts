import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateRoomSchema = z.object({
  actualName: z.string().optional().nullable(),
  departmentId: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;

    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        statistics: true,
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;
    const body = await req.json();
    const validatedData = updateRoomSchema.parse(body);

    // Check if room exists
    const existingRoom = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Update room - only actualName, departmentId, buildingId allowed
    const room = await db.room.update({
      where: { id: roomId },
      data: {
        actualName: validatedData.actualName ?? existingRoom.actualName,
        departmentId: validatedData.departmentId !== undefined 
          ? validatedData.departmentId 
          : existingRoom.departmentId,
        buildingId: validatedData.buildingId !== undefined 
          ? validatedData.buildingId 
          : existingRoom.buildingId,
      },
      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        building: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        statistics: true,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error updating room:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await params;

    // Check if room exists
    const existingRoom = await db.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: {
            allocations: true,
          },
        },
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if room has any allocations - prevent deletion if it does
    if (existingRoom._count.allocations > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete room with allocations", 
          message: `This room has ${existingRoom._count.allocations} allocation(s). Please remove all allocations before deleting the room.` 
        },
        { status: 400 }
      );
    }

    // Delete room statistics first (if exists), then the room
    await db.roomStats.deleteMany({
      where: { roomId },
    });

    await db.room.delete({
      where: { id: roomId },
    });

    return NextResponse.json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
