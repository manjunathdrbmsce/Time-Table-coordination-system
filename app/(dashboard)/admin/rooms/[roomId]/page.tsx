"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Loader2, DoorOpen, Users, Building2, Calendar, Clock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface RoomDetails {
  id: string;
  code: string;
  logicalName: string;
  actualName: string | null;
  type: string;
  capacity: number;
  department: { id: string; code: string; name: string } | null;
  statistics: {
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
  } | null;
  allocations: Allocation[];
}

interface Allocation {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string;
  type: "THEORY" | "LAB";
  isModified?: boolean;
  isPending?: boolean;
  section: {
    id: string;
    year: number;
    division: string;
    department: { code: string; name: string };
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8"
];

export default function AdminRoomTimetablePage({ 
  params 
}: { 
  params: Promise<{ roomId: string }> 
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoom = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      } else {
        toast.error("Failed to fetch room details");
        router.push("/admin/rooms");
      }
    } catch (error) {
      toast.error("Failed to fetch room details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchRoom(true), 30000);
    return () => clearInterval(interval);
  }, [roomId]);

  const getAllocationForSlot = (day: string, startTime: string): Allocation | null => {
    if (!room) return null;
    return room.allocations.find(
      (a) => a.day === day && a.startTime === startTime
    ) || null;
  };

  const getRoomDisplayName = (roomData: RoomDetails) => {
    return roomData.actualName || roomData.logicalName || roomData.code;
  };

  const getCellStyles = (allocation: Allocation | null) => {
    if (!allocation) {
      // White/Gray for Free slot
      return "bg-gray-50 border border-dashed border-gray-300 hover:bg-gray-100 transition-colors";
    }
    
    if (allocation.isPending) {
      // Orange for Pending approval
      return "bg-orange-100 border-l-4 border-orange-500 text-orange-900";
    }
    
    if (allocation.isModified) {
      // Yellow for Modified slot
      return "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900";
    }
    
    if (allocation.type === "LAB") {
      // Blue for Lab
      return "bg-blue-100 border-l-4 border-blue-600 text-blue-900";
    }
    
    // Green for Theory
    return "bg-green-100 border-l-4 border-green-600 text-green-900";
  };

  const getTimeLabel = (slot: { start: string; end: string }) => {
    return `${slot.start} - ${slot.end}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <DoorOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Room not found</p>
        <Button className="mt-4" onClick={() => router.push("/admin/rooms")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rooms
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin/rooms")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{getRoomDisplayName(room)}</h1>
                <Badge variant={room.type === "LAB" ? "default" : "secondary"} className="text-sm">
                  {room.type === "LAB" ? "🔬 Lab" : "📚 Classroom"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {room.code} • {room.logicalName}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchRoom(true)} 
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{room.capacity}</div>
              <p className="text-xs text-muted-foreground">seats</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{room.department?.code || "Shared"}</div>
              <p className="text-xs text-muted-foreground">{room.department?.name || "All departments"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Slots Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {room.statistics?.occupiedSlots || 0}
                <span className="text-sm font-normal text-muted-foreground">
                  /{room.statistics?.totalSlots || 48}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{room.statistics?.freeSlots || 48} available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{room.statistics?.utilizationPct || 0}%</div>
              <Progress value={room.statistics?.utilizationPct || 0} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-l-4 border-green-600 rounded"></div>
            <span>Theory Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-600 rounded"></div>
            <span>Lab Session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-dashed border-gray-300 rounded"></div>
            <span>Free Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500 rounded"></div>
            <span>Modified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-l-4 border-orange-500 rounded"></div>
            <span>Pending</span>
          </div>
        </div>

        {/* Timetable Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Timetable
            </CardTitle>
            <CardDescription>
              Complete schedule for {getRoomDisplayName(room)} ({room.code})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground border-b bg-muted/50 sticky left-0 z-10">
                      Day / Slot
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th key={slot} className="p-3 text-center text-sm font-medium text-muted-foreground border-b bg-muted/50 min-w-[120px]">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day} className="border-b last:border-b-0">
                      <td className="p-3 font-medium text-sm bg-muted/30 sticky left-0 z-10">
                        {day}
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const allocation = getAllocationForSlot(day, slot);
                        return (
                          <td key={`${day}-${slot}`} className="p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`p-2 rounded-md min-h-[80px] ${getCellStyles(allocation)}`}>
                                  {allocation ? (
                                    <div className="space-y-1">
                                      {allocation.isModified && (
                                        <div className="text-[10px] font-medium text-yellow-700">📋 Requested</div>
                                      )}
                                      <div className="font-semibold text-sm truncate">
                                        {allocation.subject}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {allocation.faculty}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs py-0">
                                          {allocation.section.department.code} Sem {allocation.section.year} - Sec {allocation.section.division}
                                        </Badge>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                      Free
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {allocation ? (
                                  <div className="space-y-1">
                                    <p className="font-semibold">{allocation.subject}</p>
                                    <p className="text-sm">Faculty: {allocation.faculty}</p>
                                    <p className="text-sm">Section: {allocation.section.department.code} Sem {allocation.section.year} - Section {allocation.section.division}</p>
                                    <p className="text-sm">Type: {allocation.type}</p>
                                    <p className="text-sm">Slot: {allocation.startTime}</p>
                                    {allocation.isModified && (
                                      <Badge className="bg-yellow-500 text-xs">Modified</Badge>
                                    )}
                                    {allocation.isPending && (
                                      <Badge className="bg-orange-500 text-xs">Pending Approval</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <p>Free slot - Available for booking</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Color Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Color Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-100 border-l-4 border-green-500" />
                <span>Theory Class</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-100 border-l-4 border-blue-500" />
                <span>Lab Session</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gray-50 border border-dashed border-gray-300" />
                <span>Free Slot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-yellow-100 border-l-4 border-yellow-500" />
                <span>Modified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-orange-100 border-l-4 border-orange-500" />
                <span>Pending Approval</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
