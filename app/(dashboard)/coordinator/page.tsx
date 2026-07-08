import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, DoorOpen, Clock, Bell, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CoordinatorDashboard() {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const departmentId = session.user.departmentId;

  const [department, sections, rooms, pendingRequests, incomingRequests] = await Promise.all([
    db.department.findUnique({
      where: { id: departmentId },
      include: { statistics: true },
    }),
    db.section.findMany({
      where: { departmentId },
      include: {
        allocations: { select: { type: true } },
      },
    }),
    db.room.findMany({
      where: { departmentId },
      include: { statistics: true },
    }),
    db.slotRequest.count({
      where: { requesterId: session.user.id, status: "PENDING" },
    }),
    db.slotRequest.count({
      where: {
        room: { departmentId },
        status: "PENDING",
        requesterId: { not: session.user.id },
      },
    }),
  ]);

  // Calculate totals
  const totalTheory = sections.reduce((sum, s) => sum + s.allocations.filter(a => a.type === "THEORY").length, 0);
  const totalLab = sections.reduce((sum, s) => sum + s.allocations.filter(a => a.type === "LAB").length, 0);
  const requiredTheory = sections.reduce((sum, s) => sum + s.requiredTheoryHours, 0);
  const requiredLab = sections.reduce((sum, s) => sum + s.requiredLabHours, 0);
  const totalAllocated = totalTheory + totalLab;
  const totalRequired = requiredTheory + requiredLab;
  const percentage = totalRequired > 0 ? Math.round((totalAllocated / totalRequired) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Coordinator Dashboard</h1>
          <Badge variant="default">{department?.code}</Badge>
        </div>
        <p className="text-muted-foreground">
          Manage timetables for {department?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
            <Link href="/coordinator/sections">
              <Button variant="link" className="px-0 text-xs">View All →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
            <Link href="/coordinator/rooms">
              <Button variant="link" className="px-0 text-xs">View All →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Requests awaiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incomingRequests}</div>
            <Link href="/coordinator/approvals">
              <Button variant="link" className="px-0 text-xs">Review →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Allocation Progress</CardTitle>
            <CardDescription>Overall timetable completion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Progress</span>
              <span className="text-2xl font-bold">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Theory</span>
                </div>
                <p className="text-lg font-semibold">{totalTheory}/{requiredTheory} hrs</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Lab</span>
                </div>
                <p className="text-lg font-semibold">{totalLab}/{requiredLab} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/coordinator/sections" className="block">
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="w-4 h-4 mr-2" />
                Edit Section Timetables
              </Button>
            </Link>
            <Link href="/coordinator/rooms" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DoorOpen className="w-4 h-4 mr-2" />
                View Room Schedules
              </Button>
            </Link>
            <Link href="/coordinator/approvals" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="w-4 h-4 mr-2" />
                Review Slot Requests
                {incomingRequests > 0 && (
                  <Badge variant="destructive" className="ml-auto">{incomingRequests}</Badge>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
