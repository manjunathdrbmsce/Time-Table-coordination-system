import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import * as XLSX from 'xlsx'

const subjectRowSchema = z.object({
  code: z.string().min(1, 'Subject code is required'),
  name: z.string().min(1, 'Subject name is required'),
  shortName: z.string().optional().nullable(),
  type: z.enum(['THEORY', 'LAB', 'TUTORIAL']),
  credits: z.number().int().min(1).max(10),
  hoursPerWeek: z.number().int().min(1).max(10),
  semesterNum: z.number().int().min(1).max(8),
})

// POST - Bulk upload subjects from Excel/CSV
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

    // Parse header row (case-insensitive)
    const headers = rawData[0].map((h: string) => h?.toString().toLowerCase().trim())
    
    const codeIdx = headers.findIndex((h: string) => h === 'code' || h === 'subject code' || h === 'subjectcode')
    const nameIdx = headers.findIndex((h: string) => h === 'name' || h === 'subject name' || h === 'subjectname' || h === 'subject')
    const shortNameIdx = headers.findIndex((h: string) => h === 'short name' || h === 'shortname' || h === 'short' || h === 'abbreviation')
    const typeIdx = headers.findIndex((h: string) => h === 'type' || h === 'subject type' || h === 'category')
    const creditsIdx = headers.findIndex((h: string) => h === 'credits' || h === 'credit')
    const hoursIdx = headers.findIndex((h: string) => h === 'hours' || h === 'hours per week' || h === 'hoursperweek' || h === 'hours/week')
    const semesterIdx = headers.findIndex((h: string) => h === 'semester' || h === 'sem' || h === 'semesternum' || h === 'semester num')

    if (codeIdx === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Code (or "Subject Code")' },
        { status: 400 }
      )
    }

    if (nameIdx === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Name (or "Subject Name", "Subject")' },
        { status: 400 }
      )
    }

    if (semesterIdx === -1) {
      return NextResponse.json(
        { error: 'Missing required column: Semester (or "Sem", "SemesterNum")' },
        { status: 400 }
      )
    }

    // Get existing subject codes in department
    const existingSubjects = await db.subject.findMany({
      where: { departmentId: user.departmentId },
      select: { code: true, semesterNum: true },
    })
    const existingCodes = new Set(existingSubjects.map(s => `${s.code.toUpperCase()}-SEM${s.semesterNum}`))

    // Parse data rows
    const subjects: any[] = []
    const errors: { row: number; error: string }[] = []
    const skipped: { row: number; code: string; reason: string }[] = []
    const seenCodes = new Set<string>()

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0 || !row[codeIdx]) continue

      const code = row[codeIdx]?.toString().trim().toUpperCase()
      const name = row[nameIdx]?.toString().trim()
      const shortName = shortNameIdx >= 0 ? row[shortNameIdx]?.toString().trim().toUpperCase() : null
      
      // Parse type - default to THEORY if not specified or invalid
      let type: 'THEORY' | 'LAB' | 'TUTORIAL' = 'THEORY'
      if (typeIdx >= 0 && row[typeIdx]) {
        const rawType = row[typeIdx].toString().trim().toUpperCase()
        if (rawType === 'LAB' || rawType === 'LABORATORY' || rawType === 'L') {
          type = 'LAB'
        } else if (rawType === 'TUTORIAL' || rawType === 'TUT' || rawType === 'T') {
          type = 'TUTORIAL'
        } else if (rawType === 'THEORY' || rawType === 'TH' || rawType === 'LECTURE') {
          type = 'THEORY'
        }
      }

      // Parse credits - default to 3
      let credits = 3
      if (creditsIdx >= 0 && row[creditsIdx]) {
        const parsedCredits = parseInt(row[creditsIdx].toString())
        if (!isNaN(parsedCredits) && parsedCredits >= 1 && parsedCredits <= 10) {
          credits = parsedCredits
        }
      }

      // Parse hours per week - default to credits or 3
      let hoursPerWeek = credits
      if (hoursIdx >= 0 && row[hoursIdx]) {
        const parsedHours = parseInt(row[hoursIdx].toString())
        if (!isNaN(parsedHours) && parsedHours >= 1 && parsedHours <= 10) {
          hoursPerWeek = parsedHours
        }
      }

      // Parse semester
      const semesterRaw = row[semesterIdx]?.toString().trim()
      const semesterNum = parseInt(semesterRaw)
      
      if (!code || !name) {
        errors.push({ row: i + 1, error: 'Missing code or name' })
        continue
      }

      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        errors.push({ row: i + 1, error: `Invalid semester: ${semesterRaw}. Must be 1-8` })
        continue
      }

      const uniqueKey = `${code}-SEM${semesterNum}`

      // Check for duplicates in file
      if (seenCodes.has(uniqueKey)) {
        skipped.push({ row: i + 1, code, reason: 'Duplicate in file (same code & semester)' })
        continue
      }

      // Check for existing codes in database
      if (existingCodes.has(uniqueKey)) {
        skipped.push({ row: i + 1, code, reason: 'Already exists in department for this semester' })
        continue
      }

      try {
        subjectRowSchema.parse({ code, name, shortName, type, credits, hoursPerWeek, semesterNum })
        subjects.push({
          code,
          name,
          shortName: shortName || null,
          type,
          credits,
          hoursPerWeek,
          semesterNum,
          departmentId: user.departmentId,
        })
        seenCodes.add(uniqueKey)
        existingCodes.add(uniqueKey) // Prevent duplicates in same upload
      } catch (e) {
        if (e instanceof z.ZodError) {
          errors.push({ row: i + 1, error: e.errors.map(err => err.message).join(', ') })
        }
      }
    }

    if (subjects.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid subject records to import',
        errors,
        skipped,
      }, { status: 400 })
    }

    // Bulk create subjects
    const result = await db.subject.createMany({
      data: subjects,
      skipDuplicates: true,
    })

    // Log the action
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPLOAD_SUBJECTS',
        entityType: 'Subject',
        entityId: 'bulk',
        details: `Bulk uploaded ${result.count} subjects`,
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
    console.error('Error bulk uploading subjects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
