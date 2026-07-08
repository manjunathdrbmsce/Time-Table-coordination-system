import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import XLSX from 'xlsx-js-style'

// Days and slots configuration
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SLOT_NAMES = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Slot 6', 'Slot 7', 'Slot 8']

// Time slots with timing information (55 minutes each) in 12-hour format
// For semesters 1-4: Lunch after Slot 5
const TIME_SLOTS_SEM_1_4: { slot: string; start: string; end: string }[] = [
  { slot: 'Slot 1', start: '8:00 AM', end: '8:55 AM' },
  { slot: 'Slot 2', start: '8:55 AM', end: '9:50 AM' },
  { slot: 'Slot 3', start: '9:50 AM', end: '10:45 AM' },
  { slot: 'Slot 4', start: '11:15 AM', end: '12:10 PM' },
  { slot: 'Slot 5', start: '12:10 PM', end: '1:05 PM' },
  { slot: 'Slot 6', start: '2:00 PM', end: '2:55 PM' },
  { slot: 'Slot 7', start: '2:55 PM', end: '3:50 PM' },
  { slot: 'Slot 8', start: '3:50 PM', end: '4:45 PM' },
];

// For semesters 5-8: Lunch after Slot 6
const TIME_SLOTS_SEM_5_8: { slot: string; start: string; end: string }[] = [
  { slot: 'Slot 1', start: '8:00 AM', end: '8:55 AM' },
  { slot: 'Slot 2', start: '8:55 AM', end: '9:50 AM' },
  { slot: 'Slot 3', start: '9:50 AM', end: '10:45 AM' },
  { slot: 'Slot 4', start: '11:15 AM', end: '12:10 PM' },
  { slot: 'Slot 5', start: '12:10 PM', end: '1:05 PM' },
  { slot: 'Slot 6', start: '1:05 PM', end: '2:00 PM' },
  { slot: 'Slot 7', start: '2:55 PM', end: '3:50 PM' },
  { slot: 'Slot 8', start: '3:50 PM', end: '4:45 PM' },
];

// Break configuration
const BREAKS = {
  COFFEE: { label: '☕ Coffee Break', time: '10:45 - 11:15 AM', afterSlot: 'Slot 3' },
  LUNCH_SEM_1_4: { label: '🍽️ Lunch Break', time: '1:05 - 2:00 PM', afterSlot: 'Slot 5' },
  LUNCH_SEM_5_8: { label: '🍽️ Lunch Break', time: '2:00 - 2:55 PM', afterSlot: 'Slot 6' },
};

// Helper to get semester number from semester code
function getSemesterNum(semCode: string): number {
  const match = semCode.match(/\d+/);
  return match ? parseInt(match[0]) : 5;
}

// Get time slots based on semester
function getTimeSlots(semesterNum: number) {
  return semesterNum <= 4 ? TIME_SLOTS_SEM_1_4 : TIME_SLOTS_SEM_5_8;
}

// Get lunch break position based on semester
function getLunchAfterSlot(semesterNum: number): string {
  return semesterNum <= 4 ? 'Slot 5' : 'Slot 6';
}

// Color palette for styling
const COLORS = {
  headerBg: { rgb: '1E3A5F' },        // Dark blue
  headerFont: { rgb: 'FFFFFF' },       // White
  theoryBg: { rgb: 'C8E6C9' },         // Light green
  labBg: { rgb: 'BBDEFB' },            // Light blue
  freeBg: { rgb: 'F5F5F5' },           // Light gray
  sectionBg: { rgb: 'FFF3E0' },        // Light orange
  totalBg: { rgb: 'E8EAF6' },          // Light purple
  dayBg: { rgb: 'FFFDE7' },            // Light yellow
  coffeeBg: { rgb: 'FFE0B2' },         // Light orange for coffee break
  lunchBg: { rgb: 'FFCC80' },          // Darker orange for lunch break
  breakFont: { rgb: '795548' },        // Brown text for breaks
  successFont: { rgb: '2E7D32' },      // Green text
  warningFont: { rgb: 'F57C00' },      // Orange text
  errorFont: { rgb: 'C62828' },        // Red text
}

