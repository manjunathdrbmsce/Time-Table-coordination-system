import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SectionTimetableClient } from "./section-timetable-client";

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoordinatorSectionDetailPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const { sectionId } = await params;

  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: {
      department: true,
      semester: true,
      allocations: {
        include: {
          room: { select: { code: true, logicalName: true, actualName: true } },
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!section || section.departmentId !== session.user.departmentId) {
    redirect("/coordinator/sections");
  }

  const label = `${section.year}${section.division}`;

  // Transform data for client component
  const sectionData = {
    id: section.id,
    year: section.year,
    division: section.division,
    studentCount: section.studentCount,
    requiredTheoryHours: section.requiredTheoryHours,
    requiredLabHours: section.requiredLabHours,
    department: {
      id: section.department.id,
      code: section.department.code,
      name: section.department.name,
    },
    semester: {
      id: section.semester.id,
      name: section.semester.name,
    },
    allocations: section.allocations.map(a => ({
      id: a.id,
      day: a.day,
      startTime: a.startTime,
      endTime: a.endTime,
      subject: a.subject,
      faculty: a.faculty,
      type: a.type as "THEORY" | "LAB",
      room: a.room.actualName || a.room.logicalName || a.room.code,
      section: label,
      isModified: a.isModified,
    })),
  };

  return <SectionTimetableClient section={sectionData} />;
}
