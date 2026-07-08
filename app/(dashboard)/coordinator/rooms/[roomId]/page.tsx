"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, DoorOpen, Clock, Users, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";

interface Room {
  id: string;
  code: string;
  logicalName: string;
  actualName: string | null;
  type: string;
  capacity: number;
  departmentId: string | null;
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
  section: {
    id: string;
    year: number;
    division: string;
    department: { code: string; name: string };
  };
}

interface Section {
  id: string;
  year: number;
  division: string;
  department: { code: string };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = ["Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6", "Slot 7", "Slot 8"];

export default function CoordinatorRoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    sectionId: "",
    reason: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, sectionsRes] = await Promise.all([
          fetch(`/api/rooms/${roomId}`),
          fetch("/api/coordinator/sections"),
        ]);

        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setRoom(roomData);
        } else {
          toast.error("Failed to fetch room");
          router.push("/coordinator/rooms");
        }

        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData);
        } else {
          console.error("Failed to fetch sections:", await sectionsRes.text());
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId, router]);

  const getAllocationForSlot = (day: string, time: string): Allocation | null => {
    if (!room) return null;
    return room.allocations.find((a) => a.day === day && a.startTime === time) || null;
  };

  const handleSlotClick = (day: string, time: string) => {
    const allocation = getAllocationForSlot(day, time);
    if (!allocation) {
      setSelectedSlot({ day, time });
      setRequestForm({ sectionId: "", reason: "" });
      setRequestDialogOpen(true);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedSlot || !requestForm.sectionId || !requestForm.reason) {
      toast.error("Please fill all fields");
      return;
    }

    if (requestForm.reason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/slot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room?.id,
          sectionId: requestForm.sectionId,
          day: selectedSlot.day,
          startTime: selectedSlot.time,
          endTime: selectedSlot.time,
          reason: requestForm.reason,
        }),
      });

      if (res.ok) {
        toast.success("Slot request submitted!");
        setRequestDialogOpen(false);
        // Refresh room data
        const roomRes = await fetch(`/api/rooms/${roomId}`);
        if (roomRes.ok) {
          setRoom(await roomRes.json());
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit request");
      }
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const getCellStyles = (allocation: Allocation | null) => {
    if (!allocation) {
      return "bg-white border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer";
    }
    
    // Yellow for Modified/Requested allocations
    if (allocation.isModified) {
      return "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900";
    }
    
    if (allocation.type === "LAB") {
      // Blue for Lab
      return "bg-blue-100 border-l-4 border-blue-600 text-blue-900";
    }
    // Green for Theory
    return "bg-green-100 border-l-4 border-green-600 text-green-900";
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
        <p className="text-muted-foreground">Room not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/coordinator/rooms">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {room.actualName || room.logicalName} ({room.code})
          </h1>
          <Badge variant={room.type === "LAB" ? "default" : "secondary"}>{room.type}</Badge>
        </div>
        <p className="text-muted-foreground">
          Capacity: {room.capacity} • Click on free slots to request
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{room.statistics?.utilizationPct || 0}%</div>
            <Progress value={room.statistics?.utilizationPct || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {room.statistics?.occupiedSlots || 0}/{room.statistics?.totalSlots || 48}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {room.statistics?.freeSlots || 48}
            </div>
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
          <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-500 rounded"></div>
          <span>Requested/Approved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-dashed border-gray-300 rounded"></div>
          <span>Free (Click to request)</span>
        </div>
      </div>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Click on free slots to request them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left text-sm font-semibold border-b border-r min-w-[100px]">
                    Day / Slot
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th key={slot} className="p-3 text-center text-sm font-semibold border-b min-w-[100px]">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="hover:bg-muted/30">
                    <td className="p-3 text-sm font-medium border-b border-r bg-card">{day}</td>
                    {TIME_SLOTS.map((slot) => {
                      const allocation = getAllocationForSlot(day, slot);
                      return (
                        <td key={slot} className="p-1 border-b">
                          <div
                            onClick={() => handleSlotClick(day, slot)}
                            className={`rounded-md p-2 min-h-[70px] transition-all ${getCellStyles(allocation)}`}
                          >
                            {allocation ? (
                              <div className="flex flex-col gap-1">
                                {allocation.isModified && (
                                  <span className="text-[10px] font-medium text-yellow-700">📋 Requested</span>
                                )}
                                <span className="text-xs font-semibold">{allocation.subject}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {allocation.section.department.code}-{allocation.section.year}
                                  {allocation.section.division}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {allocation.faculty}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <span className="text-xs text-muted-foreground">Click to request</span>
                              </div>
                            )}
                          </div>
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

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Slot</DialogTitle>
            <DialogDescription>
              Request {selectedSlot?.day} - {selectedSlot?.time} in {room.actualName || room.code}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              {sections.length === 0 ? (
                <p className="text-sm text-red-500">
                  No sections available. Your department may not have any sections assigned.
                </p>
              ) : (
                <Select
                  value={requestForm.sectionId}
                  onValueChange={(value) => setRequestForm({ ...requestForm, sectionId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.department.code} Sem {section.year} - Sec {section.division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you need this slot (min 10 characters)"
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
