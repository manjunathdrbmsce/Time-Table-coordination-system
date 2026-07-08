import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { ArrowLeft, GraduationCap, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HodSectionDetailPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const { sectionId } = await params;

  const activeSession = await db.academicSession.findFirst({
    where: { isActive: true },
  });

  if (!activeSession) {
    redirect("/hod/sections");
  }

  const section = await db.section.findUnique({
    where: { id: sectionId },
    include: {
      department: true,
      semester: true,
      allocations: {
        where: { sessionId: activeSession.id },
        include: {
          room: { select: { code: true, logicalName: true, actualName: true } },
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      },
    },
  });
  if (!section || section.departmentId !== session.user.departmentId || section.sessionId !== activeSession.id) {
    redirect("/hod/sections");
  }

  const theoryHrs = section.allocations.filter(a => a.type === "THEORY").length;
  const labHrs = section.allocations.filter(a => a.type === "LAB").length;
  const totalHrs = theoryHrs + labHrs;
  const targetHrs = section.requiredTheoryHours + section.requiredLabHours;
  const percentage = targetHrs > 0 ? Math.round((totalHrs / targetHrs) * 100) : 0;
  const label = `${section.year}${section.division}`;

  const gridAllocations = section.allocations.map(a => ({
    id: a.id,
    day: a.day,
    startTime: a.startTime,
    endTime: a.endTime,
    subject: a.subject,
    faculty: a.faculty,
    type: a.type,
    room: a.room.actualName || a.room.logicalName || a.room.code,
    section: label,
    isModified: a.isModified,
  }));

  return (
    <div className="space-y-6">
      <Link href="/hod/sections">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sections
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {section.department.code} - {label}
          </h1>
          <Badge variant="secondary">{section.semester.name}</Badge>
          <Badge variant="outline">{activeSession.name}</Badge>
        </div>
        <p className="text-muted-foreground">
          {section.studentCount} students
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Theory Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{theoryHrs}/{section.requiredTheoryHours}</div>
            <Progress value={(theoryHrs / section.requiredTheoryHours) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Hours</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labHrs}/{section.requiredLabHours}</div>
            <Progress value={(labHrs / section.requiredLabHours) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage}%</div>
            <Progress value={percentage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
          <CardDescription>View-only mode</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableGrid allocations={gridAllocations} mode="view" semesterNum={parseInt(section.semester.name.replace(/\D/g, '')) || 5} />
        </CardContent>
      </Card>
    </div>
  );
}
