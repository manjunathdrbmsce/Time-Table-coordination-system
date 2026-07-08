import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET - Create and download database backup
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Collect all data from the database in order (respecting foreign key dependencies)
    const backup = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      createdBy: session.user.email,
      
      // Core entities (no dependencies)
      buildings: await db.building.findMany(),
      academicSessions: await db.academicSession.findMany(),
      departments: await db.department.findMany(),
      
      // Users (depends on departments)
      users: await db.user.findMany({
        select: {
          id: true,
          email: true,
          password: true, // Hashed password
          name: true,
          role: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      
      // Semesters (depends on departments)
      semesters: await db.semester.findMany(),
      
      // Rooms (depends on departments, buildings)
      rooms: await db.room.findMany(),
      
      // Sections (depends on departments, semesters, sessions)
      sections: await db.section.findMany(),
      
      // Subjects (depends on departments)
      subjects: await db.subject.findMany(),
      
      // Faculty (depends on departments)
      faculties: await db.faculty.findMany(),
      
      // Faculty Mappings (depends on faculty, subjects, sections)
      facultyMappings: await db.facultySubjectMapping.findMany(),
      
      // Allocations (depends on sections, rooms, sessions, faculty)
      allocations: await db.allocation.findMany(),
      
      // Stats (depends on departments, rooms)
      departmentStats: await db.departmentStats.findMany(),
      roomStats: await db.roomStats.findMany(),
      
      // Slot Requests (depends on sections, rooms, sessions, users)
      slotRequests: await db.slotRequest.findMany(),
      
      // Approvals (depends on slot requests, users, departments)
      approvals: await db.approval.findMany(),
      
      // Uploads (depends on users, sessions)
      timetableUploads: await db.timetableUpload.findMany(),
      
      // Audit logs (depends on users)
      auditLogs: await db.auditLog.findMany(),
    };

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `timetable_backup_${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// GET backup info (metadata only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts of all entities
    const stats = {
      buildings: await db.building.count(),
      academicSessions: await db.academicSession.count(),
      departments: await db.department.count(),
      users: await db.user.count(),
      semesters: await db.semester.count(),
      rooms: await db.room.count(),
      sections: await db.section.count(),
      subjects: await db.subject.count(),
      faculties: await db.faculty.count(),
      facultyMappings: await db.facultySubjectMapping.count(),
      allocations: await db.allocation.count(),
      slotRequests: await db.slotRequest.count(),
      approvals: await db.approval.count(),
      timetableUploads: await db.timetableUpload.count(),
      auditLogs: await db.auditLog.count(),
    };

    return NextResponse.json({
      stats,
      totalRecords: Object.values(stats).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error("Error fetching backup info:", error);
    return NextResponse.json(
      { error: "Failed to fetch backup info" },
      { status: 500 }
    );
  }
}
