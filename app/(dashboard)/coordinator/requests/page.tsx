"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Pencil,
  DoorOpen,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

interface SlotRequest {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  room: {
    id: string;
    code: string;
    logicalName: string;
    actualName?: string | null;
    type: string;
    capacity: number;
    department?: { code: string; name: string } | null;
    building?: { code: string; name: string } | null;
  };
  section: {
    year: number;
    division: string;
    department: { code: string; name: string };
  };
  approvals: Array<{
    id: string;
    decision: string;
    comment?: string;
    approver: { name: string; email: string };
  }>;
}

interface Room {
  id: string;
  logicalName: string;
  actualName?: string | null;
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
}

interface AvailableRoomsData {
  availableClassrooms: Room[];
  availableLabs: Room[];
}

export default function CoordinatorRequestsPage() {
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SlotRequest | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editRoomId, setEditRoomId] = useState("");
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomsData | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<SlotRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coordinator/slot-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        toast.error("Failed to fetch requests");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchAvailableRooms = async (day: string, startTime: string) => {
    setLoadingRooms(true);
    try {
      const res = await fetch(
        `/api/coordinator/available-rooms?day=${encodeURIComponent(day)}&startTime=${encodeURIComponent(startTime)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms({
          availableClassrooms: data.availableClassrooms,
          availableLabs: data.availableLabs,
        });
      }
    } catch (error) {
      console.error("Error fetching available rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const openEditDialog = async (request: SlotRequest) => {
    if (request.status !== "PENDING") {
      toast.error("Can only edit pending requests");
      return;
    }
    setEditingRequest(request);
    setEditReason(request.reason);
    setEditRoomId(request.room.id);
    setEditDialogOpen(true);
    await fetchAvailableRooms(request.day, request.startTime);
  };

  const handleEdit = async () => {
    if (!editingRequest) return;
    if (editReason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsEditing(true);
    try {
      const res = await fetch(`/api/coordinator/slot-requests/${editingRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: editRoomId !== editingRequest.room.id ? editRoomId : undefined,
          reason: editReason !== editingRequest.reason ? editReason : undefined,
        }),
      });

      if (res.ok) {
        toast.success("Request updated successfully");
        setEditDialogOpen(false);
        setEditingRequest(null);
        fetchRequests();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update request");
      }
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    } finally {
      setIsEditing(false);
    }
  };

  const openDeleteDialog = (request: SlotRequest) => {
    if (request.status !== "PENDING") {
      toast.error("Can only delete pending requests");
      return;
    }
    setDeletingRequest(request);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRequest) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/coordinator/slot-requests/${deletingRequest.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Request deleted successfully");
        setDeleteDialogOpen(false);
        setDeletingRequest(null);
        fetchRequests();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete request");
      }
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusConfig = {
    PENDING: { color: "secondary" as const, icon: Clock, label: "Pending" },
    APPROVED: { color: "default" as const, icon: CheckCircle, label: "Approved" },
    REJECTED: { color: "destructive" as const, icon: XCircle, label: "Rejected" },
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const processedRequests = requests.filter((r) => r.status !== "PENDING");

  const getAllAvailableRooms = () => {
    if (!availableRooms) return [];
    return [...availableRooms.availableClassrooms, ...availableRooms.availableLabs];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground">
            Manage your slot requests to other departments
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            History
            {processedRequests.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {processedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                These requests are awaiting approval. You can edit or delete them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                  <p className="text-sm mt-1">
                    Request rooms from free slots in section timetables
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onEdit={() => openEditDialog(request)}
                      onDelete={() => openDeleteDialog(request)}
                      showActions
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                Previously processed requests (approved or rejected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No processed requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processedRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Request
            </DialogTitle>
            <DialogDescription>
              {editingRequest && (
                <>
                  Modify your request for {editingRequest.day}, {editingRequest.startTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingRequest && (
            <div className="space-y-4">
              {/* Current Section Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  For: {editingRequest.section.department.code} Sem{" "}
                  {editingRequest.section.year} Sec {editingRequest.section.division}
                </p>
              </div>

              {/* Room Selection */}
              <div className="space-y-2">
                <Label>Select Room</Label>
                {loadingRooms ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="space-y-2">
                      {/* Current room first */}
                      <div
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          editRoomId === editingRequest.room.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setEditRoomId(editingRequest.room.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {editingRequest.room.actualName || editingRequest.room.logicalName}
                              <Badge variant="outline" className="ml-2 text-xs">
                                Current
                              </Badge>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {editingRequest.room.type} • {editingRequest.room.capacity} seats
                              {editingRequest.room.department && ` • ${editingRequest.room.department.code}`}
                            </p>
                          </div>
                          {editRoomId === editingRequest.room.id && (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      </div>

                      {/* Available rooms */}
                      {getAllAvailableRooms()
                        .filter((room) => room.id !== editingRequest.room.id)
                        .map((room) => (
                          <div
                            key={room.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              editRoomId === room.id
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => setEditRoomId(room.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{room.actualName || room.logicalName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {room.type} • {room.capacity} seats
                                  {room.department && ` • ${room.department.code}`}
                                  {room.building && ` • ${room.building.code}`}
                                </p>
                              </div>
                              {editRoomId === room.id && (
                                <CheckCircle className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}

                      {getAllAvailableRooms().filter(
                        (room) => room.id !== editingRequest.room.id
                      ).length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          No other rooms available for this slot
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
                {editRoomId !== editingRequest.room.id && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Changing room will reset approval status
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Why do you need this slot?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {editReason.length}/10 characters minimum
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isEditing}>
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingRequest && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{deletingRequest.room.actualName || deletingRequest.room.logicalName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {deletingRequest.day}, {deletingRequest.startTime}
              </div>
              <p className="text-sm">{deletingRequest.reason}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Request Card Component
function RequestCard({
  request,
  onEdit,
  onDelete,
  showActions = false,
}: {
  request: SlotRequest;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}) {
  const statusConfig = {
    PENDING: { color: "secondary" as const, icon: Clock, label: "Pending" },
    APPROVED: { color: "default" as const, icon: CheckCircle, label: "Approved" },
    REJECTED: { color: "destructive" as const, icon: XCircle, label: "Rejected" },
  };

  const status = statusConfig[request.status];
  const StatusIcon = status.icon;

  return (
    <div className="p-4 border rounded-lg space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">{request.room.actualName || request.room.logicalName}</p>
            <p className="text-sm text-muted-foreground">
              {request.room.code}
              {request.room.department && ` • ${request.room.department.code}`}
            </p>
          </div>
        </div>
        <Badge variant={status.color} className="gap-1">
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>
            {request.day}, {request.startTime}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>{request.room.capacity} seats</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span>
            {request.section.department.code} {request.section.year}
            {request.section.division}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {request.room.type}
          </Badge>
        </div>
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Reason:</span> {request.reason}
        </p>
      </div>

      {/* Approval status for processed requests */}
      {request.status !== "PENDING" && request.approvals.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Approvals:</p>
          {request.approvals.map((approval) => (
            <div
              key={approval.id}
              className="flex items-center justify-between text-sm"
            >
              <span>{approval.approver.name}</span>
              <Badge
                variant={
                  approval.decision === "APPROVED" ? "default" : "destructive"
                }
                className="text-xs"
              >
                {approval.decision}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
