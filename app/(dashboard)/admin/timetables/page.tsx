"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Building2, Loader2, Search, ChevronRight, Calendar, Users, 
  DoorOpen, GraduationCap, BookOpen, FlaskConical, RefreshCw,
  BarChart3, Trash2, AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

interface Department {
  id: string;
  code: string;
  name: string;
  statistics: {
    totalSections: number;
    totalRooms: number;
    totalAllocations: number;
    utilizationPct: number;
  } | null;
  sections: Section[];
  rooms: Room[];
  _count?: {
    sections: number;
    rooms: number;
    users: number;
  };
}

interface Section {
  id: string;
  year: number;
  division: string;
  requiredTheoryHours: number;
  requiredLabHours: number;
  _count?: { allocations: number };
}

interface Room {
  id: string;
  code: string;
  logicalName: string;
  type: string;
  statistics: {
    utilizationPct: number;
    occupiedSlots: number;
    freeSlots: number;
  } | null;
}

export default function AdminTimetablesPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timetableStats, setTimetableStats] = useState<{
    allocations: number;
    rooms: number;
    sections: number;
    uploads: number;
    slotRequests: number;
  } | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  const fetchDepartments = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/departments?include=stats");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        if (data.length > 0 && !selectedDept) {
          setSelectedDept(data[0].id);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTimetableStats = async () => {
    try {
      const res = await fetch("/api/admin/timetables");
      if (res.ok) {
        const data = await res.json();
        setTimetableStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch timetable stats");
    }
  };

  const handleDeleteAllTimetables = async (deleteType: "allocations" | "all") => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/timetables?type=${deleteType}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Deleted ${data.deleted.allocations} allocations successfully`);
        setDeleteDialogOpen(false);
        fetchDepartments(true);
        fetchTimetableStats();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to delete timetables");
      }
    } catch (error) {
      toast.error("Failed to delete timetables");
    } finally {
      setDeleting(false);
    }
  };

  const handleRecalculateStats = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/recalculate-stats", {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchDepartments(true);
        fetchTimetableStats();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to recalculate statistics");
      }
    } catch (error) {
      toast.error("Failed to recalculate statistics");
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchTimetableStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchDepartments(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredDepartments = departments.filter(dept =>
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDepartment = departments.find(d => d.id === selectedDept);

  // Calculate overall stats
  const totalSections = departments.reduce((sum, d) => sum + (d._count?.sections || 0), 0);
  const totalRooms = departments.reduce((sum, d) => sum + (d._count?.rooms || 0), 0);
  const totalUsers = departments.reduce((sum, d) => sum + (d._count?.users || 0), 0);
  const avgUtilization = departments.length > 0
    ? Math.round(departments.reduce((sum, d) => sum + (d.statistics?.utilizationPct || 0), 0) / departments.length)
    : 0;

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
          <h1 className="text-3xl font-bold tracking-tight">Department Timetables</h1>
          <p className="text-muted-foreground">Complete overview of all department schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRecalculateStats}
            disabled={recalculating}
          >
            {recalculating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Recalculate Stats
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" onClick={() => fetchTimetableStats()}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Delete All Timetable Data
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete timetable data from the database.
                </DialogDescription>
              </DialogHeader>
              
              {timetableStats && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Current Data Summary:</p>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>{timetableStats.allocations}</strong> allocations</li>
                    <li>• <strong>{timetableStats.sections}</strong> sections</li>
                    <li>• <strong>{timetableStats.rooms}</strong> rooms</li>
                    <li>• <strong>{timetableStats.uploads}</strong> upload records</li>
                    <li>• <strong>{timetableStats.slotRequests}</strong> slot requests</li>
                  </ul>
                </div>
              )}

              <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteAllTimetables("allocations")}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Allocations Only
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteAllTimetables("all")}
                  disabled={deleting}
                  className="bg-red-700 hover:bg-red-800"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            onClick={() => fetchDepartments(true)} 
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalSections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DoorOpen className="w-4 h-4" />
              Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalRooms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <Progress value={avgUtilization} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Department Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Department List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Departments</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedDept === dept.id
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedDept(dept.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{dept.code}</div>
                      <div className="text-sm text-muted-foreground truncate">{dept.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{dept.statistics?.utilizationPct || 0}%</div>
                      <Progress 
                        value={dept.statistics?.utilizationPct || 0} 
                        className="w-16 h-1.5 mt-1" 
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {dept._count?.sections || 0} sections
                    </span>
                    <span className="flex items-center gap-1">
                      <DoorOpen className="w-3 h-3" />
                      {dept._count?.rooms || 0} rooms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Details */}
        <Card className="lg:col-span-2">
          {selectedDepartment ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedDepartment.code}</CardTitle>
                    <CardDescription>{selectedDepartment.name}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {selectedDepartment.statistics?.utilizationPct || 0}% Utilized
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="sections">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sections" className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Sections ({selectedDepartment.sections?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="rooms" className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4" />
                      Rooms ({selectedDepartment.rooms?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sections" className="mt-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedDepartment.sections?.map((section) => {
                        const totalRequired = section.requiredTheoryHours + section.requiredLabHours;
                        const allocated = section._count?.allocations || 0;
                        const fillRate = totalRequired > 0 ? Math.round((allocated / totalRequired) * 100) : 0;
                        
                        return (
                          <Link key={section.id} href={`/admin/sections/${section.id}`}>
                            <div className="p-4 rounded-lg border hover:shadow-md transition-all group cursor-pointer">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">
                                  Sem {section.year} - Sec {section.division}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-primary group-hover:translate-x-1 transition-transform">
                                  <Calendar className="w-3 h-3" />
                                  View
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {section.requiredTheoryHours}h theory
                                </span>
                                <span className="flex items-center gap-1">
                                  <FlaskConical className="w-3 h-3" />
                                  {section.requiredLabHours}h lab
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={fillRate} className="flex-1 h-2" />
                                <span className="text-xs font-medium">{fillRate}%</span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {(!selectedDepartment.sections || selectedDepartment.sections.length === 0) && (
                        <div className="col-span-2 text-center py-8 text-muted-foreground">
                          No sections found for this department
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="rooms" className="mt-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedDepartment.rooms?.map((room) => (
                        <Link key={room.id} href={`/admin/rooms/${room.id}`}>
                          <div className="p-4 rounded-lg border hover:shadow-md transition-all group cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{room.logicalName}</span>
                                <Badge variant={room.type === "LAB" ? "default" : "secondary"} className="text-xs">
                                  {room.type === "LAB" ? "🔬" : "📚"} {room.type}
                                </Badge>
                              </div>
                              <span className="flex items-center gap-1 text-xs text-primary group-hover:translate-x-1 transition-transform">
                                <Calendar className="w-3 h-3" />
                                View
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {room.logicalName}
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={room.statistics?.utilizationPct || 0} className="flex-1 h-2" />
                              <span className="text-xs font-medium">{room.statistics?.utilizationPct || 0}%</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {room.statistics?.occupiedSlots || 0} used / {room.statistics?.freeSlots || 0} free
                            </div>
                          </div>
                        </Link>
                      ))}
                      {(!selectedDepartment.rooms || selectedDepartment.rooms.length === 0) && (
                        <div className="col-span-2 text-center py-8 text-muted-foreground">
                          No rooms assigned to this department
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Select a department to view details</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/sections">
          <Card className="hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">All Sections</div>
                  <div className="text-sm text-muted-foreground">View all section timetables</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/rooms">
          <Card className="hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <DoorOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">All Rooms</div>
                  <div className="text-sm text-muted-foreground">View all room timetables</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/departments">
          <Card className="hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold">Manage Departments</div>
                  <div className="text-sm text-muted-foreground">Add or edit departments</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

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
    </div>
  );
}
