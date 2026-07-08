import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DoorOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function HodRoomsPage() {
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

  const rooms = await db.room.findMany({
    where: { departmentId },
    include: {
      department: true,
      statistics: true,
      allocations: { where: { sessionId: activeSession.id, section: { departmentId } }, select: { id: true } },
    },
    orderBy: { code: "asc" },
  });
  const classrooms = rooms.filter(r => r.type === "CLASSROOM");
  const labs = rooms.filter(r => r.type === "LAB");

  const avgUtilization = rooms.length > 0
    ? Math.round(rooms.reduce((sum, r) => sum + Math.round((r.allocations.length / 48) * 100), 0) / rooms.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Room Timetables</h1>
        <p className="text-muted-foreground">
          View room timetables for your department in {activeSession.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classrooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <Progress value={avgUtilization} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Classrooms
            </CardTitle>
            <CardDescription>{classrooms.length} classrooms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {classrooms.map((room) => (
              <Link key={room.id} href={`/hod/rooms/${room.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-medium">{room.code}</p>
                    <p className="text-sm text-muted-foreground">{room.logicalName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round((room.allocations.length / 48) * 100)}%</p>
                      <Progress value={Math.round((room.allocations.length / 48) * 100)} className="w-16 h-2" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            ))}
            {classrooms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No classrooms</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Labs
            </CardTitle>
            <CardDescription>{labs.length} labs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {labs.map((room) => (
              <Link key={room.id} href={`/hod/rooms/${room.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-medium">{room.code}</p>
                    <p className="text-sm text-muted-foreground">{room.logicalName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round((room.allocations.length / 48) * 100)}%</p>
                      <Progress value={Math.round((room.allocations.length / 48) * 100)} className="w-16 h-2" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            ))}
            {labs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No labs</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