// Cell styles
const styles = {
  header: {
    font: { bold: true, color: COLORS.headerFont, sz: 11 },
    fill: { fgColor: COLORS.headerBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    }
  },
  theory: {
    font: { sz: 10 },
    fill: { fgColor: COLORS.theoryBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  lab: {
    font: { sz: 10, bold: true },
    fill: { fgColor: COLORS.labBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  free: {
    font: { sz: 10, color: { rgb: '9E9E9E' } },
    fill: { fgColor: COLORS.freeBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E0E0E0' } },
      bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
      left: { style: 'thin', color: { rgb: 'E0E0E0' } },
      right: { style: 'thin', color: { rgb: 'E0E0E0' } },
    }
  },
  section: {
    font: { bold: true, sz: 11 },
    fill: { fgColor: COLORS.sectionBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  day: {
    font: { sz: 10 },
    fill: { fgColor: COLORS.dayBg },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  total: {
    font: { bold: true, sz: 10 },
    fill: { fgColor: COLORS.totalBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: '000000' } },
      bottom: { style: 'medium', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  title: {
    font: { bold: true, sz: 16, color: COLORS.headerBg },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  subtitle: {
    font: { sz: 12, color: { rgb: '616161' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  coffee: {
    font: { sz: 9, color: COLORS.breakFont, bold: true },
    fill: { fgColor: COLORS.coffeeBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  lunch: {
    font: { sz: 9, color: COLORS.breakFont, bold: true },
    fill: { fgColor: COLORS.lunchBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  breakHeader: {
    font: { bold: true, sz: 10, color: COLORS.breakFont },
    fill: { fgColor: COLORS.coffeeBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    }
  },
}

// Type definitions
interface AllocationData {
  day: string;
  startTime: string;
  type: string;
  subject: string;
  faculty: string;
  room: { code: string; actualName: string | null; type: string } | null;
  linkedSubject: { code: string; shortName: string | null; name: string } | null;
}

interface SectionData {
  id: string;
  year: number;
  division: string;
  studentCount: number;
  requiredTheoryHours: number;
  requiredLabHours: number;
  semester: { code: string; name: string };
  allocations: AllocationData[];
}

// Helper to apply style to a cell
function applyStyle(sheet: XLSX.WorkSheet, cellRef: string, style: object) {
  if (!sheet[cellRef]) sheet[cellRef] = { v: '' }
  sheet[cellRef].s = style
}

// Helper to get cell ref from row/col
function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col })
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN' && session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const departmentId = session.user.departmentId
    if (!departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    // Fetch department with all sections and their allocations
    const department = await db.department.findUnique({
      where: { id: departmentId },
      include: {
        sections: {
          include: {
            semester: true,
            allocations: {
              include: {
                room: { select: { code: true, actualName: true, type: true } },
                linkedSubject: { select: { code: true, shortName: true, name: true } },
              },
              orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
            },
          },
          orderBy: [
            { semester: { code: 'asc' } },
            { year: 'asc' },
            { division: 'asc' },
          ],
        },
      },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    const sections: SectionData[] = department.sections.map(s => ({
      id: s.id,
      year: s.year,
      division: s.division,
      studentCount: s.studentCount,
      requiredTheoryHours: s.requiredTheoryHours,
      requiredLabHours: s.requiredLabHours,
      semester: { code: s.semester.code, name: s.semester.name },
      allocations: s.allocations.map(a => ({
        day: a.day,
        startTime: a.startTime,
        type: a.type,
        subject: a.subject,
        faculty: a.faculty,
        room: a.room,
        linkedSubject: a.linkedSubject,
      })),
    }))

    // Group sections by semester
    const sectionsBySemester: Record<string, SectionData[]> = {}
    sections.forEach(section => {
      const semCode = section.semester.code
      if (!sectionsBySemester[semCode]) {
        sectionsBySemester[semCode] = []
      }
      sectionsBySemester[semCode].push(section)
    })

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // ============ SUMMARY SHEET ============
    const summaryData: (string | number)[][] = [
      ['📊 Department Timetable Summary'],
      [`Department: ${department.name} (${department.code})`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Section', 'Semester', 'Year', 'Division', 'Students', 'Theory Hrs', 'Req Theory', 'Lab Hrs', 'Req Lab', 'Total', 'Required', 'Completion %', 'Gaps'],
    ]

    sections.forEach(section => {
      const theoryHrs = section.allocations.filter(a => a.type === 'THEORY').length
      const labHrs = section.allocations.filter(a => a.type === 'LAB').length
      const totalHrs = theoryHrs + labHrs
      const requiredTotal = section.requiredTheoryHours + section.requiredLabHours
      const completionPct = requiredTotal > 0 ? Math.round((totalHrs / requiredTotal) * 100) : 0
      const gaps = calculateGaps(section.allocations)
      const label = `${section.semester.code}-${section.year}${section.division}`
      
      summaryData.push([
        label,
        section.semester.code,
        section.year,
        section.division,
        section.studentCount,
        theoryHrs,
        section.requiredTheoryHours,
        labHrs,
        section.requiredLabHours,
        totalHrs,
        requiredTotal,
        `${completionPct}%`,
        gaps,
      ])
    })

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Style summary sheet
    applyStyle(summarySheet, 'A1', styles.title)
    applyStyle(summarySheet, 'A2', styles.subtitle)
    applyStyle(summarySheet, 'A3', styles.subtitle)
    
    // Header row styling
    for (let col = 0; col < 13; col++) {
      applyStyle(summarySheet, cellRef(4, col), styles.header)
    }
    
    // Data row styling
    for (let row = 5; row < summaryData.length; row++) {
      for (let col = 0; col < 13; col++) {
        const style = col === 0 ? styles.section : { ...styles.day, alignment: { horizontal: 'center', vertical: 'center' } }
        applyStyle(summarySheet, cellRef(row, col), style)
      }
      // Color completion % based on value
      const completionCell = cellRef(row, 11)
      const completionVal = parseInt(String(summaryData[row][11] || '0'))
      if (completionVal >= 100) {
        applyStyle(summarySheet, completionCell, { ...styles.day, font: { ...styles.day.font, color: COLORS.successFont, bold: true } })
      } else if (completionVal >= 70) {
        applyStyle(summarySheet, completionCell, { ...styles.day, font: { ...styles.day.font, color: COLORS.warningFont } })
      } else {
        applyStyle(summarySheet, completionCell, { ...styles.day, font: { ...styles.day.font, color: COLORS.errorFont } })
      }
    }
    
    summarySheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
      { wch: 10 }, { wch: 14 }, { wch: 6 },
    ]
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // ============ ALL SECTIONS SHEET (Main colorful sheet) ============
    const allSectionsSheet = XLSX.utils.aoa_to_sheet([[]])
    let currentRow = 0

    // Title row
    XLSX.utils.sheet_add_aoa(allSectionsSheet, [['🗓️ All Section Timetables - ' + department.code]], { origin: { r: currentRow, c: 0 } })
    applyStyle(allSectionsSheet, cellRef(currentRow, 0), styles.title)
    currentRow += 2

    sections.forEach((section, sectionIdx) => {
      const label = `${section.semester.code}-${section.year}${section.division}`
      const theoryHrs = section.allocations.filter(a => a.type === 'THEORY').length
      const labHrs = section.allocations.filter(a => a.type === 'LAB').length
      const gaps = calculateGaps(section.allocations)
      
      // Get semester number to determine break positions
      const semesterNum = getSemesterNum(section.semester.code)
      const timeSlots = getTimeSlots(semesterNum)
      const lunchAfterSlot = getLunchAfterSlot(semesterNum)

      // Build header row with time slots and breaks
      const headerRow: string[] = ['Section', 'Day']
      const headerStyles: string[] = ['header', 'header']
      const columnWidths: number[] = [12, 12]
      
      timeSlots.forEach((ts, idx) => {
        headerRow.push(`${ts.slot}\n${ts.start} - ${ts.end}`)
        headerStyles.push('header')
        columnWidths.push(18)
        
        // Add coffee break after Slot 3
        if (ts.slot === 'Slot 3') {
          headerRow.push(`☕ Coffee\n${BREAKS.COFFEE.time}`)
          headerStyles.push('breakHeader')
          columnWidths.push(14)
        }
        
        // Add lunch break based on semester
        if (ts.slot === lunchAfterSlot) {
          const lunchBreak = semesterNum <= 4 ? BREAKS.LUNCH_SEM_1_4 : BREAKS.LUNCH_SEM_5_8
          headerRow.push(`🍽️ Lunch\n${lunchBreak.time}`)
          headerStyles.push('breakHeader')
          columnWidths.push(14)
        }
      })
      
      headerRow.push('Class Hrs', 'Lab Hrs')
      headerStyles.push('header', 'header')
      columnWidths.push(14, 12)
      
      XLSX.utils.sheet_add_aoa(allSectionsSheet, [headerRow], { origin: { r: currentRow, c: 0 } })
      
      // Style header row
      for (let col = 0; col < headerRow.length; col++) {
        const styleType = headerStyles[col]
        applyStyle(allSectionsSheet, cellRef(currentRow, col), styleType === 'breakHeader' ? styles.breakHeader : styles.header)
      }
      currentRow++

      // Day rows
      DAYS.forEach((day, dayIdx) => {
        const rowData: string[] = []
        const cellStyles: string[] = []
        
        // Section name only on first row
        rowData.push(dayIdx === 0 ? label : '')
        cellStyles.push(dayIdx === 0 ? 'section' : 'free')
        rowData.push(day)
        cellStyles.push('day')
        
        const dayAllocations = section.allocations.filter(a => a.day === day)
        
        timeSlots.forEach((ts) => {
          const allocation = dayAllocations.find(a => a.startTime === ts.slot)
          if (allocation) {
            const subjectDisplay = allocation.linkedSubject?.shortName || allocation.linkedSubject?.code || allocation.subject || ''
            const facultyDisplay = allocation.faculty || ''
            const roomName = allocation.room?.actualName || allocation.room?.code || ''
            const isLab = allocation.type === 'LAB'
            
            let cellContent = subjectDisplay || '-'
            if (facultyDisplay) cellContent += `\n(${facultyDisplay})`
            if (roomName) cellContent += `\n[${roomName}]`
            
            rowData.push(cellContent)
            cellStyles.push(isLab ? 'lab' : 'theory')
          } else {
            rowData.push('-')
            cellStyles.push('free')
          }
          
          // Add coffee break cell after Slot 3
          if (ts.slot === 'Slot 3') {
            rowData.push('☕')
            cellStyles.push('coffee')
          }
          
          // Add lunch break cell based on semester
          if (ts.slot === lunchAfterSlot) {
            rowData.push('🍽️')
            cellStyles.push('lunch')
          }
        })
        
        // Totals (empty for non-last rows)
        rowData.push('')
        cellStyles.push('free')
        rowData.push('')
        cellStyles.push('free')
        
        XLSX.utils.sheet_add_aoa(allSectionsSheet, [rowData], { origin: { r: currentRow, c: 0 } })
        
        // Apply styles
        for (let col = 0; col < rowData.length; col++) {
          const styleType = cellStyles[col]
          const styleMap: Record<string, object> = {
            'section': styles.section,
            'day': styles.day,
            'theory': styles.theory,
            'lab': styles.lab,
            'coffee': styles.coffee,
            'lunch': styles.lunch,
            'free': styles.free,
          }
          applyStyle(allSectionsSheet, cellRef(currentRow, col), styleMap[styleType] || styles.free)
        }
        
        currentRow++
      })

      // TOTAL row
      const theoryText = `${theoryHrs}/${section.requiredTheoryHours}${theoryHrs >= section.requiredTheoryHours ? ' ✓' : gaps > 0 ? ` (${gaps} gap)` : ''}`
      const labText = `${labHrs}/${section.requiredLabHours}${labHrs >= section.requiredLabHours ? ' ✓' : ''}`
      
      // Build total row with same column count as header
      const totalRow: string[] = ['', 'TOTAL']
      for (let i = 2; i < headerRow.length - 2; i++) {
        totalRow.push('')
      }
      totalRow.push(theoryText, labText)
      
      XLSX.utils.sheet_add_aoa(allSectionsSheet, [totalRow], { origin: { r: currentRow, c: 0 } })
      
      // Style total row
      for (let col = 0; col < totalRow.length; col++) {
        applyStyle(allSectionsSheet, cellRef(currentRow, col), styles.total)
      }
      
      // Color code the totals
      const theoryColIdx = totalRow.length - 2
      const labColIdx = totalRow.length - 1
      const theoryCell = cellRef(currentRow, theoryColIdx)
      const labCell = cellRef(currentRow, labColIdx)
      
      if (theoryHrs >= section.requiredTheoryHours) {
        applyStyle(allSectionsSheet, theoryCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.successFont } })
      } else if (theoryHrs >= section.requiredTheoryHours * 0.7) {
        applyStyle(allSectionsSheet, theoryCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.warningFont } })
      } else {
        applyStyle(allSectionsSheet, theoryCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.errorFont } })
      }
      
      if (labHrs >= section.requiredLabHours) {
        applyStyle(allSectionsSheet, labCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.successFont } })
      } else if (labHrs >= section.requiredLabHours * 0.7) {
        applyStyle(allSectionsSheet, labCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.warningFont } })
      } else {
        applyStyle(allSectionsSheet, labCell, { ...styles.total, font: { ...styles.total.font, color: COLORS.errorFont } })
      }
      
      currentRow += 2 // Add empty row between sections
    })

    // Set column widths (dynamic based on max columns - 14 columns with breaks)
    allSectionsSheet['!cols'] = [
      { wch: 12 }, // Section
      { wch: 12 }, // Day
      { wch: 18 }, { wch: 18 }, { wch: 18 }, // Slots 1-3
      { wch: 14 }, // Coffee break
      { wch: 18 }, { wch: 18 }, // Slots 4-5
      { wch: 14 }, // Lunch break (for sem 1-4, may vary)
      { wch: 18 }, { wch: 18 }, { wch: 18 }, // Slots 6-8 (or 5-7 for sem 5-8)
      { wch: 14 }, // Extra column for sem 5-8 lunch
      { wch: 14 }, { wch: 12 }, // Class Hrs, Lab Hrs
    ]
    
    // Set row heights for better readability
    allSectionsSheet['!rows'] = Array(currentRow).fill({ hpt: 50 })
    
    XLSX.utils.book_append_sheet(workbook, allSectionsSheet, 'All Sections')

    // ============ PER-SEMESTER SHEETS ============
    Object.entries(sectionsBySemester).forEach(([semCode, semSections]) => {
      const semSheet = XLSX.utils.aoa_to_sheet([[]])
      let row = 0
      
      // Get semester number for this group
      const semesterNum = getSemesterNum(semCode)
      const timeSlots = getTimeSlots(semesterNum)
      const lunchAfterSlot = getLunchAfterSlot(semesterNum)

      // Title
      XLSX.utils.sheet_add_aoa(semSheet, [[`📚 ${semCode} - Section Timetables`]], { origin: { r: row, c: 0 } })
      applyStyle(semSheet, cellRef(row, 0), styles.title)
      row += 2

      semSections.forEach((section) => {
        const label = `${semCode}-${section.year}${section.division}`
        const theoryHrs = section.allocations.filter(a => a.type === 'THEORY').length
        const labHrs = section.allocations.filter(a => a.type === 'LAB').length
        const gaps = calculateGaps(section.allocations)

        // Build header row with time slots and breaks
        const headerRow: string[] = ['Section', 'Day']
        const headerStyles: string[] = ['header', 'header']
        
        timeSlots.forEach((ts) => {
          headerRow.push(`${ts.slot}\n${ts.start} - ${ts.end}`)
          headerStyles.push('header')
          
          // Add coffee break after Slot 3
          if (ts.slot === 'Slot 3') {
            headerRow.push(`☕ Coffee\n${BREAKS.COFFEE.time}`)
            headerStyles.push('breakHeader')
          }
          
          // Add lunch break based on semester
          if (ts.slot === lunchAfterSlot) {
            const lunchBreak = semesterNum <= 4 ? BREAKS.LUNCH_SEM_1_4 : BREAKS.LUNCH_SEM_5_8
            headerRow.push(`🍽️ Lunch\n${lunchBreak.time}`)
            headerStyles.push('breakHeader')
          }
        })
        
        headerRow.push('Class Hrs', 'Lab Hrs')
        headerStyles.push('header', 'header')
        
        XLSX.utils.sheet_add_aoa(semSheet, [headerRow], { origin: { r: row, c: 0 } })
        for (let col = 0; col < headerRow.length; col++) {
          const styleType = headerStyles[col]
          applyStyle(semSheet, cellRef(row, col), styleType === 'breakHeader' ? styles.breakHeader : styles.header)
        }
        row++

        // Days
        DAYS.forEach((day, dayIdx) => {
          const rowData: string[] = [dayIdx === 0 ? label : '', day]
          const cellStyles: string[] = [dayIdx === 0 ? 'section' : 'free', 'day']
          
          const dayAllocations = section.allocations.filter(a => a.day === day)
          
          timeSlots.forEach((ts) => {
            const allocation = dayAllocations.find(a => a.startTime === ts.slot)
            if (allocation) {
              const subjectDisplay = allocation.linkedSubject?.shortName || allocation.linkedSubject?.code || allocation.subject || ''
              const facultyDisplay = allocation.faculty || ''
              const roomName = allocation.room?.actualName || allocation.room?.code || ''
              
              let cellContent = subjectDisplay || '-'
              if (facultyDisplay) cellContent += `\n(${facultyDisplay})`
              if (roomName) cellContent += `\n[${roomName}]`
              
              rowData.push(cellContent)
              cellStyles.push(allocation.type === 'LAB' ? 'lab' : 'theory')
            } else {
              rowData.push('-')
              cellStyles.push('free')
            }
            
            // Add coffee break cell after Slot 3
            if (ts.slot === 'Slot 3') {
              rowData.push('☕')
              cellStyles.push('coffee')
            }
            
            // Add lunch break cell based on semester
            if (ts.slot === lunchAfterSlot) {
              rowData.push('🍽️')
              cellStyles.push('lunch')
            }
          })
          
          rowData.push('', '')
          cellStyles.push('free', 'free')
          
          XLSX.utils.sheet_add_aoa(semSheet, [rowData], { origin: { r: row, c: 0 } })
          
          // Apply styles
          for (let col = 0; col < rowData.length; col++) {
            const styleType = cellStyles[col]
            const styleMap: Record<string, object> = {
              'section': styles.section,
              'day': styles.day,
              'theory': styles.theory,
              'lab': styles.lab,
              'coffee': styles.coffee,
              'lunch': styles.lunch,
              'free': styles.free,
            }
            applyStyle(semSheet, cellRef(row, col), styleMap[styleType] || styles.free)
          }
          
          row++
        })

        // Total
        const theoryText = `${theoryHrs}/${section.requiredTheoryHours}${theoryHrs >= section.requiredTheoryHours ? ' ✓' : gaps > 0 ? ` (${gaps} gap)` : ''}`
        const labText = `${labHrs}/${section.requiredLabHours}${labHrs >= section.requiredLabHours ? ' ✓' : ''}`
        
        // Build total row with same column count as header
        const totalRow: string[] = ['', 'TOTAL']
        for (let i = 2; i < headerRow.length - 2; i++) {
          totalRow.push('')
        }
        totalRow.push(theoryText, labText)
        
        XLSX.utils.sheet_add_aoa(semSheet, [totalRow], { origin: { r: row, c: 0 } })
        for (let col = 0; col < totalRow.length; col++) {
          applyStyle(semSheet, cellRef(row, col), styles.total)
        }
        
        // Color code the totals
        const theoryColIdx = totalRow.length - 2
        const labColIdx = totalRow.length - 1
        if (theoryHrs >= section.requiredTheoryHours) {
          applyStyle(semSheet, cellRef(row, theoryColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.successFont } })
        } else if (theoryHrs >= section.requiredTheoryHours * 0.7) {
          applyStyle(semSheet, cellRef(row, theoryColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.warningFont } })
        } else {
          applyStyle(semSheet, cellRef(row, theoryColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.errorFont } })
        }
        
        if (labHrs >= section.requiredLabHours) {
          applyStyle(semSheet, cellRef(row, labColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.successFont } })
        } else if (labHrs >= section.requiredLabHours * 0.7) {
          applyStyle(semSheet, cellRef(row, labColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.warningFont } })
        } else {
          applyStyle(semSheet, cellRef(row, labColIdx), { ...styles.total, font: { ...styles.total.font, color: COLORS.errorFont } })
        }
        
        row += 2
      })

      // Set column widths (dynamic based on breaks)
      semSheet['!cols'] = [
        { wch: 12 }, // Section
        { wch: 12 }, // Day
        { wch: 18 }, { wch: 18 }, { wch: 18 }, // Slots 1-3
        { wch: 14 }, // Coffee break
        { wch: 18 }, { wch: 18 }, // Slots 4-5
        { wch: 14 }, // Lunch break
        { wch: 18 }, { wch: 18 }, { wch: 18 }, // Remaining slots
        { wch: 14 }, { wch: 14 }, { wch: 12 }, // Extra columns
      ]
      semSheet['!rows'] = Array(row).fill({ hpt: 50 })
      
      XLSX.utils.book_append_sheet(workbook, semSheet, semCode.substring(0, 31))
    })

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    const filename = `${department.code}_Section_Timetables_${new Date().toISOString().split('T')[0]}.xlsx`
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting section timetables:', error)
    return NextResponse.json(
      { error: 'Failed to export timetables' },
      { status: 500 }
    )
  }
}

// Calculate gaps in timetable (empty slots between filled slots on the same day)
function calculateGaps(allocations: { day: string; startTime: string }[]): number {
  let totalGaps = 0
  
  DAYS.forEach(day => {
    const dayAllocations = allocations.filter(a => a.day === day)
    if (dayAllocations.length < 2) return
    
    const slotIndices = dayAllocations
      .map(a => SLOT_NAMES.indexOf(a.startTime))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)
    
    if (slotIndices.length < 2) return
    
    const firstSlot = slotIndices[0]
    const lastSlot = slotIndices[slotIndices.length - 1]
    
    for (let i = firstSlot + 1; i < lastSlot; i++) {
      if (!slotIndices.includes(i)) {
        totalGaps++
      }
    }
  })
  
  return totalGaps
}
