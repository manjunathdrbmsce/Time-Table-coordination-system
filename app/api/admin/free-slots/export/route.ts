import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import XLSX from 'xlsx-js-style'

// Slot period definitions
const SLOT_PERIODS = {
  morning: {
    label: 'ðŸŒ… Morning',
    slots: ['Slot 1', 'Slot 2', 'Slot 3'],
    time: '8:00 AM - 10:45 AM'
  },
  midday: {
    label: 'â˜€ï¸ Midday',
    slots: ['Slot 4', 'Slot 5'],
    time: '11:15 AM - 12:45 PM'
  },
  afternoon: {
    label: 'ðŸŒ† Afternoon',
    slots: ['Slot 6', 'Slot 7', 'Slot 8'],
    time: '1:00 PM - 4:45 PM'
  }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

// Colors for styling
const COLORS = {
  headerBg: { rgb: '1E3A5F' },
  headerFont: { rgb: 'FFFFFF' },
  freeBg: { rgb: 'C8E6C9' },
  occupiedBg: { rgb: 'FFCDD2' },
  morningBg: { rgb: 'FFE0B2' },
  middayBg: { rgb: 'FFF9C4' },
  afternoonBg: { rgb: 'E1BEE7' },
  statsBg: { rgb: 'E3F2FD' },
}

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
  free: {
    font: { sz: 10, color: { rgb: '2E7D32' } },
    fill: { fgColor: COLORS.freeBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  occupied: {
    font: { sz: 9, color: { rgb: 'C62828' } },
    fill: { fgColor: COLORS.occupiedBg },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  roomName: {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: 'F5F5F5' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  morning: {
    font: { bold: true, sz: 10, color: { rgb: 'E65100' } },
    fill: { fgColor: COLORS.morningBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  midday: {
    font: { bold: true, sz: 10, color: { rgb: 'F9A825' } },
    fill: { fgColor: COLORS.middayBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  afternoon: {
    font: { bold: true, sz: 10, color: { rgb: '7B1FA2' } },
    fill: { fgColor: COLORS.afternoonBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  stats: {
    font: { sz: 10 },
    fill: { fgColor: COLORS.statsBg },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BDBDBD' } },
      bottom: { style: 'thin', color: { rgb: 'BDBDBD' } },
      left: { style: 'thin', color: { rgb: 'BDBDBD' } },
      right: { style: 'thin', color: { rgb: 'BDBDBD' } },
    }
  },
  title: {
    font: { bold: true, sz: 16, color: COLORS.headerBg },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
}

function applyStyle(sheet: XLSX.WorkSheet, cellRef: string, style: object) {
  if (!sheet[cellRef]) sheet[cellRef] = { v: '' }
  sheet[cellRef].s = style
}

function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col })
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'HOD', 'COORDINATOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const roomType = searchParams.get('roomType')
    const departmentId = searchParams.get('departmentId') || session.user.departmentId

    // Get active session
    const activeSession = await db.academicSession.findFirst({
      where: { isActive: true },
    })

    if (!activeSession) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Build room filter
    const roomFilter: Record<string, unknown> = {}
    if (buildingId && buildingId !== 'all') {
      roomFilter.buildingId = buildingId
    }
    if (roomType && roomType !== 'all') {
      roomFilter.type = roomType
    }
    if (session.user.role === 'HOD' && departmentId) {
      roomFilter.departmentId = departmentId
    }

    // Get rooms
    const rooms = await db.room.findMany({
      where: roomFilter,
      include: {
        building: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
      orderBy: [
        { building: { name: 'asc' } },
        { code: 'asc' },
      ],
    })

    // Get real allocations for the active session only
    const roomIds = rooms.map(r => r.id)
    const allocations = await db.allocation.findMany({
      where: {
        roomId: { in: roomIds },
        sessionId: activeSession.id,
        // Exclude slots marked as FREE (cleared by coordinator)
        allocationType: { not: 'FREE' },
        // Exclude cleared/placeholder subjects
        NOT: {
          subject: { in: ['-', ''] },
        },
      },
      select: {
        roomId: true,
        day: true,
        startTime: true,
        subject: true,
        faculty: true,
        section: {
          select: {
            year: true,
            division: true,
            semester: { select: { code: true } },
            department: { select: { code: true } },
          },
        },
      },
    })

    // Build allocation map
    const allocationMap: Record<string, Record<string, Record<string, string>>> = {}
    allocations.forEach(alloc => {
      if (!allocationMap[alloc.roomId]) allocationMap[alloc.roomId] = {}
      if (!allocationMap[alloc.roomId][alloc.day]) allocationMap[alloc.roomId][alloc.day] = {}
      
      const sectionLabel = alloc.section
        ? `${alloc.section.department?.code || ''} ${alloc.section.semester?.code || ''}-${alloc.section.year}${alloc.section.division}`
        : ''
      const facultyLabel = alloc.faculty ? `\n${alloc.faculty}` : ''
      allocationMap[alloc.roomId][alloc.day][alloc.startTime] = `${alloc.subject || ''}${facultyLabel}\n(${sectionLabel})`
    })

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // ============ SUMMARY SHEET ============
    const summarySheet = XLSX.utils.aoa_to_sheet([[]])
    let row = 0

    // Title
    XLSX.utils.sheet_add_aoa(summarySheet, [['ðŸ“Š Free Slots Summary Report']], { origin: { r: row, c: 0 } })
    applyStyle(summarySheet, cellRef(row, 0), styles.title)
    row++
    XLSX.utils.sheet_add_aoa(summarySheet, [[`Session: ${activeSession.name} | Generated: ${new Date().toLocaleString()}`]], { origin: { r: row, c: 0 } })
    row += 2

    // Summary header
    const summaryHeader = ['Room', 'Building', 'Type', 'Capacity', 'ðŸŒ… Morning Free', 'â˜€ï¸ Midday Free', 'ðŸŒ† Afternoon Free', 'Total Free', 'Utilization %']
    XLSX.utils.sheet_add_aoa(summarySheet, [summaryHeader], { origin: { r: row, c: 0 } })
    for (let col = 0; col < summaryHeader.length; col++) {
      applyStyle(summarySheet, cellRef(row, col), styles.header)
    }
    row++

    // Room data
    rooms.forEach(room => {
      let morningFree = 0, middayFree = 0, afternoonFree = 0
      let totalSlots = 0

      DAYS.forEach(day => {
        SLOT_PERIODS.morning.slots.forEach(slot => {
          totalSlots++
          if (!allocationMap[room.id]?.[day]?.[slot]) morningFree++
        })
        SLOT_PERIODS.midday.slots.forEach(slot => {
          totalSlots++
          if (!allocationMap[room.id]?.[day]?.[slot]) middayFree++
        })
        SLOT_PERIODS.afternoon.slots.forEach(slot => {
          totalSlots++
          if (!allocationMap[room.id]?.[day]?.[slot]) afternoonFree++
        })
      })

      const totalFree = morningFree + middayFree + afternoonFree
      const utilization = totalSlots > 0 ? Math.round(((totalSlots - totalFree) / totalSlots) * 100) : 0

      const rowData = [
        room.actualName || room.code,
        room.building?.name || '',
        room.type,
        room.capacity,
        morningFree,
        middayFree,
        afternoonFree,
        totalFree,
        `${utilization}%`,
      ]

      XLSX.utils.sheet_add_aoa(summarySheet, [rowData], { origin: { r: row, c: 0 } })
      
      applyStyle(summarySheet, cellRef(row, 0), styles.roomName)
      applyStyle(summarySheet, cellRef(row, 1), styles.stats)
      applyStyle(summarySheet, cellRef(row, 2), styles.stats)
      applyStyle(summarySheet, cellRef(row, 3), styles.stats)
      applyStyle(summarySheet, cellRef(row, 4), styles.morning)
      applyStyle(summarySheet, cellRef(row, 5), styles.midday)
      applyStyle(summarySheet, cellRef(row, 6), styles.afternoon)
      applyStyle(summarySheet, cellRef(row, 7), { ...styles.stats, font: { ...styles.stats.font, bold: true, color: { rgb: '2E7D32' } } })
      applyStyle(summarySheet, cellRef(row, 8), {
        ...styles.stats,
        font: {
          ...styles.stats.font,
          bold: true,
          color: utilization >= 80 ? { rgb: 'C62828' } : utilization >= 50 ? { rgb: 'F57C00' } : { rgb: '2E7D32' }
        }
      })
      
      row++
    })

    summarySheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
    ]

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // ============ ALL ROOMS TIMETABLE SHEET (Single Page) ============
    const allRoomsSheet = XLSX.utils.aoa_to_sheet([[]])
    let allRoomsRow = 0

    // Title
    XLSX.utils.sheet_add_aoa(allRoomsSheet, [['ðŸ—“ï¸ All Room Timetables']], { origin: { r: allRoomsRow, c: 0 } })
    applyStyle(allRoomsSheet, cellRef(allRoomsRow, 0), styles.title)
    allRoomsRow++
    XLSX.utils.sheet_add_aoa(allRoomsSheet, [[`Session: ${activeSession.name} | Generated: ${new Date().toLocaleString()}`]], { origin: { r: allRoomsRow, c: 0 } })
    allRoomsRow += 2

    // All slots for header
    const ALL_SLOTS = ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5', 'Slot 6', 'Slot 7', 'Slot 8']
    const ALL_SLOT_LABELS = ALL_SLOTS.map(s => SLOT_TIME_MAP[s] || s)

    rooms.forEach((room, roomIdx) => {
      // Room header row
      const roomHeader = ['Room', 'Day', ...ALL_SLOT_LABELS, 'Free Slots']
      XLSX.utils.sheet_add_aoa(allRoomsSheet, [roomHeader], { origin: { r: allRoomsRow, c: 0 } })
      for (let col = 0; col < roomHeader.length; col++) {
        applyStyle(allRoomsSheet, cellRef(allRoomsRow, col), styles.header)
      }
      allRoomsRow++

      // Day rows for this room
      let roomFreeSlots = 0
      DAYS.forEach((day, dayIdx) => {
        const rowData: string[] = []
        const cellTypes: ('free' | 'occupied' | 'morning' | 'midday' | 'afternoon')[] = []
        
        // Room name only on first row
        rowData.push(dayIdx === 0 ? (room.actualName || room.code) : '')
        cellTypes.push('morning') // Use for room name styling
        
        rowData.push(day)
        cellTypes.push('morning') // Use for day styling
        
        let dayFreeSlots = 0
        ALL_SLOTS.forEach((slot, slotIdx) => {
          const alloc = allocationMap[room.id]?.[day]?.[slot]
          if (alloc) {
            rowData.push(alloc)
            cellTypes.push('occupied')
          } else {
            rowData.push('âœ“ FREE')
            cellTypes.push('free')
            dayFreeSlots++
            roomFreeSlots++
          }
        })
        
        // Day free count
        rowData.push(dayFreeSlots.toString())
        cellTypes.push('free')
        
        XLSX.utils.sheet_add_aoa(allRoomsSheet, [rowData], { origin: { r: allRoomsRow, c: 0 } })
        
        // Apply styles
        applyStyle(allRoomsSheet, cellRef(allRoomsRow, 0), dayIdx === 0 ? styles.roomName : styles.stats)
        applyStyle(allRoomsSheet, cellRef(allRoomsRow, 1), styles.stats)
        
        for (let col = 0; col < ALL_SLOTS.length; col++) {
          const slotStyle = cellTypes[col + 2] === 'free' ? styles.free : styles.occupied
          applyStyle(allRoomsSheet, cellRef(allRoomsRow, col + 2), slotStyle)
        }
        
        // Free slots count column
        applyStyle(allRoomsSheet, cellRef(allRoomsRow, ALL_SLOTS.length + 2), {
          ...styles.stats,
          font: { ...styles.stats.font, bold: true, color: { rgb: '2E7D32' } }
        })
        
        allRoomsRow++
      })

      // Total row for this room
      const totalFree = roomFreeSlots
      const totalSlots = DAYS.length * ALL_SLOTS.length
      const utilization = Math.round(((totalSlots - totalFree) / totalSlots) * 100)
      
      const totalRow = ['', 'TOTAL', '', '', '', '', '', '', '', '', `${totalFree}/${totalSlots} (${utilization}% used)`]
      XLSX.utils.sheet_add_aoa(allRoomsSheet, [totalRow], { origin: { r: allRoomsRow, c: 0 } })
      
      for (let col = 0; col < totalRow.length; col++) {
        applyStyle(allRoomsSheet, cellRef(allRoomsRow, col), {
          ...styles.header,
          fill: { fgColor: { rgb: 'E8EAF6' } },
          font: { bold: true, sz: 10, color: { rgb: '1E3A5F' } }
        })
      }
      
      allRoomsRow += 2 // Empty row between rooms
    })

    // Set column widths
    allRoomsSheet['!cols'] = [
      { wch: 20 }, // Room
      { wch: 12 }, // Day
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, // Slots 1-4
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, // Slots 5-8
      { wch: 18 }, // Free Slots
    ]
    allRoomsSheet['!rows'] = Array(allRoomsRow).fill({ hpt: 35 })

    XLSX.utils.book_append_sheet(workbook, allRoomsSheet, 'All Rooms Timetable')

    // ============ PERIOD TIMETABLE SHEETS (Same template as All Rooms) ============
    const periods = ['morning', 'midday', 'afternoon'] as const

    periods.forEach(period => {
      const periodSheet = XLSX.utils.aoa_to_sheet([[]])
      let pRow = 0
      const periodInfo = SLOT_PERIODS[period]
      const periodSlots = periodInfo.slots

      // Title
      XLSX.utils.sheet_add_aoa(periodSheet, [[`${periodInfo.label} Timetable (${periodInfo.time})`]], { origin: { r: pRow, c: 0 } })
      applyStyle(periodSheet, cellRef(pRow, 0), styles.title)
      pRow++
      XLSX.utils.sheet_add_aoa(periodSheet, [[`Session: ${activeSession.name} | Generated: ${new Date().toLocaleString()}`]], { origin: { r: pRow, c: 0 } })
      pRow += 2

      rooms.forEach(room => {
        // Header row: Room | Day | Slot columns... | Free Slots
        const periodSlotLabels = periodSlots.map(s => SLOT_TIME_MAP[s] || s)
        const headerRow = ['Room', 'Day', ...periodSlotLabels, 'Free Slots']
        XLSX.utils.sheet_add_aoa(periodSheet, [headerRow], { origin: { r: pRow, c: 0 } })
        for (let col = 0; col < headerRow.length; col++) {
          applyStyle(periodSheet, cellRef(pRow, col), styles.header)
        }
        pRow++

        // Day rows
        let roomFreeSlots = 0
        DAYS.forEach((day, dayIdx) => {
          const rowData: string[] = []

          // Room name only on first day row
          rowData.push(dayIdx === 0 ? (room.actualName || room.code) : '')
          rowData.push(day)

          let dayFreeSlots = 0
          periodSlots.forEach(slot => {
            const alloc = allocationMap[room.id]?.[day]?.[slot]
            if (alloc) {
              rowData.push(alloc)
            } else {
              rowData.push('âœ“ FREE')
              dayFreeSlots++
              roomFreeSlots++
            }
          })

          // Day free count
          rowData.push(dayFreeSlots.toString())

          XLSX.utils.sheet_add_aoa(periodSheet, [rowData], { origin: { r: pRow, c: 0 } })

          // Apply styles
          applyStyle(periodSheet, cellRef(pRow, 0), dayIdx === 0 ? styles.roomName : styles.stats)
          applyStyle(periodSheet, cellRef(pRow, 1), styles.stats)

          for (let col = 0; col < periodSlots.length; col++) {
            const alloc = allocationMap[room.id]?.[day]?.[periodSlots[col]]
            applyStyle(periodSheet, cellRef(pRow, col + 2), alloc ? styles.occupied : styles.free)
          }

          // Free slots count column
          applyStyle(periodSheet, cellRef(pRow, periodSlots.length + 2), {
            ...styles.stats,
            font: { ...styles.stats.font, bold: true, color: { rgb: '2E7D32' } }
          })

          pRow++
        })

        // TOTAL row
        const totalSlots = DAYS.length * periodSlots.length
        const utilization = Math.round(((totalSlots - roomFreeSlots) / totalSlots) * 100)

        const totalRow: string[] = ['', 'TOTAL']
        for (let i = 0; i < periodSlots.length; i++) totalRow.push('')
        totalRow.push(`${roomFreeSlots}/${totalSlots} (${utilization}% used)`)

        XLSX.utils.sheet_add_aoa(periodSheet, [totalRow], { origin: { r: pRow, c: 0 } })
        for (let col = 0; col < totalRow.length; col++) {
          applyStyle(periodSheet, cellRef(pRow, col), {
            ...styles.header,
            fill: { fgColor: { rgb: 'E8EAF6' } },
            font: { bold: true, sz: 10, color: { rgb: '1E3A5F' } }
          })
        }

        pRow += 2 // Empty row between rooms
      })

      // Column widths
      const cols = [{ wch: 20 }, { wch: 12 }]
      for (let i = 0; i < periodSlots.length; i++) cols.push({ wch: 18 })
      cols.push({ wch: 18 })
      periodSheet['!cols'] = cols
      periodSheet['!rows'] = Array(pRow).fill({ hpt: 35 })

      const sheetLabel = periodInfo.label.replace(/[ðŸŒ…â˜€ï¸ðŸŒ†]/g, '').trim()
      XLSX.utils.book_append_sheet(workbook, periodSheet, sheetLabel)
    })

    // ============ DETAILED ROOM SHEETS ============
    rooms.slice(0, 10).forEach(room => { // Limit to first 10 rooms to avoid too many sheets
      const roomSheet = XLSX.utils.aoa_to_sheet([[]])
      let row = 0

      // Title
      XLSX.utils.sheet_add_aoa(roomSheet, [[`${room.actualName || room.code} - Free Slots`]], { origin: { r: row, c: 0 } })
      applyStyle(roomSheet, cellRef(row, 0), styles.title)
      row++
      XLSX.utils.sheet_add_aoa(roomSheet, [[`Building: ${room.building?.name || 'N/A'} | Type: ${room.type} | Capacity: ${room.capacity}`]], { origin: { r: row, c: 0 } })
      row += 2

      // Header
      const header = ['Day', ...SLOT_PERIODS.morning.slots.map(s => SLOT_TIME_MAP[s] || s), 'â˜•', ...SLOT_PERIODS.midday.slots.slice(0, 2).map(s => SLOT_TIME_MAP[s] || s), 'ðŸ½ï¸', ...SLOT_PERIODS.midday.slots.slice(2).map(s => SLOT_TIME_MAP[s] || s), ...SLOT_PERIODS.afternoon.slots.map(s => SLOT_TIME_MAP[s] || s)]
      XLSX.utils.sheet_add_aoa(roomSheet, [header], { origin: { r: row, c: 0 } })
      for (let col = 0; col < header.length; col++) {
        applyStyle(roomSheet, cellRef(row, col), styles.header)
      }
      row++

      // Day data
      DAYS.forEach(day => {
        const rowData: string[] = [day]
        const allSlots = [...SLOT_PERIODS.morning.slots, 'BREAK', ...SLOT_PERIODS.midday.slots.slice(0, 2), 'LUNCH', ...SLOT_PERIODS.midday.slots.slice(2), ...SLOT_PERIODS.afternoon.slots]
        
        allSlots.forEach(slot => {
          if (slot === 'BREAK' || slot === 'LUNCH') {
            rowData.push(slot === 'BREAK' ? 'â˜•' : 'ðŸ½ï¸')
          } else {
            const alloc = allocationMap[room.id]?.[day]?.[slot]
            rowData.push(alloc || 'âœ“ FREE')
          }
        })

        XLSX.utils.sheet_add_aoa(roomSheet, [rowData], { origin: { r: row, c: 0 } })
        
        applyStyle(roomSheet, cellRef(row, 0), styles.roomName)
        
        let colIdx = 1
        allSlots.forEach(slot => {
          if (slot === 'BREAK' || slot === 'LUNCH') {
            applyStyle(roomSheet, cellRef(row, colIdx), styles.morning)
          } else {
            const alloc = allocationMap[room.id]?.[day]?.[slot]
            applyStyle(roomSheet, cellRef(row, colIdx), alloc ? styles.occupied : styles.free)
          }
          colIdx++
        })
        
        row++
      })

      roomSheet['!cols'] = [{ wch: 12 }, ...Array(11).fill({ wch: 16 })]
      roomSheet['!rows'] = Array(row).fill({ hpt: 35 })

      // Truncate sheet name to 31 chars
      const sheetName = (room.actualName || room.code).substring(0, 31)
      XLSX.utils.book_append_sheet(workbook, roomSheet, sheetName)
    })

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const filename = `Free_Slots_Report_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting free slots:', error)
    return NextResponse.json(
      { error: 'Failed to export free slots' },
      { status: 500 }
    )
  }
}
