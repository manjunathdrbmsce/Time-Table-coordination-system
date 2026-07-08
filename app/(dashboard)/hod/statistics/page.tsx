import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, GraduationCap, DoorOpen } from "lucide-react";

export default async function HodStatisticsPage() {
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
    }),
  ]);
  // Calculate section stats
  const sectionStats = sections.map(s => {
    const theory = s.allocations.filter(a => a.type === "THEORY").length;
    const lab = s.allocations.filter(a => a.type === "LAB").length;
    const total = theory + lab;
    const target = s.requiredTheoryHours + s.requiredLabHours;
    return {
      label: `${s.semester.code}-${s.year}${s.division}`,
      theory,
      lab,
      total,
      target,
      percentage: target > 0 ? Math.round((total / target) * 100) : 0,
    };
  });

  // Calculate room stats
  const roomStats = rooms.map(r => ({
    code: r.code,
    type: r.type,
    utilization: Math.round((r.allocations.length / 48) * 100),
    occupied: r.allocations.length,
    free: Math.max(48 - r.allocations.length, 0),
  }));

  const avgSectionCompletion = sectionStats.length > 0
    ? Math.round(sectionStats.reduce((sum, s) => sum + s.percentage, 0) / sectionStats.length)
    : 0;

  const avgRoomUtilization = roomStats.length > 0
    ? Math.round(roomStats.reduce((sum, r) => sum + r.utilization, 0) / roomStats.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
          <Badge variant="secondary">{department?.code}</Badge>
        </div>
        <p className="text-muted-foreground">
          Detailed statistics for {department?.name} in {activeSession.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
            <p className="text-xs text-muted-foreground">Total sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSectionCompletion}%</div>
            <Progress value={avgSectionCompletion} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
            <p className="text-xs text-muted-foreground">Total rooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRoomUtilization}%</div>
            <Progress value={avgRoomUtilization} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Section Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Section Allocation Status
          </CardTitle>
          <CardDescription>Completion percentage for each section</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectionStats.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground">
                    {s.total}/{s.target} hrs ({s.percentage}%)
                  </span>
                </div>
                <div className="flex gap-1 h-3">
                  <div
                    className="bg-green-500 rounded-l"
                    style={{ width: `${(s.theory / s.target) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500 rounded-r"
                    style={{ width: `${(s.lab / s.target) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Theory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Lab</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5" />
            Room Utilization
          </CardTitle>
          <CardDescription>Usage statistics for each room</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roomStats.map((r, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.code}</span>
                  <Badge variant={r.type === "LAB" ? "default" : "secondary"}>{r.type}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Utilization</span>
                    <span className="font-medium">{r.utilization}%</span>
                  </div>
                  <Progress value={r.utilization} className="h-2" />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Occupied: {r.occupied}</span>
                  <span>Free: {r.free}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
