import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all necessary data
    const [
      rooms,
      roomStats,
      departments,
      subjects,
      faculties,
      facultyMappings,
      sections,
      allocations,
      slotRequests,
      approvals,
      buildings,
    ] = await Promise.all([
      db.room.findMany({
        select: { id: true, logicalName: true, type: true, departmentId: true, buildingId: true },
      }),
      db.roomStats.findMany({
        include: { room: { include: { building: true } } },
      }),
      db.department.findMany({
        select: { id: true, code: true, name: true },
      }),
      db.subject.findMany({
        select: { id: true, departmentId: true, type: true, createdAt: true },
      }),
      db.faculty.findMany({
        select: { id: true, departmentId: true, createdAt: true },
      }),
      db.facultySubjectMapping.findMany({
        include: {
          section: { select: { departmentId: true } },
        },
      }),
      db.section.findMany({
        select: { id: true, departmentId: true },
      }),
      db.allocation.findMany({
        select: { 
          id: true, 
          isModified: true, 
          subjectId: true,
          section: { select: { departmentId: true } },
        },
      }),
      db.slotRequest.findMany({
        select: { id: true, status: true, createdAt: true },
      }),
      db.approval.findMany({
        select: { id: true, decision: true, createdAt: true },
      }),
      db.building.findMany({
        select: { id: true, code: true, name: true, floors: true },
      }),
    ])

    // ==================== ROOM UTILIZATION ANALYTICS ====================
    
    // Separate classrooms and labs
    const classroomStats = roomStats.filter(rs => rs.room.type === 'CLASSROOM' || rs.room.type === 'CLASS')
    const labStats = roomStats.filter(rs => rs.room.type === 'LAB')

    // Calculate utilization buckets for classrooms
    const classroomUtilization = {
      high: classroomStats.filter(rs => rs.utilizationPct >= 80).length,
      medium: classroomStats.filter(rs => rs.utilizationPct >= 60 && rs.utilizationPct < 80).length,
      low: classroomStats.filter(rs => rs.utilizationPct >= 50 && rs.utilizationPct < 60).length,
      veryLow: classroomStats.filter(rs => rs.utilizationPct < 50).length,
      total: classroomStats.length,
      avgUtilization: classroomStats.length > 0 
        ? Math.round(classroomStats.reduce((sum, rs) => sum + rs.utilizationPct, 0) / classroomStats.length) 
        : 0,
    }

    // Calculate utilization buckets for labs
    const labUtilization = {
      high: labStats.filter(rs => rs.utilizationPct >= 80).length,
      medium: labStats.filter(rs => rs.utilizationPct >= 60 && rs.utilizationPct < 80).length,
      low: labStats.filter(rs => rs.utilizationPct >= 50 && rs.utilizationPct < 60).length,
      veryLow: labStats.filter(rs => rs.utilizationPct < 50).length,
      total: labStats.length,
      avgUtilization: labStats.length > 0 
        ? Math.round(labStats.reduce((sum, rs) => sum + rs.utilizationPct, 0) / labStats.length) 
        : 0,
    }

    // Individual room utilization data for charts
    const roomUtilizationDetails = roomStats.map(rs => ({
      name: rs.room.logicalName,
      type: rs.room.type,
      utilization: rs.utilizationPct,
      occupied: rs.occupiedSlots,
      total: rs.totalSlots,
    })).sort((a, b) => b.utilization - a.utilization)

    // ==================== MODIFICATION ANALYTICS ====================
    
    const totalAllocations = allocations.length
    const modifiedAllocations = allocations.filter(a => a.isModified).length
    const modificationPercentage = totalAllocations > 0 
      ? Math.round((modifiedAllocations / totalAllocations) * 100) 
      : 0

    // Slot requests and approvals
    const totalRequests = slotRequests.length
    const approvedRequests = slotRequests.filter(sr => sr.status === 'APPROVED').length
    const rejectedRequests = slotRequests.filter(sr => sr.status === 'REJECTED').length
    const pendingRequests = slotRequests.filter(sr => sr.status === 'PENDING').length

    const requestAnalytics = {
      total: totalRequests,
      approved: approvedRequests,
      rejected: rejectedRequests,
      pending: pendingRequests,
      approvalRate: totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0,
    }

    // ==================== DEPARTMENT-WISE ANALYTICS ====================
    
    // Subjects by department
    const subjectsByDepartment = departments.map(dept => {
      const deptSubjects = subjects.filter(s => s.departmentId === dept.id)
      return {
        department: dept.code,
        departmentName: dept.name,
        total: deptSubjects.length,
        theory: deptSubjects.filter(s => s.type === 'THEORY').length,
        lab: deptSubjects.filter(s => s.type === 'LAB').length,
        tutorial: deptSubjects.filter(s => s.type === 'TUTORIAL').length,
      }
    }).filter(d => d.total > 0)

    // Faculty by department
    const facultyByDepartment = departments.map(dept => ({
      department: dept.code,
      departmentName: dept.name,
      count: faculties.filter(f => f.departmentId === dept.id).length,
    })).filter(d => d.count > 0)

    // Faculty mappings by department
    const mappingsByDepartment = departments.map(dept => {
      const deptMappings = facultyMappings.filter(fm => fm.section.departmentId === dept.id)
      return {
        department: dept.code,
        departmentName: dept.name,
        mappings: deptMappings.length,
      }
    }).filter(d => d.mappings > 0)

    // Sections by department with subject mappings
    const sectionsByDepartment = departments.map(dept => {
      const deptSections = sections.filter(s => s.departmentId === dept.id)
      const deptMappings = facultyMappings.filter(fm => fm.section.departmentId === dept.id)
      
      // Get unique subject-section combinations
      const uniqueMappings = new Set(deptMappings.map(m => `${m.subjectId}-${m.sectionId}`))
      
      return {
        department: dept.code,
        departmentName: dept.name,
        sections: deptSections.length,
        subjectMappings: uniqueMappings.size,
        facultyMappings: deptMappings.length,
      }
    }).filter(d => d.sections > 0)

    // Allocations by department
    const allocationsByDepartment = departments.map(dept => {
      const deptAllocations = allocations.filter(a => a.section.departmentId === dept.id)
      const deptMapped = deptAllocations.filter(a => a.subjectId !== null)
      return {
        department: dept.code,
        departmentName: dept.name,
        total: deptAllocations.length,
        mapped: deptMapped.length,
        unmapped: deptAllocations.length - deptMapped.length,
        mappingRate: deptAllocations.length > 0 
          ? Math.round((deptMapped.length / deptAllocations.length) * 100) 
          : 0,
      }
    }).filter(d => d.total > 0)

    // ==================== OVERALL STATS ====================
    
    const overallStats = {
      totalRooms: rooms.length,
      totalClassrooms: rooms.filter(r => r.type === 'CLASSROOM' || r.type === 'CLASS').length,
      totalLabs: rooms.filter(r => r.type === 'LAB').length,
      totalDepartments: departments.length,
      totalSubjects: subjects.length,
      totalFaculty: faculties.length,
      totalSections: sections.length,
      totalAllocations,
      totalMappings: facultyMappings.length,
      totalBuildings: buildings.length,
    }

    // ==================== BUILDING ANALYTICS ====================
    
    // Building-wise room and utilization data
    const buildingAnalytics = buildings.map(building => {
      const buildingRooms = rooms.filter(r => r.buildingId === building.id)
      const buildingRoomStats = roomStats.filter(rs => rs.room.buildingId === building.id)
      
      const classrooms = buildingRooms.filter(r => r.type === 'CLASSROOM' || r.type === 'CLASS').length
      const labs = buildingRooms.filter(r => r.type === 'LAB').length
      
      const totalSlots = buildingRoomStats.reduce((sum, rs) => sum + rs.totalSlots, 0)
      const occupiedSlots = buildingRoomStats.reduce((sum, rs) => sum + rs.occupiedSlots, 0)
      const freeSlots = buildingRoomStats.reduce((sum, rs) => sum + rs.freeSlots, 0)
      
      const avgUtilization = buildingRoomStats.length > 0
        ? Math.round(buildingRoomStats.reduce((sum, rs) => sum + rs.utilizationPct, 0) / buildingRoomStats.length)
        : 0
      
      // Utilization buckets for this building
      const highUtil = buildingRoomStats.filter(rs => rs.utilizationPct >= 80).length
      const mediumUtil = buildingRoomStats.filter(rs => rs.utilizationPct >= 60 && rs.utilizationPct < 80).length
      const lowUtil = buildingRoomStats.filter(rs => rs.utilizationPct >= 50 && rs.utilizationPct < 60).length
      const veryLowUtil = buildingRoomStats.filter(rs => rs.utilizationPct < 50).length
      
      return {
        id: building.id,
        code: building.code,
        name: building.name,
        floors: building.floors,
        totalRooms: buildingRooms.length,
        classrooms,
        labs,
        totalSlots,
        occupiedSlots,
        freeSlots,
        avgUtilization,
        utilizationBreakdown: {
          high: highUtil,
          medium: mediumUtil,
          low: lowUtil,
          veryLow: veryLowUtil,
        },
      }
    }).sort((a, b) => b.totalRooms - a.totalRooms)

    // Rooms without building assignment
    const unassignedRooms = rooms.filter(r => !r.buildingId).length
    const unassignedRoomStats = roomStats.filter(rs => !rs.room.buildingId)
    const unassignedUtilization = unassignedRoomStats.length > 0
      ? Math.round(unassignedRoomStats.reduce((sum, rs) => sum + rs.utilizationPct, 0) / unassignedRoomStats.length)
      : 0

    // Building summary stats
    const buildingSummary = {
      totalBuildings: buildings.length,
      unassignedRooms,
      unassignedUtilization,
      highestUtilizationBuilding: buildingAnalytics.length > 0 
        ? buildingAnalytics.reduce((prev, curr) => prev.avgUtilization > curr.avgUtilization ? prev : curr)
        : null,
      lowestUtilizationBuilding: buildingAnalytics.filter(b => b.totalRooms > 0).length > 0
        ? buildingAnalytics.filter(b => b.totalRooms > 0).reduce((prev, curr) => prev.avgUtilization < curr.avgUtilization ? prev : curr)
        : null,
    }

    return NextResponse.json({
      classroomUtilization,
      labUtilization,
      roomUtilizationDetails,
      modificationAnalytics: {
        totalAllocations,
        modifiedAllocations,
        modificationPercentage,
      },
      requestAnalytics,
      subjectsByDepartment,
      facultyByDepartment,
      mappingsByDepartment,
      sectionsByDepartment,
      allocationsByDepartment,
      overallStats,
      buildingAnalytics,
      buildingSummary,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
