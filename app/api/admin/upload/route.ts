import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  { start: "Slot 1", end: "Slot 1" },
  { start: "Slot 2", end: "Slot 2" },
  { start: "Slot 3", end: "Slot 3" },
  { start: "Slot 4", end: "Slot 4" },
  { start: "Slot 5", end: "Slot 5" },
  { start: "Slot 6", end: "Slot 6" },
  { start: "Slot 7", end: "Slot 7" },
  { start: "Slot 8", end: "Slot 8" },
];

const SUMMARY_SHEETS = new Set(["Overall Summary", "Room Utilization"]);
const TOTAL_ROOM_SLOTS = DAYS.length * TIME_SLOTS.length;

type ParsedSectionLabel = {
  departmentCode: string;
  semesterNum: number;
  division: string;
  label: string;
};

type CurrentRoom = {
  id: string;
  code: string;
  logicalName: string;
  actualName: string;
  type: "CLASSROOM" | "LAB";
  ownerDepartmentCode?: string;
};

type SlotColumn = {
  columnIndex: number;
  slot: string;
};

function getCell(row: unknown[], index: number) {
  return String(row[index] ?? "").trim();
}

function isEmptySlot(value: string) {
  return !value || value === "-" || value.toLowerCase() === "free";
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function parseSectionLabel(value: string): ParsedSectionLabel | null {
  const label = value.trim().toUpperCase();
  const match = label.match(/^([A-Z]+)-?(\d+)([A-Z]+)$/);

  if (!match) {
    return null;
  }

  return {
    departmentCode: match[1],
    semesterNum: parseInt(match[2], 10),
    division: match[3],
    label,
  };
}

function parseRoomHeader(value: string) {
  const header = value.trim();
  const match = header.match(
    /^(?:([A-Z]+)::)?((?:CR|Lab)\s*\d+)\s*\(([^)]+)\)(?:\s*\[([^\]]+)\])?/i
  );

  if (!match) {
    return null;
  }

  const logicalName = match[2].replace(/\s+/g, " ").trim();
  const actualName = match[3].trim();
  const ownerDepartmentCode = (match[4] || match[1] || "").trim().toUpperCase();

  return {
    logicalName,
    actualName,
    ownerDepartmentCode,
    type: logicalName.toLowerCase().startsWith("lab")
      ? ("LAB" as const)
      : ("CLASSROOM" as const),
  };
}
function parseSlotColumns(row: unknown[]): SlotColumn[] {
  const columns: SlotColumn[] = [];

  row.forEach((cell, columnIndex) => {
    const value = String(cell ?? "").trim();
    const match = value.match(/^Slot\s*(\d+)$/i);
    if (!match) return;

    const slotNumber = parseInt(match[1], 10);
    const timeSlot = TIME_SLOTS[slotNumber - 1];
    if (!timeSlot) return;

    columns.push({ columnIndex, slot: timeSlot.start });
  });

  return columns;
}

