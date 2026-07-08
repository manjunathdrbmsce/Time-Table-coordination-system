import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Building2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HODDashboard() {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const departmentId = session.user.departmentId;

  const activeSession = await db.academicSession.findFirst({
    where: { isActive: true },
  });

  if (!activeSession) {
    redirect("/login");
  }

  const [department, sections, rooms] = await Promise.all([
    db.department.findUnique({
      where: { id: departmentId },
      include: { statistics: true },
    }),
    db.section.findMany({
      where: { departmentId, sessionId: activeSession.id },
      include: {
        semester: true,
        allocations: { where: { sessionId: activeSession.id }, select: { type: true } },
      },
    }),
    db.room.findMany({
      where: { departmentId },
      include: {
        statistics: true,
        allocations: { where: { sessionId: activeSession.id, section: { departmentId } }, select: { id: true } },
      },
      take: 8,
      orderBy: { code: "asc" },
    }),
  ]);
  const totalTheory = sections.reduce((sum, s) => 
    sum + s.allocations.filter(a => a.type === "THEORY").length, 0
  );
  const totalLab = sections.reduce((sum, s) => 
    sum + s.allocations.filter(a => a.type === "LAB").length, 0
  );
  const requiredTheory = sections.reduce((sum, s) => sum + s.requiredTheoryHours, 0);
  const requiredLab = sections.reduce((sum, s) => sum + s.requiredLabHours, 0);
  const totalAchieved = totalTheory + totalLab;
  const totalRequired = requiredTheory + requiredLab;
  const percentage = totalRequired > 0 ? Math.round((totalAchieved / totalRequired) * 100) : 0;

  const sectionsBySemester = sections.reduce((acc, section) => {
    const semCode = section.semester.code;
    if (!acc[semCode]) acc[semCode] = [];
    acc[semCode].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Department Overview</h1>
          <Badge variant="default">{department?.code} HOD</Badge>
        </div>
        <p className="text-muted-foreground">
          View statistics and timetables for {department?.name} in {activeSession.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
            <Link href="/hod/sections">
              <Button variant="link" className="px-0 text-xs">View Ã¢â€ â€™</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Theory</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTheory}/{requiredTheory}</div>
            <Progress value={requiredTheory > 0 ? (totalTheory / requiredTheory) * 100 : 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLab}/{requiredLab}</div>
            <Progress value={requiredLab > 0 ? (totalLab / requiredLab) * 100 : 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
            <Link href="/hod/rooms">
              <Button variant="link" className="px-0 text-xs">View Ã¢â€ â€™</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Overall
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none"
                    strokeDasharray={`${percentage * 3.52} 352`}
                    className={percentage >= 90 ? "text-green-500" : percentage >= 70 ? "text-yellow-500" : "text-red-500"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold">{percentage}%</span>
                  <span className="text-xs text-muted-foreground">Allocated</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Sections by Semester
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(sectionsBySemester).map(([semCode, semSections]) => (
                <Card key={semCode} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Sem {semCode}</h3>
                      <Badge variant="secondary">{semSections.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {semSections.slice(0, 4).map((section) => {
                        const hrs = section.allocations.length;
                        const target = section.requiredTheoryHours + section.requiredLabHours;
                        const complete = hrs >= target;
                        return (
                          <div key={section.id} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              {complete ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-yellow-500" />}
                              {section.year}{section.division}
                            </span>
                            <span className="text-muted-foreground">{hrs}/{target}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Room Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{room.code}</h4>
                    <Badge variant={room.type === "LAB" ? "default" : "secondary"}>{room.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{room.logicalName}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span className="font-medium">{Math.round((room.allocations.length / 48) * 100)}%</span>
                    </div>
                    <Progress value={Math.round((room.allocations.length / 48) * 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
