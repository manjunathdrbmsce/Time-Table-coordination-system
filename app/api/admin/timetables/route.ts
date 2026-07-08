import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params for selective deletion
    const { searchParams } = new URL(req.url);
    const deleteType = searchParams.get("type") || "allocations"; // allocations, all

    // Start a transaction to delete related data
    const result = await db.$transaction(async (tx) => {
      // Always delete allocations first (they reference other tables)
      const deletedAllocations = await tx.allocation.deleteMany({});
      
      // Delete slot requests
      const deletedSlotRequests = await tx.slotRequest.deleteMany({});
      
      // Delete timetable uploads
      const deletedUploads = await tx.timetableUpload.deleteMany({});

      // Reset room statistics
      await tx.roomStats.updateMany({
        data: {
          totalSlots: 48, // 8 slots x 6 days
          occupiedSlots: 0,
          freeSlots: 48,
          utilizationPct: 0,
        },
      });

      // Reset department statistics
      await tx.departmentStats.updateMany({
        data: {
          totalSections: 0,
          totalRooms: 0,
          allocationPercent: 0,
        },
      });

      if (deleteType === "all") {
        // Delete sections (this cascades to allocations already deleted)
        const deletedSections = await tx.section.deleteMany({});
        
        // Delete semesters
        const deletedSemesters = await tx.semester.deleteMany({});
        
        // Delete rooms (but keep them as infrastructure)
        // Uncomment next line to also delete rooms:
        // const deletedRooms = await tx.room.deleteMany({});

        return {
          allocations: deletedAllocations.count,
          slotRequests: deletedSlotRequests.count,
          uploads: deletedUploads.count,
          sections: deletedSections.count,
          semesters: deletedSemesters.count,
        };
      }

      return {
        allocations: deletedAllocations.count,
        slotRequests: deletedSlotRequests.count,
        uploads: deletedUploads.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Timetable data deleted successfully",
      deleted: result,
    });
  } catch (error) {
    console.error("Delete timetables error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete timetable data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get summary of timetable data
    const [
      allocationsCount,
      roomsCount,
      sectionsCount,
      uploadsCount,
      slotRequestsCount,
    ] = await Promise.all([
      db.allocation.count(),
      db.room.count(),
      db.section.count(),
      db.timetableUpload.count(),
      db.slotRequest.count(),
    ]);

    return NextResponse.json({
      allocations: allocationsCount,
      rooms: roomsCount,
      sections: sectionsCount,
      uploads: uploadsCount,
      slotRequests: slotRequestsCount,
    });
  } catch (error) {
    console.error("Get timetables summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timetable summary" },
      { status: 500 }
    );
  }
}
