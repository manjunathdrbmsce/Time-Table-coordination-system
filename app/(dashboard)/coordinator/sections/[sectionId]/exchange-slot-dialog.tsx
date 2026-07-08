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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeftRight,
  DoorOpen,
  FlaskConical,
  Building2,
  Users,
  Check,
  AlertTriangle,
  AlertCircle,
  Clock,
  GraduationCap,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

interface AllocationInfo {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string;
  type: "THEORY" | "LAB";
  room: {
    id: string;
    code: string;
    logicalName: string;
    actualName: string | null;
    type: string;
    capacity: number;
    department?: { id: string; code: string; name: string } | null;
    building?: { id: string; name: string; code: string } | null;
  };
  section: {
    id: string;
    year: number;
    division: string;
    department: { id: string; code: string; name: string };
  };
}

interface OccupiedRoomsData {
  day: string;
  startTime: string;
  availableForExchange: AllocationInfo[];
  pendingExchange: AllocationInfo[];
  summary: {
    total: number;
    available: number;
    pending: number;
  };
}

interface ExchangeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAllocation: {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    faculty: string;
    type: "THEORY" | "LAB";
    room?: string;
  };
  sectionId: string;
  sectionLabel: string;
  onExchangeCreated?: () => void;
}

export function ExchangeSlotDialog({
  open,
  onOpenChange,
  sourceAllocation,
  sectionId,
  sectionLabel,
  onExchangeCreated,
}: ExchangeSlotDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OccupiedRoomsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<AllocationInfo | null>(null);
  const [reason, setReason] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");

  // Fetch occupied rooms when dialog opens
  useEffect(() => {
    if (open && sourceAllocation.day && sourceAllocation.startTime) {
      fetchOccupiedRooms();
    } else {
      // Reset state when dialog closes
      setData(null);
      setError(null);
      setSelectedTarget(null);
      setReason("");
      setDepartmentFilter("all");
      setRoomTypeFilter("all");
    }
  }, [open, sourceAllocation.day, sourceAllocation.startTime]);

  const fetchOccupiedRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        day: sourceAllocation.day,
        startTime: sourceAllocation.startTime,
        excludeAllocationId: sourceAllocation.id,
      });
      const res = await fetch(`/api/coordinator/occupied-rooms?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to fetch available rooms");
        toast.error("Failed to fetch available rooms for exchange");
      }
    } catch (error) {
      console.error("Error fetching occupied rooms:", error);
      setError("Failed to connect to server");
      toast.error("Failed to fetch available rooms for exchange");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitExchange = async () => {
    if (!selectedTarget) {
      toast.error("Please select a room to exchange with");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/exchange-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAllocationId: sourceAllocation.id,
          targetAllocationId: selectedTarget.id,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Exchange request submitted successfully!");
        onOpenChange(false);
        onExchangeCreated?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit exchange request");
      }
    } catch (error) {
      console.error("Error submitting exchange request:", error);
      toast.error("Failed to submit exchange request");
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique departments for filter
  const departments = data
    ? Array.from(
        new Map(
          [...data.availableForExchange, ...data.pendingExchange]
            .map((a) => a.section.department)
            .filter((d) => d)
            .map((d) => [d.id, d])
        ).values()
      )
    : [];

  // Filter allocations based on selected filters
  const filterAllocations = (allocations: AllocationInfo[]) => {
    return allocations.filter((allocation) => {
      const matchesDept =
        departmentFilter === "all" ||
        allocation.section.department.id === departmentFilter;
      const matchesType =
        roomTypeFilter === "all" ||
        (roomTypeFilter === "CLASSROOM" && allocation.room.type === "CLASSROOM") ||
        (roomTypeFilter === "LAB" && allocation.room.type === "LAB");
      return matchesDept && matchesType;
    });
  };

  const filteredAvailable = data ? filterAllocations(data.availableForExchange) : [];
  const filteredPending = data ? filterAllocations(data.pendingExchange) : [];

  const AllocationCard = ({
    allocation,
    isSelected,
    onClick,
    isPending = false,
  }: {
    allocation: AllocationInfo;
    isSelected: boolean;
    onClick?: () => void;
    isPending?: boolean;
  }) => (
    <Card
      className={`transition-all ${
        isPending
          ? "opacity-60 cursor-not-allowed border-yellow-300 bg-yellow-50"
          : isSelected
          ? "ring-2 ring-primary bg-primary/5 cursor-pointer"
          : "hover:border-primary/50 hover:shadow-md cursor-pointer"
      }`}
      onClick={isPending ? undefined : onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Room Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {allocation.room.type === "LAB" ? (
                <FlaskConical className="h-5 w-5 text-blue-500" />
              ) : (
                <DoorOpen className="h-5 w-5 text-green-500" />
              )}
              <div>
                <span className="font-semibold">
                  {allocation.room.actualName || allocation.room.logicalName}
                </span>
                <p className="text-xs text-muted-foreground">{allocation.room.code}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isPending ? (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              ) : isSelected ? (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Selected
                </Badge>
              ) : (
                <Badge variant={allocation.room.type === "LAB" ? "default" : "secondary"}>
                  {allocation.room.type}
                </Badge>
              )}
            </div>
          </div>

          {/* Section & Subject Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>
                {allocation.section.department.code} {allocation.section.year}
                {allocation.section.division}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{allocation.room.capacity} seats</span>
            </div>
          </div>

          {/* Subject & Faculty */}
          <div className="pt-2 border-t text-sm">
            <p>
              <span className="font-medium">Subject:</span> {allocation.subject}
            </p>
            <p>
              <span className="font-medium">Faculty:</span> {allocation.faculty || "-"}
            </p>
          </div>

          {/* Building Info */}
          {allocation.room.building && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {allocation.room.building.name}
            </div>
          )}

          {isPending && (
            <p className="text-xs text-yellow-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Has pending exchange request
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Exchange Slot with Another Department
          </DialogTitle>
          <DialogDescription>
            Exchange your room ({sourceAllocation.room}) on {sourceAllocation.day},{" "}
            {sourceAllocation.startTime} with another department
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Your Current Slot */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <DoorOpen className="h-4 w-4" />
              Your Current Slot ({sectionLabel})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Room:</span>{" "}
                <span className="font-medium">{sourceAllocation.room}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Day:</span>{" "}
                <span className="font-medium">{sourceAllocation.day}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>{" "}
                <span className="font-medium">{sourceAllocation.startTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subject:</span>{" "}
                <span className="font-medium">{sourceAllocation.subject}</span>
              </div>
            </div>
          </div>

          {/* Available Rooms for Exchange */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Select a room from another department to exchange with
              </Label>
            </div>

            {/* Filters */}
            {data && data.summary.total > 0 && (
              <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filter by:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dept-filter" className="text-sm whitespace-nowrap">
                    Department:
                  </Label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger id="dept-filter" className="w-[160px] h-8">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="type-filter" className="text-sm whitespace-nowrap">
                    Room Type:
                  </Label>
                  <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                    <SelectTrigger id="type-filter" className="w-[130px] h-8">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="CLASSROOM">Classroom</SelectItem>
                      <SelectItem value="LAB">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg">
                <AlertCircle className="w-12 h-12 mb-4 text-red-500 opacity-70" />
                <p className="text-sm text-red-500">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOccupiedRooms}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : data ? (
              <ScrollArea className="h-64 border rounded-lg p-3">
                {data.summary.total === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No other departments have allocations for this slot</p>
                  </div>
                ) : filteredAvailable.length === 0 && filteredPending.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No rooms match the selected filters</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setDepartmentFilter("all");
                        setRoomTypeFilter("all");
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Available for exchange */}
                    {filteredAvailable.map((allocation) => (
                      <AllocationCard
                        key={allocation.id}
                        allocation={allocation}
                        isSelected={selectedTarget?.id === allocation.id}
                        onClick={() => setSelectedTarget(allocation)}
                      />
                    ))}

                    {/* Pending exchange (disabled) */}
                    {filteredPending.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs text-muted-foreground">
                            Unavailable (Pending Exchange)
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        {filteredPending.map((allocation) => (
                          <AllocationCard
                            key={allocation.id}
                            allocation={allocation}
                            isSelected={false}
                            isPending
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </ScrollArea>
            ) : null}

            {data && data.summary.total > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredAvailable.length} available
                {filteredPending.length > 0 && `, ${filteredPending.length} pending`}
                {(departmentFilter !== "all" || roomTypeFilter !== "all") && 
                  ` (filtered from ${data.summary.total} total)`}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Exchange</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this exchange..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/10 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitExchange}
            disabled={submitting || !selectedTarget || reason.length < 10}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Request Exchange
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
