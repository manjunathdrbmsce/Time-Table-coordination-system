import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface BackupData {
  version: string;
  createdAt: string;
  createdBy: string;
  buildings: any[];
  academicSessions: any[];
  departments: any[];
  users: any[];
  semesters: any[];
  rooms: any[];
  sections: any[];
  subjects: any[];
  faculties: any[];
  facultyMappings: any[];
  allocations: any[];
  departmentStats: any[];
  roomStats: any[];
  slotRequests: any[];
  approvals: any[];
  timetableUploads: any[];
  auditLogs: any[];
}

// POST - Restore database from backup
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backup: BackupData = await request.json();

    // Validate backup structure
    if (!backup.version || !backup.createdAt) {
      return NextResponse.json(
        { error: "Invalid backup file format" },
        { status: 400 }
      );
    }

    // Use a transaction for complete restore
    await db.$transaction(async (tx) => {
      // Step 1: Delete all existing data in reverse dependency order
      console.log("Clearing existing data...");
      
      // Delete dependent tables first
      await tx.auditLog.deleteMany({});
      await tx.approval.deleteMany({});
      await tx.slotRequest.deleteMany({});
      await tx.timetableUpload.deleteMany({});
      await tx.roomStats.deleteMany({});
      await tx.departmentStats.deleteMany({});
      await tx.allocation.deleteMany({});
      await tx.facultySubjectMapping.deleteMany({});
      await tx.faculty.deleteMany({});
      await tx.subject.deleteMany({});
      await tx.section.deleteMany({});
      await tx.room.deleteMany({});
      await tx.semester.deleteMany({});
      await tx.user.deleteMany({});
      await tx.department.deleteMany({});
      await tx.academicSession.deleteMany({});
      await tx.building.deleteMany({});

      // Step 2: Restore data in correct order (respecting foreign keys)
      console.log("Restoring data...");

      // 1. Buildings (no dependencies)
      if (backup.buildings?.length > 0) {
        for (const building of backup.buildings) {
          await tx.building.create({
            data: {
              id: building.id,
              name: building.name,
              code: building.code,
              address: building.address,
              floors: building.floors,
              createdAt: new Date(building.createdAt),
              updatedAt: new Date(building.updatedAt),
            },
          });
        }
      }

      // 2. Academic Sessions (no dependencies)
      if (backup.academicSessions?.length > 0) {
        for (const session of backup.academicSessions) {
          await tx.academicSession.create({
            data: {
              id: session.id,
              name: session.name,
              academicYear: session.academicYear,
              semesterType: session.semesterType,
              isActive: session.isActive,
              startDate: session.startDate ? new Date(session.startDate) : null,
              endDate: session.endDate ? new Date(session.endDate) : null,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt),
            },
          });
        }
      }

      // 3. Departments (no dependencies)
      if (backup.departments?.length > 0) {
        for (const dept of backup.departments) {
          await tx.department.create({
            data: {
              id: dept.id,
              code: dept.code,
              name: dept.name,
              createdAt: new Date(dept.createdAt),
              updatedAt: new Date(dept.updatedAt),
            },
          });
        }
      }

      // 4. Users (depends on departments)
      if (backup.users?.length > 0) {
        for (const user of backup.users) {
          await tx.user.create({
            data: {
              id: user.id,
              email: user.email,
              password: user.password,
              name: user.name,
              role: user.role,
              departmentId: user.departmentId,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          });
        }
      }

      // 5. Semesters (depends on departments)
      if (backup.semesters?.length > 0) {
        for (const semester of backup.semesters) {
          await tx.semester.create({
            data: {
              id: semester.id,
              name: semester.name,
              code: semester.code,
              startDate: semester.startDate ? new Date(semester.startDate) : null,
              endDate: semester.endDate ? new Date(semester.endDate) : null,
              isActive: semester.isActive,
              departmentId: semester.departmentId,
              createdAt: new Date(semester.createdAt),
            },
          });
        }
      }

      // 6. Rooms (depends on departments, buildings)
      if (backup.rooms?.length > 0) {
        for (const room of backup.rooms) {
          await tx.room.create({
            data: {
              id: room.id,
              logicalName: room.logicalName,
              actualName: room.actualName,
              code: room.code,
              type: room.type,
              capacity: room.capacity,
              departmentId: room.departmentId,
              buildingId: room.buildingId,
              createdAt: new Date(room.createdAt),
              updatedAt: new Date(room.updatedAt),
            },
          });
        }
      }

      // 7. Sections (depends on departments, semesters, sessions)
      if (backup.sections?.length > 0) {
        for (const section of backup.sections) {
          await tx.section.create({
            data: {
              id: section.id,
              departmentId: section.departmentId,
              semesterId: section.semesterId,
              sessionId: section.sessionId,
              year: section.year,
              division: section.division,
              studentCount: section.studentCount,
              requiredTheoryHours: section.requiredTheoryHours,
              requiredLabHours: section.requiredLabHours,
              createdAt: new Date(section.createdAt),
              updatedAt: new Date(section.updatedAt),
            },
          });
        }
      }

      // 8. Subjects (depends on departments)
      if (backup.subjects?.length > 0) {
        for (const subject of backup.subjects) {
          await tx.subject.create({
            data: {
              id: subject.id,
              code: subject.code,
              name: subject.name,
              shortName: subject.shortName,
              type: subject.type,
              credits: subject.credits || 3,
              hoursPerWeek: subject.hoursPerWeek,
              departmentId: subject.departmentId,
              semesterNum: subject.semesterNum || 1,
              createdAt: new Date(subject.createdAt),
              updatedAt: new Date(subject.updatedAt),
            },
          });
        }
      }

      // 9. Faculty (depends on departments)
      if (backup.faculties?.length > 0) {
        for (const faculty of backup.faculties) {
          await tx.faculty.create({
            data: {
              id: faculty.id,
              name: faculty.name,
              initials: faculty.initials,
              email: faculty.email,
              phone: faculty.phone,
              departmentId: faculty.departmentId,
              createdAt: new Date(faculty.createdAt),
              updatedAt: new Date(faculty.updatedAt),
            },
          });
        }
      }

      // 10. Faculty Mappings (depends on faculty, subjects, sections)
      if (backup.facultyMappings?.length > 0) {
        for (const mapping of backup.facultyMappings) {
          await tx.facultySubjectMapping.create({
            data: {
              id: mapping.id,
              facultyId: mapping.facultyId,
              subjectId: mapping.subjectId,
              sectionId: mapping.sectionId,
              createdAt: new Date(mapping.createdAt),
              updatedAt: new Date(mapping.updatedAt),
            },
          });
        }
      }

      // 11. Timetable Uploads (depends on users, sessions - must be before Allocations)
      if (backup.timetableUploads?.length > 0) {
        for (const upload of backup.timetableUploads) {
          await tx.timetableUpload.create({
            data: {
              id: upload.id,
              academicYear: upload.academicYear,
              semester: upload.semester,
              fileName: upload.fileName,
              roomFileName: upload.roomFileName,
              sectionFileName: upload.sectionFileName,
              fileType: upload.fileType,
              status: upload.status,
              isActive: upload.isActive,
              errorMessage: upload.errorMessage,
              uploadedById: upload.uploadedById,
              sessionId: upload.sessionId,
              createdAt: new Date(upload.createdAt),
            },
          });
        }
      }

      // 12. Allocations (depends on sections, rooms, sessions, uploads)
      if (backup.allocations?.length > 0) {
        for (const alloc of backup.allocations) {
          await tx.allocation.create({
            data: {
              id: alloc.id,
              sectionId: alloc.sectionId,
              roomId: alloc.roomId,
              uploadId: alloc.uploadId,
              sessionId: alloc.sessionId,
              day: alloc.day,
              startTime: alloc.startTime,
              endTime: alloc.endTime,
              subject: alloc.subject,
              faculty: alloc.faculty,
              type: alloc.type,
              allocationType: alloc.allocationType || "ALLOCATED",
              subjectId: alloc.subjectId,
              facultyIds: alloc.facultyIds,
              isModified: alloc.isModified,
              createdAt: new Date(alloc.createdAt),
              updatedAt: new Date(alloc.updatedAt),
            },
          });
        }
      }

      // 12. Department Stats (depends on departments)
      if (backup.departmentStats?.length > 0) {
        for (const stats of backup.departmentStats) {
          await tx.departmentStats.create({
            data: {
              id: stats.id,
              departmentId: stats.departmentId,
              totalSections: stats.totalSections,
              totalRooms: stats.totalRooms,
              targetClassHours: stats.targetClassHours,
              achievedClassHours: stats.achievedClassHours,
              classGapHours: stats.classGapHours,
              targetLabHours: stats.targetLabHours,
              achievedLabHours: stats.achievedLabHours,
              labGapHours: stats.labGapHours,
              allocationPercent: stats.allocationPercent,
              lastUpdated: new Date(stats.lastUpdated),
              updatedAt: new Date(stats.updatedAt),
            },
          });
        }
      }

      // 13. Room Stats (depends on rooms)
      if (backup.roomStats?.length > 0) {
        for (const stats of backup.roomStats) {
          await tx.roomStats.create({
            data: {
              id: stats.id,
              roomId: stats.roomId,
              totalSlots: stats.totalSlots,
              occupiedSlots: stats.occupiedSlots,
              freeSlots: stats.freeSlots,
              utilizationPct: stats.utilizationPct,
              lastUpdated: new Date(stats.lastUpdated),
              updatedAt: new Date(stats.updatedAt),
            },
          });
        }
      }

      // 14. Slot Requests (depends on sections, rooms, sessions, users)
      if (backup.slotRequests?.length > 0) {
        for (const req of backup.slotRequests) {
          await tx.slotRequest.create({
            data: {
              id: req.id,
              requesterId: req.requesterId,
              roomId: req.roomId,
              sectionId: req.sectionId,
              sessionId: req.sessionId,
              day: req.day,
              startTime: req.startTime,
              endTime: req.endTime,
              reason: req.reason,
              status: req.status,
              createdAt: new Date(req.createdAt),
              updatedAt: new Date(req.updatedAt),
            },
          });
        }
      }

      // 16. Approvals (depends on slot requests, users, departments)
      if (backup.approvals?.length > 0) {
        for (const approval of backup.approvals) {
          await tx.approval.create({
            data: {
              id: approval.id,
              slotRequestId: approval.slotRequestId,
              approverId: approval.approverId,
              approverDeptId: approval.approverDeptId,
              decision: approval.decision,
              comment: approval.comment,
              createdAt: new Date(approval.createdAt),
            },
          });
        }
      }

      // 17. Audit Logs (depends on users)
      if (backup.auditLogs?.length > 0) {
        for (const log of backup.auditLogs) {
          await tx.auditLog.create({
            data: {
              id: log.id,
              userId: log.userId,
              action: log.action,
              entityType: log.entityType,
              entityId: log.entityId,
              details: log.details,
              createdAt: new Date(log.createdAt),
            },
          });
        }
      }
    }, {
      timeout: 120000, // 2 minutes timeout for large restores
    });

    // Get new counts after restore
    const newStats = {
      buildings: await db.building.count(),
      departments: await db.department.count(),
      users: await db.user.count(),
      rooms: await db.room.count(),
      sections: await db.section.count(),
      allocations: await db.allocation.count(),
    };

    return NextResponse.json({
      success: true,
      message: "Database restored successfully",
      restoredFrom: backup.createdAt,
      originalCreatedBy: backup.createdBy,
      stats: newStats,
    });
  } catch (error) {
    console.error("Error restoring database:", error);
    return NextResponse.json(
      { 
        error: "Failed to restore database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
