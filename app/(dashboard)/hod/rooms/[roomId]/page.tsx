import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { ArrowLeft, DoorOpen, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering to always show fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HodRoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.departmentId) {
    redirect("/login");
  }

  const { roomId } = await params;
  const departmentId = session.user.departmentId;

  const activeSession = await db.academicSession.findFirst({
    where: { isActive: true },
  });

  if (!activeSession) {
    redirect("/hod/rooms");
  }

  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      department: true,
      statistics: true,
      allocations: {
        where: { sessionId: activeSession.id, section: { departmentId } },
        include: {
          section: {
            include: { department: true },
          },
        },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      },
    },
  });
  if (!room || room.departmentId !== session.user.departmentId) {
    redirect("/hod/rooms");
  }

  const totalSlots = 48;
  const occupiedSlots = room.allocations.length;
  const freeSlots = Math.max(totalSlots - occupiedSlots, 0);
  const utilizationPct = Math.round((occupiedSlots / totalSlots) * 100);
  const gridAllocations = room.allocations.map(a => ({
    id: a.id,
    day: a.day,
    startTime: a.startTime,
    endTime: a.endTime,
    subject: a.subject,
    faculty: a.faculty,
    type: a.type,
    room: room.code,
    section: `${a.section.department.code} ${a.section.year}${a.section.division}`,
    isModified: a.isModified,
  }));

  return (
    <div className="space-y-6">
      <Link href="/hod/rooms">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{room.code}</h1>
          <Badge variant={room.type === "LAB" ? "default" : "secondary"}>{room.type}</Badge>
        </div>
        <p className="text-muted-foreground">
          {room.logicalName} | Capacity: {room.capacity} | {activeSession.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationPct}%</div>
            <Progress value={utilizationPct} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupiedSlots}/{totalSlots}
            </div>
            <p className="text-xs text-muted-foreground">Weekly slots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {freeSlots}
            </div>
            <p className="text-xs text-muted-foreground">Available slots</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>View-only mode</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableGrid allocations={gridAllocations} mode="view" />
        </CardContent>
      </Card>
    </div>
  );
}
