"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DoorOpen, Plus, Loader2, Search, ChevronRight, Calendar, Filter, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Room {
  id: string;
  code: string;
  logicalName: string;
  actualName: string | null;
  type: string;
  capacity: number;
  department: { id: string; code: string; name: string } | null;
  building: { id: string; code: string; name: string } | null;
  statistics: {
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
  } | null;
  _count?: {
    allocations: number;
  };
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Building {
  id: string;
  code: string;
  name: string;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterBuilding, setFilterBuilding] = useState<string>("ALL");
  
  const [formData, setFormData] = useState({
    code: "",
    logicalName: "",
    actualName: "",
    type: "CLASSROOM",
    capacity: 60,
    departmentId: "",
    buildingId: "",
  });

  // Edit and Delete state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editFormData, setEditFormData] = useState({
    actualName: "",
    departmentId: "",
    buildingId: "",
  });

  useEffect(() => {
    fetchRooms();
    fetchDepartments();
    fetchBuildings();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/admin/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      toast.error("Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/admin/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await fetch("/api/admin/buildings");
      if (res.ok) {
        const data = await res.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error("Failed to fetch buildings");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(String(formData.capacity)),
          departmentId: formData.departmentId || null,
          buildingId: formData.buildingId || null,
        }),
      });

      if (res.ok) {
        toast.success("Room created successfully");
        setIsDialogOpen(false);
        setFormData({ code: "", logicalName: "", actualName: "", type: "CLASSROOM", capacity: 60, departmentId: "", buildingId: "" });
        fetchRooms();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create room");
      }
    } catch (error) {
      toast.error("Failed to create room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRoom(room);
    setEditFormData({
      actualName: room.actualName || "",
      departmentId: room.department?.id || "",
      buildingId: room.building?.id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/rooms/${selectedRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualName: editFormData.actualName || null,
          departmentId: editFormData.departmentId || null,
          buildingId: editFormData.buildingId || null,
        }),
      });

      if (res.ok) {
        toast.success("Room updated successfully");
        setIsEditDialogOpen(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update room");
      }
    } catch (error) {
      toast.error("Failed to update room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, room: Room) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRoom(room);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRoom) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/rooms/${selectedRoom.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Room deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        const error = await res.json();
        toast.error(error.message || error.error || "Failed to delete room");
      }
    } catch (error) {
      toast.error("Failed to delete room");
    } finally {
      setIsSubmitting(false);
    }
  };

  const classrooms = rooms.filter(r => r.type === "CLASSROOM");
  const labs = rooms.filter(r => r.type === "LAB");
  const avgUtilization = rooms.length > 0
    ? Math.round(rooms.reduce((sum, r) => sum + (r.statistics?.utilizationPct || 0), 0) / rooms.length)
    : 0;

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          room.logicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (room.actualName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "ALL" || room.type === filterType;
    const matchesDept = filterDept === "ALL" || 
                        (filterDept === "SHARED" && !room.department) ||
                        room.department?.id === filterDept;
    const matchesBuilding = filterBuilding === "ALL" || room.building?.id === filterBuilding;
    return matchesSearch && matchesType && matchesDept && matchesBuilding;
  });

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Timetables</h1>
          <p className="text-muted-foreground">View and manage all room schedules with timetables</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>Create a new classroom or lab</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Room Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="CR1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="CLASSROOM">Classroom</option>
                      <option value="LAB">Lab</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logicalName">Logical Name</Label>
                  <Input
                    id="logicalName"
                    value={formData.logicalName}
                    onChange={(e) => setFormData({ ...formData, logicalName: e.target.value })}
                    placeholder="CR 1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actualName">Actual Name / Location</Label>
                  <Input
                    id="actualName"
                    value={formData.actualName}
                    onChange={(e) => setFormData({ ...formData, actualName: e.target.value })}
                    placeholder="C-406"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department (Optional)</Label>
                    <select
                      id="department"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    >
                      <option value="">Shared / No Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <select
                    id="building"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  >
                    <option value="">Select Building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.code} - {building.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Room
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="text-2xl font-bold text-green-600">{classrooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{labs.length}</div>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="CLASSROOM">Classrooms Only</option>
              <option value="LAB">Labs Only</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              <option value="SHARED">Shared Rooms</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
              ))}
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
            >
              <option value="ALL">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>{building.code} - {building.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Room Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRooms.map((room) => (
          <Link key={room.id} href={`/admin/rooms/${room.id}`}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{room.actualName || room.logicalName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleEditClick(e, room)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                        (room._count?.allocations || 0) > 0 
                          ? "text-muted-foreground cursor-not-allowed" 
                          : "text-destructive hover:text-destructive"
                      }`}
                      onClick={(e) => handleDeleteClick(e, room)}
                      disabled={(room._count?.allocations || 0) > 0}
                      title={(room._count?.allocations || 0) > 0 ? "Cannot delete room with allocations" : "Delete room"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Badge variant={room.type === "LAB" ? "default" : "secondary"} className="flex items-center gap-1">
                      {room.type === "LAB" ? "🔬 Lab" : "📚 Class"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {room.code} - {room.logicalName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{room.capacity} seats</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{room.department?.code || "Shared"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Building</span>
                    <span className="font-medium">{room.building?.code || "-"}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="font-medium">{room.statistics?.utilizationPct || 0}%</span>
                    </div>
                    <Progress value={room.statistics?.utilizationPct || 0} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{room.statistics?.occupiedSlots || 0} occupied / {room.statistics?.freeSlots || 0} free</span>
                    <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform font-medium">
                      <Calendar className="w-3 h-3" />
                      View Timetable
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DoorOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {rooms.length === 0 ? "No rooms found" : "No rooms match your filters"}
            </p>
            {rooms.length === 0 && (
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Room
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Color Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Timetable Color Legend</CardTitle>
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
              <div className="w-5 h-5 rounded bg-gray-100 border border-dashed border-gray-400" />
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

      {/* Edit Room Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update room details for {selectedRoom?.code} - {selectedRoom?.logicalName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-actualName">Actual Name / Location</Label>
                <Input
                  id="edit-actualName"
                  value={editFormData.actualName}
                  onChange={(e) => setEditFormData({ ...editFormData, actualName: e.target.value })}
                  placeholder="e.g., C-406"
                />
                <p className="text-xs text-muted-foreground">This is the physical room name/number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <select
                  id="edit-department"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editFormData.departmentId}
                  onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                >
                  <option value="">Shared / No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-building">Building</Label>
                <select
                  id="edit-building"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editFormData.buildingId}
                  onChange={(e) => setEditFormData({ ...editFormData, buildingId: e.target.value })}
                >
                  <option value="">Select Building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.code} - {building.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Room Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the room &quot;{selectedRoom?.actualName || selectedRoom?.logicalName}&quot; ({selectedRoom?.code})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
