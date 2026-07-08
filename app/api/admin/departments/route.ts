import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { departmentSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("include") === "stats";

    const departments = await db.department.findMany({
      include: {
        statistics: true,
        _count: {
          select: {
            users: true,
            semesters: true,
            sections: true,
            rooms: true,
          },
        },
        ...(includeStats && {
          sections: {
            select: {
              id: true,
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
          },
          rooms: {
            select: {
              id: true,
              code: true,
              logicalName: true,
              type: true,
              statistics: {
                select: {
                  utilizationPct: true,
                  occupiedSlots: true,
                  freeSlots: true,
                },
              },
            },
          },
        }),
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
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
    const validatedData = departmentSchema.parse(body);

    // Check if department code already exists
    const existing = await db.department.findUnique({
      where: { code: validatedData.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Department with this code already exists" },
        { status: 400 }
      );
    }

    const department = await db.department.create({
      data: {
        code: validatedData.code,
        name: validatedData.name,
        statistics: {
          create: {},
        },
      },
      include: {
        statistics: true,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, code, name } = body;

    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    // Check if code is being changed and if new code already exists
    if (code) {
      const existing = await db.department.findFirst({
        where: { 
          code: code,
          NOT: { id: id }
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Department with this code already exists" },
          { status: 400 }
        );
      }
    }

    const department = await db.department.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
      },
      include: {
        statistics: true,
        _count: {
          select: {
            users: true,
            sections: true,
            rooms: true,
          },
        },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 });
    }

    // Check if department has associated data
    const department = await db.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            sections: true,
            rooms: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    // Check for associated data
    const hasData = department._count.users > 0 || 
                    department._count.sections > 0 || 
                    department._count.rooms > 0;

    if (hasData) {
      return NextResponse.json(
        { 
          error: "Cannot delete department with associated users, sections, or rooms. Please remove them first.",
          details: {
            users: department._count.users,
            sections: department._count.sections,
            rooms: department._count.rooms,
          }
        },
        { status: 400 }
      );
    }

    // Delete statistics first (cascade should handle this, but being explicit)
    await db.departmentStats.deleteMany({
      where: { departmentId: id },
    });

    // Delete the department
    await db.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
