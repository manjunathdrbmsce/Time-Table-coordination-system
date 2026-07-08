"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  DoorOpen,
  FlaskConical,
  Building2,
  Users,
  Check,
  Clock,
  AlertCircle,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

interface Room {
  id: string;
  logicalName: string;
  actualName?: string;
  code: string;
  type: string;
  capacity: number;
  department?: {
    id: string;
    code: string;
    name: string;
  } | null;
  building?: {
    id: string;
    name: string;
    code: string;
  } | null;
  statistics?: {
    utilizationPct: number;
    occupiedSlots: number;
    totalSlots: number;
  } | null;
}

interface OccupiedRoom {
  room: Room;
  occupiedBy: string;
  subject: string;
}

interface AvailableRoomsData {
  day: string;
  startTime: string;
  availableClassrooms: Room[];
  availableLabs: Room[];
  occupiedRooms: OccupiedRoom[];
  pendingRooms: Room[];
  summary: {
    totalRooms: number;
    availableClassrooms: number;
    availableLabs: number;
    occupied: number;
    pending: number;
  };
}

interface FreeSlotRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: string;
  startTime: string;
  sectionId: string;
  sectionLabel: string;
  onRequestCreated?: () => void;
}

export function FreeSlotRequestDialog({
  open,
  onOpenChange,
  day,
  startTime,
  sectionId,
  sectionLabel,
  onRequestCreated,
}: FreeSlotRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<AvailableRoomsData | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState("classrooms");

  // Fetch available rooms when dialog opens
  useEffect(() => {
    if (open && day && startTime) {
      fetchAvailableRooms();
    } else {
      // Reset state when dialog closes
      setData(null);
      setSelectedRoom(null);
      setReason("");
      setActiveTab("classrooms");
    }
  }, [open, day, startTime]);

  const fetchAvailableRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/coordinator/available-rooms?day=${encodeURIComponent(day)}&startTime=${encodeURIComponent(startTime)}`
      );
      if (res.ok) {
        const result = await res.json();
        setData(result);
        // Auto-select tab based on available rooms
        if (result.availableLabs.length > 0 && result.availableClassrooms.length === 0) {
          setActiveTab("labs");
        }
      } else {
        toast.error("Failed to fetch available rooms");
      }
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      toast.error("Failed to fetch available rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedRoom) {
      toast.error("Please select a room");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/slot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          sectionId: sectionId,
          day: day,
          startTime: startTime,
          endTime: startTime, // Same as startTime for single slot
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Room request submitted successfully!");
        onOpenChange(false);
        onRequestCreated?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const RoomCard = ({ room, isSelected, onClick }: { room: Room; isSelected: boolean; onClick: () => void }) => (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "ring-2 ring-primary bg-primary/5"
          : "hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {room.type === "LAB" ? (
                <FlaskConical className="h-4 w-4 text-blue-500" />
              ) : (
                <DoorOpen className="h-4 w-4 text-green-500" />
              )}
              <span className="font-semibold">{room.actualName || room.logicalName}</span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </div>
            {room.actualName && (
              <p className="text-xs text-muted-foreground">{room.actualName}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {room.capacity} seats
              </span>
              {room.building && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {room.building.code}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={room.type === "LAB" ? "default" : "secondary"} className="text-xs">
              {room.type}
            </Badge>
            {room.department ? (
              <Badge variant="outline" className="text-xs">
                {room.department.code}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-purple-50">
                Shared
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Request Room for Free Slot
          </DialogTitle>
          <DialogDescription>
            Select an available room for {day}, {startTime} ({sectionLabel})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-green-50 rounded-lg text-center">
                <div className="text-lg font-bold text-green-600">
                  {data.summary.availableClassrooms}
                </div>
                <div className="text-xs text-green-600">Classrooms</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-600">
                  {data.summary.availableLabs}
                </div>
                <div className="text-xs text-blue-600">Labs</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-600">
                  {data.summary.occupied}
                </div>
                <div className="text-xs text-gray-600">Occupied</div>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg text-center">
                <div className="text-lg font-bold text-orange-600">
                  {data.summary.pending}
                </div>
                <div className="text-xs text-orange-600">Pending</div>
              </div>
            </div>

            {/* Tabs for room types */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="classrooms" className="gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Classrooms ({data.availableClassrooms.length})
                </TabsTrigger>
                <TabsTrigger value="labs" className="gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Labs ({data.availableLabs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="classrooms" className="mt-3">
                <ScrollArea className="h-[200px] pr-4">
                  {data.availableClassrooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No classrooms available for this slot</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.availableClassrooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          isSelected={selectedRoom?.id === room.id}
                          onClick={() => setSelectedRoom(room)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="labs" className="mt-3">
                <ScrollArea className="h-[200px] pr-4">
                  {data.availableLabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>No labs available for this slot</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.availableLabs.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          isSelected={selectedRoom?.id === room.id}
                          onClick={() => setSelectedRoom(room)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Selected Room Display */}
            {selectedRoom && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium">Selected:</span>
                  <span>{selectedRoom.actualName || selectedRoom.logicalName}</span>
                  <Badge variant="outline">{selectedRoom.type}</Badge>
                  <span className="text-muted-foreground">({selectedRoom.capacity} seats)</span>
                </div>
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request *</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for requesting this room (e.g., Extra tutorial session, Lab practice, Guest lecture...)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Failed to load available rooms</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchAvailableRooms}>
              Try Again
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={!selectedRoom || reason.trim().length < 10 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
