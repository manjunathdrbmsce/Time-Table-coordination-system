"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, Pencil, Trash2, Loader2, CheckCircle, Circle, BookOpen, Users, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";

interface AcademicSession {
  id: string;
  name: string;
  academicYear: string;
  semesterType: "ODD" | "EVEN";
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  _count: {
    sections: number;
    allocations: number;
    slotRequests: number;
    uploads: number;
  };
  createdAt: string;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AcademicSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    academicYear: "",
    semesterType: "ODD" as "ODD" | "EVEN",
    isActive: false,
    startDate: "",
    endDate: "",
  });

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/admin/sessions");
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch (error) {
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleOpenDialog = (session?: AcademicSession) => {
    if (session) {
      setSelectedSession(session);
      setFormData({
        name: session.name,
        academicYear: session.academicYear,
        semesterType: session.semesterType,
        isActive: session.isActive,
        startDate: session.startDate ? session.startDate.split("T")[0] : "",
        endDate: session.endDate ? session.endDate.split("T")[0] : "",
      });
    } else {
      setSelectedSession(null);
      // Generate default values
      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1) % 100;
      setFormData({
        name: "",
        academicYear: `${currentYear}-${nextYear.toString().padStart(2, '0')}`,
        semesterType: "ODD",
        isActive: false,
        startDate: "",
        endDate: "",
      });
    }
    setDialogOpen(true);
  };

  const generateSessionName = (year: string, type: "ODD" | "EVEN") => {
    return `${year} ${type === "ODD" ? "Odd" : "Even"} Semester`;
  };

  const handleSubmit = async () => {
    if (!formData.academicYear) {
      toast.error("Academic year is required");
      return;
    }

    const name = formData.name || generateSessionName(formData.academicYear, formData.semesterType);

    setIsSubmitting(true);
    try {
      const url = selectedSession
        ? `/api/admin/sessions/${selectedSession.id}`
        : "/api/admin/sessions";
      
      const res = await fetch(url, {
        method: selectedSession ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name,
        }),
      });

      if (res.ok) {
        toast.success(selectedSession ? "Session updated" : "Session created");
        setDialogOpen(false);
        fetchSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save session");
      }
    } catch (error) {
      toast.error("Failed to save session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (session: AcademicSession) => {
    if (session.isActive) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        toast.success(`Activated: ${session.name}`);
        fetchSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to activate session");
      }
    } catch (error) {
      toast.error("Failed to activate session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSession) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sessions/${selectedSession.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Session deleted");
        setDeleteDialogOpen(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete session");
      }
    } catch (error) {
      toast.error("Failed to delete session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSession = sessions.find(s => s.isActive);

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
          <h1 className="text-3xl font-bold tracking-tight">Academic Sessions</h1>
          <p className="text-muted-foreground">
            Manage academic years and semesters for organizing timetable data
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Session
        </Button>
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Session</p>
                <p className="font-semibold text-lg">{activeSession.name}</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold">{activeSession._count.sections}</p>
                <p className="text-muted-foreground">Sections</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{activeSession._count.allocations}</p>
                <p className="text-muted-foreground">Allocations</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{activeSession._count.uploads}</p>
                <p className="text-muted-foreground">Uploads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + s._count.sections, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + s._count.allocations, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + s._count.uploads, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            Click the circle icon to set a session as active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
              <p className="text-muted-foreground">
                Start by adding your first academic session
              </p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Session
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Active</TableHead>
                  <TableHead>Session Name</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Sections</TableHead>
                  <TableHead className="text-center">Allocations</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className={session.isActive ? "bg-green-50/50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => handleSetActive(session)}
                        disabled={session.isActive || isSubmitting}
                        title={session.isActive ? "Active session" : "Click to set as active"}
                      >
                        {session.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-green-600" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{session.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {session.academicYear}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={session.semesterType === "ODD" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                        {session.semesterType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{session._count.sections}</TableCell>
                    <TableCell className="text-center">{session._count.allocations}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {session.startDate && session.endDate ? (
                        <>
                          {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(session)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedSession(session);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={session.isActive}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSession ? "Edit Session" : "Add New Session"}
            </DialogTitle>
            <DialogDescription>
              {selectedSession
                ? "Update session information"
                : "Create a new academic session for organizing timetables"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  placeholder="e.g., 2025-26"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  disabled={!!selectedSession}
                />
                <p className="text-xs text-muted-foreground">Format: YYYY-YY</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semesterType">Semester Type *</Label>
                <Select
                  value={formData.semesterType}
                  onValueChange={(value: "ODD" | "EVEN") => setFormData({ ...formData, semesterType: value })}
                  disabled={!!selectedSession}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ODD">ODD (Sem 1, 3, 5, 7)</SelectItem>
                    <SelectItem value="EVEN">EVEN (Sem 2, 4, 6, 8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Session Name</Label>
              <Input
                id="name"
                placeholder={`e.g., ${generateSessionName(formData.academicYear || "2025-26", formData.semesterType)}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            {!selectedSession && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
                  Set as active session (will deactivate current active session)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedSession ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p><strong>Name:</strong> {selectedSession.name}</p>
              <p><strong>Year:</strong> {selectedSession.academicYear}</p>
              <p><strong>Type:</strong> {selectedSession.semesterType}</p>
              <div className="flex gap-4 text-sm mt-2">
                <span>Sections: {selectedSession._count.sections}</span>
                <span>Allocations: {selectedSession._count.allocations}</span>
                <span>Uploads: {selectedSession._count.uploads}</span>
              </div>
              {(selectedSession._count.sections > 0 || selectedSession._count.allocations > 0) && (
                <p className="text-destructive text-sm mt-2">
                  ⚠️ This session has data. Delete or reassign data first.
                </p>
              )}
              {selectedSession.isActive && (
                <p className="text-destructive text-sm">
                  ⚠️ Cannot delete the active session.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                isSubmitting ||
                selectedSession?.isActive ||
                (selectedSession?._count.sections ?? 0) > 0 ||
                (selectedSession?._count.allocations ?? 0) > 0
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
