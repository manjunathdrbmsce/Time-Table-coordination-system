import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import * as XLSX from 'xlsx'

const facultyRowSchema = z.object({
  name: z.string().min(1, 'Faculty name is required'),
  initials: z.string().min(1, 'Initials are required').max(10),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
})

// POST - Bulk upload faculties from Excel/CSV
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'COORDINATOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's department
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return NextResponse.json(
        { error: 'File must have at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Parse header row
    const headers = rawData[0].map((h: string) => h?.toString().toLowerCase().trim())
    const nameIdx = headers.findIndex((h: string) => h === 'name' || h === 'faculty name' || h === 'faculty')
    const initialsIdx = headers.findIndex((h: string) => h === 'initials' || h === 'initial' || h === 'short' || h === 'code')
    const emailIdx = headers.findIndex((h: string) => h === 'email' || h === 'e-mail')
    const phoneIdx = headers.findIndex((h: string) => h === 'phone' || h === 'mobile' || h === 'contact')
    const designationIdx = headers.findIndex((h: string) => h === 'designation' || h === 'title' || h === 'position')

    if (nameIdx === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Name (or "Faculty Name", "Faculty")' },
        { status: 400 }
      )
    }

    if (initialsIdx === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Initials (or "Initial", "Short", "Code")' },
        { status: 400 }
      )
    }

    // Get existing initials in department
    const existingFaculties = await db.faculty.findMany({
      where: { departmentId: user.departmentId },
      select: { initials: true },
    })
    const existingInitials = new Set(existingFaculties.map(f => f.initials.toUpperCase()))

    // Parse data rows
    const faculties: any[] = []
    const errors: { row: number; error: string }[] = []
    const skipped: { row: number; initials: string; reason: string }[] = []
    const seenInitials = new Set<string>()

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0 || !row[nameIdx]) continue

      const name = row[nameIdx]?.toString().trim()
      const initials = row[initialsIdx]?.toString().trim().toUpperCase()
      const email = emailIdx >= 0 ? row[emailIdx]?.toString().trim() : null
      const phone = phoneIdx >= 0 ? row[phoneIdx]?.toString().trim() : null
      const designation = designationIdx >= 0 ? row[designationIdx]?.toString().trim() : null

      if (!name || !initials) {
        errors.push({ row: i + 1, error: 'Missing name or initials' })
        continue
      }

      // Check for duplicates in file
      if (seenInitials.has(initials)) {
        skipped.push({ row: i + 1, initials, reason: 'Duplicate in file' })
        continue
      }

      // Check for existing initials in database
      if (existingInitials.has(initials)) {
        skipped.push({ row: i + 1, initials, reason: 'Already exists in department' })
        continue
      }

      try {
        facultyRowSchema.parse({ name, initials, email, phone, designation })
        faculties.push({
          name,
          initials,
          email: email || null,
          phone: phone || null,
          designation: designation || null,
          departmentId: user.departmentId,
        })
        seenInitials.add(initials)
        existingInitials.add(initials) // Prevent duplicates in same upload
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push({ row: i + 1, error: e.errors.map(err => err.message).join(', ') })
        }
      }
    }

    if (faculties.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid faculty records to import',
        errors,
        skipped,
      }, { status: 400 })
    }

    // Bulk create faculties
    const result = await db.faculty.createMany({
      data: faculties,
      skipDuplicates: true,
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPLOAD_FACULTY',
        entityType: 'Faculty',
        entityId: 'bulk',
        details: `Bulk uploaded ${result.count} faculties`,
      },
    })

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: rawData.length - 1,
      errors,
      skipped,
    })
  } catch (error) {
    console.error('Error bulk uploading faculties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