function parseHoursTarget(value: unknown) {
  const match = String(value ?? "").match(/\/\s*(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function fallbackSlotColumns(): SlotColumn[] {
  return TIME_SLOTS.map((slot, index) => ({
    columnIndex: index + 1,
    slot: slot.start,
  }));
}

async function ensureDepartment(code: string, name?: string) {
  const normalizedCode = code.trim().toUpperCase();

  return db.department.upsert({
    where: { code: normalizedCode },
    update: name ? { name } : {},
    create: {
      code: normalizedCode,
      name: name || `${normalizedCode} Department`,
      statistics: { create: {} },
    },
  });
}

async function ensureSemester(departmentId: string, departmentCode: string, semesterNum: number) {
  const semCode = `${departmentCode}-S${semesterNum}`;

  return db.semester.upsert({
    where: { code: semCode },
    update: { departmentId },
    create: {
      code: semCode,
      name: `Semester ${semesterNum}`,
      departmentId,
      isActive: true,
    },
  });
}

async function ensureSection(
  sectionLabel: ParsedSectionLabel,
  sessionId: string,
  requiredTheoryHours?: number,
  requiredLabHours?: number
) {
  const dept = await ensureDepartment(sectionLabel.departmentCode);
  const semester = await ensureSemester(
    dept.id,
    sectionLabel.departmentCode,
    sectionLabel.semesterNum
  );

  const existing = await db.section.findUnique({
    where: {
      departmentId_semesterId_year_division: {
        departmentId: dept.id,
        semesterId: semester.id,
        year: sectionLabel.semesterNum,
        division: sectionLabel.division,
      },
    },
  });

  const data = {
    sessionId,
    ...(requiredTheoryHours !== undefined ? { requiredTheoryHours } : {}),
    ...(requiredLabHours !== undefined ? { requiredLabHours } : {}),
  };

  if (existing) {
    if (existing.sessionId && existing.sessionId !== sessionId) {
      throw new Error(
        `Section ${sectionLabel.label} already belongs to another academic session. Cannot reuse it without risking old timetable data.`
      );
    }

    return db.section.update({
      where: { id: existing.id },
      data,
    });
  }

  return db.section.create({
    data: {
      departmentId: dept.id,
      semesterId: semester.id,
      sessionId,
      year: sectionLabel.semesterNum,
      division: sectionLabel.division,
      studentCount: 60,
      requiredTheoryHours: requiredTheoryHours ?? 25,
      requiredLabHours: requiredLabHours ?? 15,
    },
  });
}

async function ensureRoom(roomHeader: NonNullable<ReturnType<typeof parseRoomHeader>>) {
  const ownerDepartment = roomHeader.ownerDepartmentCode
    ? await ensureDepartment(roomHeader.ownerDepartmentCode)
    : null;
  const roomCode = normalizeCode(roomHeader.actualName);

  const existingByActualName = await db.room.findFirst({
    where: { actualName: roomHeader.actualName },
  });

  if (existingByActualName) {
    return db.room.update({
      where: { id: existingByActualName.id },
      data: {
        logicalName: roomHeader.logicalName,
        actualName: roomHeader.actualName,
        type: roomHeader.type,
        departmentId: ownerDepartment?.id ?? existingByActualName.departmentId,
      },
    });
  }

  const existingByCode = await db.room.findUnique({
    where: { code: roomCode },
  });

  if (existingByCode) {
    return db.room.update({
      where: { id: existingByCode.id },
      data: {
        logicalName: roomHeader.logicalName,
        actualName: roomHeader.actualName,
        type: roomHeader.type,
        departmentId: ownerDepartment?.id ?? existingByCode.departmentId,
      },
    });
  }

  return db.room.create({
    data: {
      code: roomCode,
      logicalName: roomHeader.logicalName,
      actualName: roomHeader.actualName,
      type: roomHeader.type,
      departmentId: ownerDepartment?.id,
    },
  });
}

function parseAllocationCell(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);
  const parsedSection = parseSectionLabel(parts[0] || "");

  if (!parsedSection) {
    return null;
  }

  const subject = parts.length > 1 ? parts.slice(1, -1).join(" ") || "TBD" : "TBD";
  const faculty = parts.length > 2 ? parts[parts.length - 1] : "-";

  return {
    sectionLabel: parsedSection,
    subject,
    faculty,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const academicYear = formData.get("academicYear") as string;
    const semester = formData.get("semester") as string;
    const roomFile = formData.get("roomFile") as File | null;
    const sectionFile = formData.get("sectionFile") as File | null;

    if (!academicYear || !semester) {
      return NextResponse.json(
        { error: "Academic year and semester are required" },
        { status: 400 }
      );
    }

    const activeSession = await db.academicSession.findFirst({
      where: { isActive: true },
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active academic session found. Please create and activate a session first." },
        { status: 400 }
      );
    }

    const userExists = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "Session expired. Please log out and log back in." },
        { status: 401 }
      );
    }

    const upload = await db.timetableUpload.create({
      data: {
        academicYear,
        semester,
        roomFileName: roomFile?.name,
        sectionFileName: sectionFile?.name,
        status: "PROCESSING",
        uploadedById: session.user.id,
        sessionId: activeSession.id,
      },
    });

    try {
      if (sectionFile) {
        const buffer = await sectionFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        await parseSectionTimetable(workbook, activeSession.id);
      }

      if (roomFile) {
        const buffer = await roomFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        await parseRoomTimetable(workbook, upload.id, activeSession.id);
      }

      await db.timetableUpload.updateMany({
        where: {
          isActive: true,
          id: { not: upload.id },
        },
        data: { isActive: false, status: "ARCHIVED" },
      });

      await db.timetableUpload.update({
        where: { id: upload.id },
        data: { status: "ACTIVE", isActive: true },
      });

      await recalculateAllStatistics(activeSession.id);

      return NextResponse.json({
        success: true,
        uploadId: upload.id,
        message: "Timetables uploaded and processed successfully",
      });
    } catch (parseError) {
      await db.timetableUpload.update({
        where: { id: upload.id },
        data: {
          status: "FAILED",
          errorMessage:
            parseError instanceof Error ? parseError.message : "Parse error",
        },
      });
      throw parseError;
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload timetables",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function parseRoomTimetable(workbook: XLSX.WorkBook, uploadId: string, sessionId: string) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  let currentRoom: CurrentRoom | null = null;
  let currentSlotColumns: SlotColumn[] = fallbackSlotColumns();

  for (const row of data) {
    if (!row || row.length === 0) continue;

    const firstCell = getCell(row, 0);
    const roomHeader = parseRoomHeader(firstCell);

    if (roomHeader) {
      const room = await ensureRoom(roomHeader);
      currentRoom = {
        id: room.id,
        code: room.code,
        logicalName: room.logicalName,
        actualName: room.actualName || roomHeader.actualName,
        type: room.type === "LAB" ? "LAB" : "CLASSROOM",
        ownerDepartmentCode: roomHeader.ownerDepartmentCode,
      };
      currentSlotColumns = fallbackSlotColumns();
      continue;
    }

    const parsedSlotColumns = parseSlotColumns(row);
    if (parsedSlotColumns.length > 0) {
      currentSlotColumns = parsedSlotColumns;
      continue;
    }

    const day = DAYS.find((d) => firstCell.toLowerCase() === d.toLowerCase());
    if (!day || !currentRoom?.id) continue;

    for (const slotColumn of currentSlotColumns) {
      const cellValue = getCell(row, slotColumn.columnIndex);
      if (isEmptySlot(cellValue)) continue;

      const allocationData = parseAllocationCell(cellValue);
      if (!allocationData) continue;

      const section = await ensureSection(allocationData.sectionLabel, sessionId);
      const allocType = currentRoom.type === "LAB" ? "LAB" : "THEORY";

      await db.allocation.upsert({
        where: {
          roomId_day_startTime_sessionId: {
            roomId: currentRoom.id,
            day,
            startTime: slotColumn.slot,
            sessionId,
          },
        },
        update: {
          subject: allocationData.subject,
          faculty: allocationData.faculty,
          type: allocType,
          sectionId: section.id,
          uploadId,
          allocationType: "ALLOCATED",
        },
        create: {
          roomId: currentRoom.id,
          sectionId: section.id,
          uploadId,
          sessionId,
          day,
          startTime: slotColumn.slot,
          endTime: slotColumn.slot,
          subject: allocationData.subject,
          faculty: allocationData.faculty,
          type: allocType,
          allocationType: "ALLOCATED",
        },
      });
    }
  }
}

async function parseSectionTimetable(workbook: XLSX.WorkBook, sessionId: string) {
  for (const sheetName of workbook.SheetNames) {
    if (SUMMARY_SHEETS.has(sheetName)) {
      continue;
    }

    await ensureDepartment(sheetName);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

    let currentSectionLabel: ParsedSectionLabel | null = null;

    for (const row of data) {
      if (!row || row.length === 0) continue;

      const firstCell = getCell(row, 0);
      const labelFromFirstCell = parseSectionLabel(firstCell);

      if (labelFromFirstCell) {
        currentSectionLabel = labelFromFirstCell;
        await ensureSection(currentSectionLabel, sessionId);
        continue;
      }

      const legacySemesterMatch = firstCell.match(/Semester\s*(\d+)|S(\d+)/i);
      if (legacySemesterMatch) {
        const semesterNum = parseInt(legacySemesterMatch[1] || legacySemesterMatch[2], 10);
        const dept = await ensureDepartment(sheetName);
        await ensureSemester(dept.id, sheetName.toUpperCase(), semesterNum);
        continue;
      }

      const secondCell = getCell(row, 1);
      if (secondCell.toLowerCase() === "total" && currentSectionLabel) {
        await ensureSection(
          currentSectionLabel,
          sessionId,
          parseHoursTarget(row[10]),
          parseHoursTarget(row[11])
        );
      }
    }
  }
}

async function recalculateAllStatistics(sessionId: string) {
  const departments = await db.department.findMany({
    include: {
      sections: {
        where: { sessionId },
        include: {
          allocations: { where: { sessionId } },
        },
      },
      rooms: true,
    },
  });

  for (const dept of departments) {
    let totalTheory = 0;
    let totalLab = 0;
    let targetTheory = 0;
    let targetLab = 0;

    for (const section of dept.sections) {
      const theoryHrs = section.allocations.filter((a) => a.type === "THEORY").length;
      const labHrs = section.allocations.filter((a) => a.type === "LAB").length;
      totalTheory += theoryHrs;
      totalLab += labHrs;
      targetTheory += section.requiredTheoryHours;
      targetLab += section.requiredLabHours;
    }

    const total = targetTheory + targetLab;
    const achieved = totalTheory + totalLab;
    const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;

    await db.departmentStats.upsert({
      where: { departmentId: dept.id },
      update: {
        totalSections: dept.sections.length,
        totalRooms: dept.rooms.length,
        targetClassHours: targetTheory,
        achievedClassHours: totalTheory,
        classGapHours: Math.max(0, targetTheory - totalTheory),
        targetLabHours: targetLab,
        achievedLabHours: totalLab,
        labGapHours: Math.max(0, targetLab - totalLab),
        allocationPercent: pct,
        lastUpdated: new Date(),
      },
      create: {
        departmentId: dept.id,
        totalSections: dept.sections.length,
        totalRooms: dept.rooms.length,
        targetClassHours: targetTheory,
        achievedClassHours: totalTheory,
        classGapHours: Math.max(0, targetTheory - totalTheory),
        targetLabHours: targetLab,
        achievedLabHours: totalLab,
        labGapHours: Math.max(0, targetLab - totalLab),
        allocationPercent: pct,
      },
    });
  }

  const rooms = await db.room.findMany({
    include: {
      allocations: {
        where: {
          sessionId,
          allocationType: { not: "FREE" },
        },
      },
    },
  });

  for (const room of rooms) {
    const occupiedSlots = room.allocations.length;
    const freeSlots = Math.max(0, TOTAL_ROOM_SLOTS - occupiedSlots);
    const utilizationPct = Math.round((occupiedSlots / TOTAL_ROOM_SLOTS) * 100);

    await db.roomStats.upsert({
      where: { roomId: room.id },
      update: {
        totalSlots: TOTAL_ROOM_SLOTS,
        occupiedSlots,
        freeSlots,
        utilizationPct,
        lastUpdated: new Date(),
      },
      create: {
        roomId: room.id,
        totalSlots: TOTAL_ROOM_SLOTS,
        occupiedSlots,
        freeSlots,
        utilizationPct,
      },
    });
  }
}
