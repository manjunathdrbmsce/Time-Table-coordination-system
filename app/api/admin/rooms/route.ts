import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const roomSchema = z.object({
  code: z.string().min(1).max(20),
  logicalName: z.string().min(1),
  actualName: z.string().optional(),
  type: z.enum(["CLASSROOM", "LAB"]),
  capacity: z.number().min(1).default(60),
  departmentId: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rooms = await db.room.findMany({
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
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = roomSchema.parse(body);

    // Check if room code already exists
    const existing = await db.room.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Room with this code already exists" },
        { status: 400 }
      );
    }

    const room = await db.room.create({
      data: {
        code: validatedData.code,
        logicalName: validatedData.logicalName,
        actualName: validatedData.actualName || null,
        type: validatedData.type,
        capacity: validatedData.capacity,
        departmentId: validatedData.departmentId || null,
        buildingId: validatedData.buildingId || null,
        statistics: {
          create: {
            totalSlots: 40,
            occupiedSlots: 0,
            freeSlots: 40,
            utilizationPct: 0,
          },
        },
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

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
