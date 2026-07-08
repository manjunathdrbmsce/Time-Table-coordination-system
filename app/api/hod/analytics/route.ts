import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'HOD' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const departmentId = session.user.departmentId
    if (!departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const activeSession = await db.academicSession.findFirst({
      where: { isActive: true },
    })

    if (!activeSession) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Fetch all department-specific data
    const [
      department,
      sections,
      departmentRooms,
      sharedRooms,
      subjects,
      faculties,
      facultyMappings,
      allocations,
      slotRequests,
    ] = await Promise.all([
      db.department.findUnique({
        where: { id: departmentId },
        include: { statistics: true },
      }),
      db.section.findMany({
        where: { departmentId, sessionId: activeSession.id },
        include: {
          semester: true,
          allocations: {
            where: { sessionId: activeSession.id },
            select: { id: true, type: true, day: true, subject: true, faculty: true, isModified: true, roomId: true },
          },
          facultyMappings: true,
        },
      }),
      // Department's own rooms
      db.room.findMany({
        where: { departmentId },
        include: { 
          statistics: true,
          building: { select: { name: true, code: true } },
          allocations: {
            where: { sessionId: activeSession.id, section: { departmentId } },
            select: { id: true, type: true, day: true },
          },
        },
      }),
      // Shared rooms (no department assigned) that are used by this department's sections
      db.room.findMany({
        where: {
          departmentId: null,
          allocations: {
            some: { sessionId: activeSession.id, section: { departmentId } },
          },
        },
        include: { 
          statistics: true,
          building: { select: { name: true, code: true } },
          allocations: {
            where: { sessionId: activeSession.id, section: { departmentId } },
            select: { id: true, type: true, day: true },
          },
        },
      }),
      db.subject.findMany({
        where: { departmentId },
        include: {
          _count: { select: { facultyMappings: true, allocations: true } },
        },
      }),
      db.faculty.findMany({
        where: { departmentId },
        include: {
          _count: { select: { subjectMappings: true } },
        },
      }),
      db.facultySubjectMapping.findMany({
        where: { section: { departmentId, sessionId: activeSession.id } },
        include: {
          faculty: { select: { name: true, initials: true } },
          subject: { select: { name: true, code: true, type: true } },
          section: { select: { year: true, division: true, semester: { select: { code: true } } } },
        },
      }),
      db.allocation.findMany({
        where: { sessionId: activeSession.id, section: { departmentId } },
        select: {
          id: true,
          type: true,
          day: true,
          startTime: true,
          subject: true,
          faculty: true,
          isModified: true,
          subjectId: true,
        },
      }),
      db.slotRequest.findMany({
        where: { sessionId: activeSession.id, section: { departmentId } },
        select: { id: true, status: true, createdAt: true },
      }),
    ])

    // Combine all rooms for total count (department rooms + shared rooms used)
    const rooms = [...departmentRooms, ...sharedRooms]

    // ==================== OVERVIEW STATS ====================
    const overviewStats = {
      totalSections: sections.length,
      totalRooms: departmentRooms.length,
      totalSharedRooms: sharedRooms.length,
      totalSubjects: subjects.length,
      totalFaculty: faculties.length,
      totalAllocations: allocations.length,
      totalMappings: facultyMappings.length,
    }

    // ==================== SECTION ANALYTICS ====================
    const sectionAnalytics = sections.map(section => {
      const theoryAllocations = section.allocations.filter(a => a.type === 'THEORY').length
      const labAllocations = section.allocations.filter(a => a.type === 'LAB').length
      const totalAllocations = theoryAllocations + labAllocations
      const totalRequired = section.requiredTheoryHours + section.requiredLabHours
      const completionRate = totalRequired > 0 ? Math.round((totalAllocations / totalRequired) * 100) : 0

      return {
        id: section.id,
        label: `${section.semester.code} ${section.year}${section.division}`,
        semester: section.semester.code,
        year: section.year,
        division: section.division,
        studentCount: section.studentCount,
        theoryAllocated: theoryAllocations,
        theoryRequired: section.requiredTheoryHours,
        labAllocated: labAllocations,
        labRequired: section.requiredLabHours,
        totalAllocated: totalAllocations,
        totalRequired,
        completionRate,
        mappingsCount: section.facultyMappings.length,
        modifiedSlots: section.allocations.filter(a => a.isModified).length,
      }
    }).sort((a, b) => a.semester.localeCompare(b.semester) || a.year - b.year)

    // Section summary
    const sectionSummary = {
      totalTheoryAllocated: sectionAnalytics.reduce((sum, s) => sum + s.theoryAllocated, 0),
      totalTheoryRequired: sectionAnalytics.reduce((sum, s) => sum + s.theoryRequired, 0),
      totalLabAllocated: sectionAnalytics.reduce((sum, s) => sum + s.labAllocated, 0),
      totalLabRequired: sectionAnalytics.reduce((sum, s) => sum + s.labRequired, 0),
      avgCompletionRate: sectionAnalytics.length > 0 
        ? Math.round(sectionAnalytics.reduce((sum, s) => sum + s.completionRate, 0) / sectionAnalytics.length)
        : 0,
      highCompletion: sectionAnalytics.filter(s => s.completionRate >= 80).length,
      mediumCompletion: sectionAnalytics.filter(s => s.completionRate >= 50 && s.completionRate < 80).length,
      lowCompletion: sectionAnalytics.filter(s => s.completionRate < 50).length,
    }

    // ==================== ROOM ANALYTICS ====================
    // Helper function to map room data
    const mapRoomData = (room: typeof departmentRooms[0], isShared: boolean) => {
      // For shared rooms, calculate utilization based on department's usage
      const deptAllocations = room.allocations?.length || 0
      const totalSlots = room.statistics?.totalSlots || 48
      
      // For shared rooms, show department's usage vs total capacity
      const deptUtilizationPct = Math.round((deptAllocations / totalSlots) * 100)
      
      return {
        id: room.id,
        code: room.code,
        name: room.logicalName,
        type: room.type,
        capacity: room.capacity,
        building: room.building?.name || 'Unassigned',
        buildingCode: room.building?.code || '-',
        totalSlots,
        occupiedSlots: deptAllocations,
        freeSlots: Math.max(totalSlots - deptAllocations, 0),
        utilizationPct: deptUtilizationPct,
        isShared,
        deptAllocations, // How many slots used by this department
        overallUtilizationPct: room.statistics?.utilizationPct || 0, // Overall utilization for shared rooms
      }
    }

    // Department's own rooms
    const departmentRoomAnalytics = departmentRooms.map(room => mapRoomData(room, false))
      .sort((a, b) => b.utilizationPct - a.utilizationPct)

    // Shared rooms used by department
    const sharedRoomAnalytics = sharedRooms.map(room => mapRoomData(room, true))
      .sort((a, b) => b.utilizationPct - a.utilizationPct)

    // Combined for overall stats
    const roomAnalytics = [...departmentRoomAnalytics, ...sharedRoomAnalytics]

    const roomSummary = {
      // Department rooms summary
      totalDepartmentRooms: departmentRooms.length,
      deptClassrooms: departmentRooms.filter(r => r.type === 'CLASSROOM' || r.type === 'CLASS').length,
      deptLabs: departmentRooms.filter(r => r.type === 'LAB').length,
      deptAvgUtilization: departmentRoomAnalytics.length > 0 
        ? Math.round(departmentRoomAnalytics.reduce((sum, r) => sum + r.utilizationPct, 0) / departmentRoomAnalytics.length)
        : 0,
      deptCapacity: departmentRooms.reduce((sum, r) => sum + r.capacity, 0),
      
      // Shared rooms summary
      totalSharedRooms: sharedRooms.length,
      sharedClassrooms: sharedRooms.filter(r => r.type === 'CLASSROOM' || r.type === 'CLASS').length,
      sharedLabs: sharedRooms.filter(r => r.type === 'LAB').length,
      sharedAvgUtilization: sharedRoomAnalytics.length > 0 
        ? Math.round(sharedRoomAnalytics.reduce((sum, r) => sum + r.utilizationPct, 0) / sharedRoomAnalytics.length)
        : 0,
      sharedCapacity: sharedRooms.reduce((sum, r) => sum + r.capacity, 0),
      
      // Combined legacy fields for backward compatibility
      totalClassrooms: rooms.filter(r => r.type === 'CLASSROOM' || r.type === 'CLASS').length,
      totalLabs: rooms.filter(r => r.type === 'LAB').length,
      avgUtilization: roomAnalytics.length > 0 
        ? Math.round(roomAnalytics.reduce((sum, r) => sum + r.utilizationPct, 0) / roomAnalytics.length)
        : 0,
      highUtilization: roomAnalytics.filter(r => r.utilizationPct >= 80).length,
      mediumUtilization: roomAnalytics.filter(r => r.utilizationPct >= 50 && r.utilizationPct < 80).length,
      lowUtilization: roomAnalytics.filter(r => r.utilizationPct < 50).length,
      totalCapacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
    }

    // ==================== SUBJECT ANALYTICS ====================
    const subjectAnalytics = subjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName,
      type: subject.type,
      credits: subject.credits,
      hoursPerWeek: subject.hoursPerWeek,
      semester: subject.semesterNum,
      facultyMappings: subject._count.facultyMappings,
      allocations: subject._count.allocations,
    }))

    const subjectSummary = {
      theory: subjects.filter(s => s.type === 'THEORY').length,
      lab: subjects.filter(s => s.type === 'LAB').length,
      tutorial: subjects.filter(s => s.type === 'TUTORIAL').length,
      totalCredits: subjects.reduce((sum, s) => sum + s.credits, 0),
      avgCredits: subjects.length > 0 ? Math.round(subjects.reduce((sum, s) => sum + s.credits, 0) / subjects.length * 10) / 10 : 0,
      bySemester: Array.from({ length: 8 }, (_, i) => ({
        semester: i + 1,
        count: subjects.filter(s => s.semesterNum === i + 1).length,
        theory: subjects.filter(s => s.semesterNum === i + 1 && s.type === 'THEORY').length,
        lab: subjects.filter(s => s.semesterNum === i + 1 && s.type === 'LAB').length,
        tutorial: subjects.filter(s => s.semesterNum === i + 1 && s.type === 'TUTORIAL').length,
      })).filter(s => s.count > 0),
    }

    // ==================== FACULTY ANALYTICS ====================
    const facultyAnalytics = faculties.map(faculty => {
      const mappings = facultyMappings.filter(m => m.facultyId === faculty.id)
      const subjectsHandled = new Set(mappings.map(m => m.subjectId)).size
      const sectionsHandled = new Set(mappings.map(m => m.sectionId)).size
      
      return {
        id: faculty.id,
        name: faculty.name,
        initials: faculty.initials,
        designation: faculty.designation,
        email: faculty.email,
        mappingsCount: faculty._count.subjectMappings,
        subjectsHandled,
        sectionsHandled,
      }
    }).sort((a, b) => b.mappingsCount - a.mappingsCount)

    const facultySummary = {
      total: faculties.length,
      withMappings: faculties.filter(f => f._count.subjectMappings > 0).length,
      withoutMappings: faculties.filter(f => f._count.subjectMappings === 0).length,
      avgMappings: faculties.length > 0 
        ? Math.round(faculties.reduce((sum, f) => sum + f._count.subjectMappings, 0) / faculties.length * 10) / 10
        : 0,
      byDesignation: Object.entries(
        faculties.reduce((acc, f) => {
          const designation = f.designation || 'Not Specified'
          acc[designation] = (acc[designation] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).map(([designation, count]) => ({ designation, count })),
    }

    // ==================== ALLOCATION ANALYTICS ====================
    const allocationSummary = {
      total: allocations.length,
      theory: allocations.filter(a => a.type === 'THEORY').length,
      lab: allocations.filter(a => a.type === 'LAB').length,
      modified: allocations.filter(a => a.isModified).length,
      mapped: allocations.filter(a => a.subjectId !== null).length,
      unmapped: allocations.filter(a => a.subjectId === null).length,
      mappingRate: allocations.length > 0 
        ? Math.round(allocations.filter(a => a.subjectId !== null).length / allocations.length * 100)
        : 0,
    }

    // Day-wise distribution
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayWiseAllocations = days.map(day => ({
      day,
      total: allocations.filter(a => a.day === day).length,
      theory: allocations.filter(a => a.day === day && a.type === 'THEORY').length,
      lab: allocations.filter(a => a.day === day && a.type === 'LAB').length,
    }))

    // ==================== SLOT REQUEST ANALYTICS ====================
    const requestSummary = {
      total: slotRequests.length,
      pending: slotRequests.filter(r => r.status === 'PENDING').length,
      approved: slotRequests.filter(r => r.status === 'APPROVED').length,
      rejected: slotRequests.filter(r => r.status === 'REJECTED').length,
      approvalRate: slotRequests.length > 0 
        ? Math.round(slotRequests.filter(r => r.status === 'APPROVED').length / slotRequests.length * 100)
        : 0,
    }

    // ==================== SEMESTER-WISE BREAKDOWN ====================
    const semesterBreakdown = Object.entries(
      sections.reduce((acc, section) => {
        const sem = section.semester.code
        if (!acc[sem]) {
          acc[sem] = { semester: sem, sections: 0, students: 0, allocations: 0, mappings: 0 }
        }
        acc[sem].sections += 1
        acc[sem].students += section.studentCount
        acc[sem].allocations += section.allocations.length
        acc[sem].mappings += section.facultyMappings.length
        return acc
      }, {} as Record<string, { semester: string; sections: number; students: number; allocations: number; mappings: number }>)
    ).map(([_, data]) => data).sort((a, b) => a.semester.localeCompare(b.semester))

    return NextResponse.json({
      department: {
        id: department?.id,
        code: department?.code,
        name: department?.name,
        statistics: department?.statistics,
      },
      activeSession: {
        id: activeSession.id,
        name: activeSession.name,
        academicYear: activeSession.academicYear,
        semesterType: activeSession.semesterType,
      },
      overviewStats,
      sectionAnalytics,
      sectionSummary,
      roomAnalytics,
      departmentRoomAnalytics,
      sharedRoomAnalytics,
      roomSummary,
      subjectAnalytics,
      subjectSummary,
      facultyAnalytics,
      facultySummary,
      allocationSummary,
      dayWiseAllocations,
      requestSummary,
      semesterBreakdown,
    })
  } catch (error) {
    console.error('Error fetching HOD analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
