import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DoorOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function CoordinatorRoomsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const rooms = await db.room.findMany({
    include: {
      department: { select: { code: true, name: true } },
      statistics: true,
    },
    orderBy: [{ department: { code: "asc" } }, { code: "asc" }],
  });

  const classrooms = rooms.filter(r => r.type === "CLASSROOM");
  const labs = rooms.filter(r => r.type === "LAB");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Room Timetables</h1>
        <p className="text-muted-foreground">
          View and request slots from any room
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Classrooms
            </CardTitle>
            <CardDescription>{classrooms.length} rooms available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {classrooms.map((room) => (
              <Link key={room.id} href={`/coordinator/rooms/${room.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-medium">{room.actualName || room.logicalName}</p>
                    <p className="text-sm text-muted-foreground">{room.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{room.statistics?.utilizationPct || 0}%</p>
                      <Progress value={room.statistics?.utilizationPct || 0} className="w-16 h-2" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Labs
            </CardTitle>
            <CardDescription>{labs.length} labs available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {labs.map((room) => (
              <Link key={room.id} href={`/coordinator/rooms/${room.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-medium">{room.actualName || room.logicalName}</p>
                    <p className="text-sm text-muted-foreground">{room.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{room.statistics?.utilizationPct || 0}%</p>
                      <Progress value={room.statistics?.utilizationPct || 0} className="w-16 h-2" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DoorOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No rooms found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
