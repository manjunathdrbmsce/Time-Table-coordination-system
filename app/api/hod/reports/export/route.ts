import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import XLSX from 'xlsx-js-style'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SLOTS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Slot 6', 'Slot 7', 'Slot 8']
const TOTAL_WEEKLY_SLOTS = DAYS.length * SLOTS.length
const SLOT_TIME_MAP: Record<string, string> = {
  'Slot 1': '8:00-8:55',
  'Slot 2': '8:55-9:50',
  'Slot 3': '9:50-10:45',
  'Slot 4': '11:15-12:10',
  'Slot 5': '12:10-1:05',
  'Slot 6': '1:05-2:00 / 2:00-2:55',
  'Slot 7': '2:50-3:50',
  'Slot 8': '3:50-4:45',
}

const styles = {
  title: { font: { bold: true, sz: 16, color: { rgb: '17365D' } } },
  subtitle: { font: { sz: 11, color: { rgb: '666666' } } },
  header: {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '17365D' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  },
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '')
}

function appendSheet(workbook: XLSX.WorkBook, sheetName: string, rows: unknown[][], widths: number[] = []) {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const headerRow = rows.findIndex(row => row.length > 1)
  if (headerRow >= 0) {
    for (let col = 0; col < rows[headerRow].length; col++) {
      const ref = XLSX.utils.encode_cell({ r: headerRow, c: col })
      if (sheet[ref]) sheet[ref].s = styles.header
    }
  }
  if (sheet.A1) sheet.A1.s = styles.title
  if (sheet.A2) sheet.A2.s = styles.subtitle
  if (widths.length > 0) sheet['!cols'] = widths.map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31))
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['HOD', 'ADMIN'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const departmentId = session.user.role === 'HOD'
      ? session.user.departmentId
      : searchParams.get('departmentId') || session.user.departmentId

    if (!departmentId) return NextResponse.json({ error: 'No department assigned' }, { status: 400 })

    const activeSession = await db.academicSession.findFirst({ where: { isActive: true } })
    if (!activeSession) return NextResponse.json({ error: 'No active session found' }, { status: 400 })

    const [department, sections, rooms, faculties, subjects, slotRequests] = await Promise.all([
      db.department.findUnique({ where: { id: departmentId } }),
      db.section.findMany({
        where: { departmentId, sessionId: activeSession.id },
        include: {
          semester: true,
          allocations: {
            where: { sessionId: activeSession.id, allocationType: { not: 'FREE' }, NOT: { subject: { in: ['-', ''] } } },
            include: { room: { select: { code: true, logicalName: true, actualName: true } } },
          },
          facultyMappings: {
            include: {
              faculty: { select: { name: true, initials: true } },
              subject: { select: { name: true, code: true, type: true } },
            },
          },
        },
        orderBy: [{ year: 'asc' }, { division: 'asc' }],
      }),
      db.room.findMany({
        where: { departmentId },
        include: {
          building: { select: { name: true, code: true } },
          allocations: {
            where: { sessionId: activeSession.id, section: { departmentId }, allocationType: { not: 'FREE' }, NOT: { subject: { in: ['-', ''] } } },
            include: { section: { include: { semester: true, department: true } } },
          },
        },
        orderBy: [{ type: 'asc' }, { code: 'asc' }],
      }),
      db.faculty.findMany({ where: { departmentId }, orderBy: { name: 'asc' } }),
      db.subject.findMany({ where: { departmentId }, orderBy: [{ semesterNum: 'asc' }, { code: 'asc' }] }),
      db.slotRequest.findMany({ where: { sessionId: activeSession.id, section: { departmentId } } }),
    ])

    if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

    const allocations = sections.flatMap(section => section.allocations.map(allocation => ({ section, allocation })))
    const theoryAllocations = allocations.filter(({ allocation }) => allocation.type === 'THEORY').length
    const labAllocations = allocations.filter(({ allocation }) => allocation.type === 'LAB').length
    const requiredTheory = sections.reduce((sum, section) => sum + section.requiredTheoryHours, 0)
    const requiredLab = sections.reduce((sum, section) => sum + section.requiredLabHours, 0)
    const totalRequired = requiredTheory + requiredLab
    const totalAllocated = theoryAllocations + labAllocations
    const totalRoomSlots = rooms.length * TOTAL_WEEKLY_SLOTS
    const occupiedRoomSlots = rooms.reduce((sum, room) => sum + room.allocations.length, 0)
    const workbook = XLSX.utils.book_new()
    const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

    appendSheet(workbook, 'Executive Summary', [
      [`${department.code} Department Report`],
      [`Session: ${activeSession.name} | Generated: ${generatedAt}`],
      [],
      ['Metric', 'Value'],
      ['Sections', sections.length],
      ['Department Rooms', rooms.length],
      ['Subjects', subjects.length],
      ['Faculty', faculties.length],
      ['Total Allocations', totalAllocated],
      ['Theory Allocations', theoryAllocations],
      ['Lab Allocations', labAllocations],
      ['Required Hours', totalRequired],
      ['Completion %', `${pct(totalAllocated, totalRequired)}%`],
      ['Room Weekly Slots', totalRoomSlots],
      ['Occupied Room Slots', occupiedRoomSlots],
      ['Free Room Slots', Math.max(totalRoomSlots - occupiedRoomSlots, 0)],
      ['Room Utilization %', `${pct(occupiedRoomSlots, totalRoomSlots)}%`],
      ['Pending Slot Requests', slotRequests.filter(request => request.status === 'PENDING').length],
    ], [30, 24])

    appendSheet(workbook, 'Section Completion', [
      ['Section Completion'], [`Session: ${activeSession.name}`], [],
      ['Section', 'Semester', 'Students', 'Theory', 'Theory Required', 'Lab', 'Lab Required', 'Total', 'Required', 'Completion %', 'Mapped Subjects'],
      ...sections.map(section => {
        const theory = section.allocations.filter(allocation => allocation.type === 'THEORY').length
        const lab = section.allocations.filter(allocation => allocation.type === 'LAB').length
        const total = theory + lab
        const required = section.requiredTheoryHours + section.requiredLabHours
        return [`${department.code}-${section.year}${section.division}`, section.semester.code, section.studentCount, theory, section.requiredTheoryHours, lab, section.requiredLabHours, total, required, `${pct(total, required)}%`, section.facultyMappings.length]
      }),
    ], [16, 14, 10, 10, 16, 10, 14, 10, 10, 14, 16])

    appendSheet(workbook, 'Room Utilization', [
      ['Room Utilization'], [`Session: ${activeSession.name}`], [],
      ['Room', 'Name', 'Type', 'Building', 'Capacity', 'Occupied', 'Free', 'Total Slots', 'Utilization %'],
      ...rooms.map(room => [room.code, room.actualName || room.logicalName, room.type, room.building?.name || '', room.capacity, room.allocations.length, Math.max(TOTAL_WEEKLY_SLOTS - room.allocations.length, 0), TOTAL_WEEKLY_SLOTS, `${pct(room.allocations.length, TOTAL_WEEKLY_SLOTS)}%`]),
    ], [16, 24, 14, 20, 10, 10, 10, 12, 14])

    const roomSlotMap = new Map<string, Set<string>>()
    rooms.forEach(room => roomSlotMap.set(room.id, new Set(room.allocations.map(allocation => `${allocation.day}|${allocation.startTime}`))))
    appendSheet(workbook, 'Free Slots', [
      ['Free Slots'], [`Session: ${activeSession.name}`], [],
      ['Room', 'Type', 'Day', 'Slot', 'Time'],
      ...rooms.flatMap(room => {
        const occupied = roomSlotMap.get(room.id) || new Set<string>()
        return DAYS.flatMap(day => SLOTS.filter(slot => !occupied.has(`${day}|${slot}`)).map(slot => [room.code, room.type, day, slot, SLOT_TIME_MAP[slot] || slot]))
      }),
    ], [16, 14, 14, 12, 22])

    appendSheet(workbook, 'Day Distribution', [
      ['Day-wise Distribution'], [`Session: ${activeSession.name}`], [],
      ['Day', 'Theory', 'Lab', 'Total'],
      ...DAYS.map(day => {
        const dayAllocations = allocations.filter(({ allocation }) => allocation.day === day)
        const theory = dayAllocations.filter(({ allocation }) => allocation.type === 'THEORY').length
        const lab = dayAllocations.filter(({ allocation }) => allocation.type === 'LAB').length
        return [day, theory, lab, theory + lab]
      }),
    ], [14, 10, 10, 10])

    appendSheet(workbook, 'Faculty Load', [
      ['Faculty Load'], [`Session: ${activeSession.name}`], [],
      ['Faculty', 'Initials', 'Designation', 'Mapped Sections', 'Mapped Subjects'],
      ...faculties.map(faculty => {
        const facultyMappings = sections.flatMap(section => section.facultyMappings).filter(mapping => mapping.facultyId === faculty.id)
        return [faculty.name, faculty.initials, faculty.designation || '', new Set(facultyMappings.map(mapping => mapping.sectionId)).size, new Set(facultyMappings.map(mapping => mapping.subjectId)).size]
      }),
    ], [28, 12, 20, 16, 16])

    appendSheet(workbook, 'Allocations', [
      ['Raw Allocations'], [`Session: ${activeSession.name}`], [],
      ['Section', 'Semester', 'Day', 'Slot', 'Time', 'Room', 'Subject', 'Faculty', 'Type'],
      ...allocations.map(({ section, allocation }) => [`${department.code}-${section.year}${section.division}`, section.semester.code, allocation.day, allocation.startTime, SLOT_TIME_MAP[allocation.startTime] || allocation.startTime, allocation.room.actualName || allocation.room.logicalName || allocation.room.code, allocation.subject, allocation.faculty, allocation.type]),
    ], [16, 12, 14, 12, 22, 18, 28, 24, 12])

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const filename = `HOD_${safeFilePart(department.code)}_${safeFilePart(activeSession.name)}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting HOD report:', error)
    return NextResponse.json({ error: 'Failed to export HOD report' }, { status: 500 })
  }
}