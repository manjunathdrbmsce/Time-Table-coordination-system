"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimetableGrid, Allocation } from "@/components/timetable/timetable-grid";
import { ArrowLeft, GraduationCap, Clock, Users, Trash2, Loader2, Link2, Pencil, BookOpen, FlaskConical, X, AlertTriangle, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FreeSlotRequestDialog } from "./free-slot-request-dialog";
import { ExchangeSlotDialog } from "./exchange-slot-dialog";

interface Subject {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  type: "THEORY" | "LAB" | "TUTORIAL";
  semesterNum: number;
}

interface Faculty {
  id: string;
  name: string;
  initials: string;
}

interface Mapping {
  id: string;
  faculty: Faculty;
  subject: Subject;
}

interface FacultyConflict {
  facultyId: string;
  facultyName: string;
  initials: string;
  conflictSection: string;
  day: string;
  startTime: string;
  subject: string;
}

interface SectionData {
  id: string;
  year: number;
  division: string;
  studentCount: number;
  requiredTheoryHours: number;
  requiredLabHours: number;
  department: { id: string; code: string; name: string };
  semester: { id: string; name: string };
  allocations: Allocation[];
}

interface SectionTimetableClientProps {
  section: SectionData;
}

const MAX_LAB_FACULTY = 5;

export function SectionTimetableClient({ section: initialSection }: SectionTimetableClientProps) {
  const router = useRouter();
  const [section, setSection] = useState(initialSection);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  
  // Dialog states
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [freeSlotDialogOpen, setFreeSlotDialogOpen] = useState(false);
  const [selectedFreeSlot, setSelectedFreeSlot] = useState<{ day: string; time: string } | null>(null);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  
  // Data for mapping
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Mapping form state
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [facultyConflicts, setFacultyConflicts] = useState<FacultyConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const theoryHrs = section.allocations.filter(a => a.type === "THEORY").length;
  const labHrs = section.allocations.filter(a => a.type === "LAB").length;
  const totalHrs = theoryHrs + labHrs;
  const targetHrs = section.requiredTheoryHours + section.requiredLabHours;
  const percentage = targetHrs > 0 ? Math.round((totalHrs / targetHrs) * 100) : 0;
  const label = `${section.year}${section.division}`;

  // Fetch subjects and mappings for this section
  const fetchMappingData = async () => {
    setLoadingData(true);
    try {
      const [subjectsRes, mappingsRes] = await Promise.all([
        fetch(`/api/coordinator/subjects?semester=${section.year}`),
        fetch(`/api/coordinator/mappings?sectionId=${section.id}`),
      ]);

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data);
      }
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data);
      }
    } catch (error) {
      console.error("Failed to fetch mapping data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAllocationClick = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    setOptionsDialogOpen(true);
  };

  const handleFreeSlotClick = (day: string, time: string) => {
    setSelectedFreeSlot({ day, time });
    setFreeSlotDialogOpen(true);
  };

  const openDeleteDialog = () => {
    setOptionsDialogOpen(false);
    setDeleteDialogOpen(true);
  };

  const openMapDialog = async () => {
    setOptionsDialogOpen(false);
    await fetchMappingData();
    
    // Pre-select based on allocation type
    if (selectedAllocation) {
      const allocType = selectedAllocation.type;
      // Try to find matching subject by type
      const matchingSubjects = subjects.filter(s => s.type === allocType);
      if (matchingSubjects.length === 1) {
        setSelectedSubjectId(matchingSubjects[0].id);
      }
    }
    
    setMapDialogOpen(true);
  };

  const getSelectedSubject = () => {
    return subjects.find(s => s.id === selectedSubjectId);
  };

  const isLabSubject = () => {
    const subject = getSelectedSubject();
    return subject?.type === "LAB";
  };

  // Get faculty available for selected subject from mappings
  const getAvailableFaculty = (): Faculty[] => {
    if (!selectedSubjectId) return [];
    const subjectMappings = mappings.filter(m => m.subject.id === selectedSubjectId);
    return subjectMappings.map(m => m.faculty);
  };

  // Filter subjects based on slot type
  // LAB slots can only have LAB subjects
  // THEORY slots can have THEORY or TUTORIAL subjects
  const getFilteredSubjects = (): Subject[] => {
    if (!selectedAllocation) return subjects;
    const slotType = selectedAllocation.type;
    
    if (slotType === "LAB") {
      return subjects.filter(s => s.type === "LAB");
    } else {
      // THEORY slots can have THEORY or TUTORIAL subjects
      return subjects.filter(s => s.type === "THEORY" || s.type === "TUTORIAL");
    }
  };

  // Check for faculty conflicts when subject is selected
  const checkFacultyConflicts = async (facultyIds: string[]) => {
    if (!selectedAllocation || facultyIds.length === 0) {
      setFacultyConflicts([]);
      return;
    }

    setCheckingConflicts(true);
    try {
      const res = await fetch("/api/coordinator/check-faculty-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyIds,
          day: selectedAllocation.day,
          startTime: selectedAllocation.startTime,
          excludeSectionId: section.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFacultyConflicts(data.conflicts || []);
      }
    } catch (error) {
      console.error("Failed to check conflicts:", error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Auto-select mapped faculty when subject changes
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    
    // Auto-select all mapped faculty for this subject
    const subjectMappings = mappings.filter(m => m.subject.id === subjectId);
    const mappedFacultyIds = subjectMappings.map(m => m.faculty.id);
    setSelectedFacultyIds(mappedFacultyIds);
    
    // Check for conflicts with auto-selected faculty
    if (mappedFacultyIds.length > 0) {
      checkFacultyConflicts(mappedFacultyIds);
    } else {
      setFacultyConflicts([]);
    }
  };

  const handleFacultyToggle = (facultyId: string) => {
    const subject = getSelectedSubject();
    const maxFaculty = subject?.type === "LAB" ? MAX_LAB_FACULTY : 1;

    setSelectedFacultyIds(prev => {
      let newIds: string[];
      if (prev.includes(facultyId)) {
        newIds = prev.filter(id => id !== facultyId);
      } else {
        if (prev.length >= maxFaculty) {
          toast.error(`Maximum ${maxFaculty} faculty allowed`);
          return prev;
        }
        newIds = [...prev, facultyId];
      }
      
      // Check conflicts whenever faculty selection changes
      checkFacultyConflicts(newIds);
      return newIds;
    });
  };

  const handleDelete = async () => {
    if (!selectedAllocation) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/coordinator/allocations/${selectedAllocation.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Slot deleted successfully");
        setSection(prev => ({
          ...prev,
          allocations: prev.allocations.filter(a => a.id !== selectedAllocation.id)
        }));
        setDeleteDialogOpen(false);
        setSelectedAllocation(null);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete slot");
      }
    } catch (error) {
      toast.error("Failed to delete slot");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMapSubject = async () => {
    if (!selectedAllocation || !selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }

    const subject = getSelectedSubject();
    const availableFaculty = getAvailableFaculty();

    // For LAB, faculty is optional. For THEORY/TUTORIAL, at least one required if available
    if (subject?.type !== "LAB" && availableFaculty.length > 0 && selectedFacultyIds.length === 0) {
      toast.error("Please select at least one faculty");
      return;
    }

    setIsMapping(true);
    try {
      const res = await fetch(`/api/coordinator/allocations/${selectedAllocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          facultyIds: selectedFacultyIds.length > 0 ? selectedFacultyIds.join(",") : null,
        }),
      });

      if (res.ok) {
        const updatedAllocation = await res.json();
        toast.success("Subject mapped successfully");
        
        // Update local state with data from API response to ensure consistency
        setSection(prev => ({
          ...prev,
          allocations: prev.allocations.map(a => 
            a.id === selectedAllocation.id 
              ? { 
                  ...a, 
                  subject: updatedAllocation.subject,
                  faculty: updatedAllocation.faculty,
                  subjectId: updatedAllocation.subjectId,
                  facultyIds: updatedAllocation.facultyIds,
                }
              : a
          )
        }));
        
        setMapDialogOpen(false);
        setSelectedAllocation(null);
        setSelectedSubjectId("");
        setSelectedFacultyIds([]);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to map subject");
      }
    } catch (error) {
      toast.error("Failed to map subject");
    } finally {
      setIsMapping(false);
    }
  };

  const resetMapDialog = () => {
    setSelectedSubjectId("");
    setSelectedFacultyIds([]);
    setFacultyConflicts([]);
  };

  return (
    <div className="space-y-6">
      <Link href="/coordinator/sections">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sections
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {section.department.code} - {label}
          </h1>
          <Badge variant="secondary">{section.semester.name}</Badge>
        </div>
        <p className="text-muted-foreground">
          {section.studentCount} students • {section.semester.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Theory Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{theoryHrs}/{section.requiredTheoryHours}</div>
            <Progress value={(theoryHrs / section.requiredTheoryHours) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Hours</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labHrs}/{section.requiredLabHours}</div>
            <Progress value={(labHrs / section.requiredLabHours) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage}%</div>
            <Progress value={percentage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Timetable</CardTitle>
          <CardDescription>Click on allocated slots to manage them, or click on free slots to request a room</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableGrid
            allocations={section.allocations}
            mode="edit"
            highlightFreeSlots
            onAllocationClick={handleAllocationClick}
            onSlotClick={handleFreeSlotClick}
            semesterNum={parseInt(section.semester.name.replace(/\D/g, '')) || 5}
          />
        </CardContent>
      </Card>

      {/* Slot Options Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Slot Options</DialogTitle>
            <DialogDescription>
              Choose an action for this slot
            </DialogDescription>
          </DialogHeader>
          
          {selectedAllocation && (
            <div className="p-3 bg-muted rounded-lg space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedAllocation.subject}</span>
                <Badge variant={selectedAllocation.type === "LAB" ? "default" : "secondary"}>
                  {selectedAllocation.type}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedAllocation.day} • {selectedAllocation.startTime}
                {selectedAllocation.room && ` • ${selectedAllocation.room}`}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="justify-start h-12"
              onClick={openMapDialog}
            >
              <Link2 className="mr-3 h-5 w-5 text-blue-500" />
              <div className="text-left">
                <div className="font-medium">Map to Subject</div>
                <div className="text-xs text-muted-foreground">Assign subject & faculty</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start h-12"
              onClick={() => {
                setOptionsDialogOpen(false);
                setExchangeDialogOpen(true);
              }}
            >
              <ArrowLeftRight className="mr-3 h-5 w-5 text-purple-500" />
              <div className="text-left">
                <div className="font-medium">Exchange Slot</div>
                <div className="text-xs text-muted-foreground">Swap with another department</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start h-12 text-destructive hover:text-destructive"
              onClick={openDeleteDialog}
            >
              <Trash2 className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Delete Slot</div>
                <div className="text-xs text-muted-foreground">Remove this allocation</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map to Subject Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={(open) => {
        setMapDialogOpen(open);
        if (!open) resetMapDialog();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Map to Subject
            </DialogTitle>
            <DialogDescription>
              Assign a subject and faculty to this slot. 
              {selectedAllocation?.type === "LAB" 
                ? " Only LAB subjects are shown for this slot."
                : " Only THEORY and TUTORIAL subjects are shown for this slot."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAllocation && (
            <div className="p-3 bg-muted rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedAllocation.subject}</span>
                <Badge variant={selectedAllocation.type === "LAB" ? "default" : "secondary"}>
                  {selectedAllocation.type}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedAllocation.day} • {selectedAllocation.startTime}
              </div>
            </div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={handleSubjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubjects().length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No {selectedAllocation?.type === "LAB" ? "LAB" : "THEORY/TUTORIAL"} subjects found. Create subjects first.
                      </div>
                    ) : (
                      getFilteredSubjects().map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            {subject.type === "LAB" ? (
                              <FlaskConical className="h-3 w-3 text-blue-500" />
                            ) : subject.type === "TUTORIAL" ? (
                              <GraduationCap className="h-3 w-3 text-purple-500" />
                            ) : (
                              <BookOpen className="h-3 w-3 text-green-500" />
                            )}
                            <Badge variant="outline" className="text-xs py-0">
                              {subject.type}
                            </Badge>
                            <span>{subject.code}</span>
                            <span className="text-muted-foreground">- {subject.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedSubjectId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Faculty {isLabSubject() ? `(optional, max ${MAX_LAB_FACULTY})` : "*"}
                    </Label>
                    {selectedFacultyIds.length > 0 && (
                      <Badge variant="secondary">{selectedFacultyIds.length} selected</Badge>
                    )}
                  </div>

                  {/* Selected Faculty Tags */}
                  {selectedFacultyIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                      {selectedFacultyIds.map(id => {
                        const faculty = getAvailableFaculty().find(f => f.id === id);
                        return faculty ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {faculty.initials}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => handleFacultyToggle(id)}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  {getAvailableFaculty().length === 0 ? (
                    <div className="p-3 border rounded-md text-sm text-muted-foreground">
                      No faculty mapped for this subject. Create faculty mappings first.
                    </div>
                  ) : (
                    <ScrollArea className="h-[150px] border rounded-md p-2">
                      <div className="space-y-2">
                        {getAvailableFaculty().map((faculty) => {
                          const isSelected = selectedFacultyIds.includes(faculty.id);
                          const maxReached = !isSelected && selectedFacultyIds.length >= (isLabSubject() ? MAX_LAB_FACULTY : 1);
                          const hasConflict = facultyConflicts.some(c => c.facultyId === faculty.id);
                          
                          return (
                            <div
                              key={faculty.id}
                              className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                                maxReached
                                  ? "opacity-50 cursor-not-allowed"
                                  : hasConflict && isSelected
                                    ? "bg-destructive/10 border border-destructive/30 cursor-pointer"
                                    : isSelected 
                                      ? "bg-primary/10 border border-primary/20 cursor-pointer" 
                                      : "hover:bg-muted cursor-pointer"
                              }`}
                              onClick={() => {
                                if (!maxReached) {
                                  handleFacultyToggle(faculty.id);
                                }
                              }}
                            >
                              <Checkbox 
                                checked={isSelected}
                                disabled={maxReached}
                              />
                              <Badge variant="outline" className="font-mono text-xs">
                                {faculty.initials}
                              </Badge>
                              <span className="text-sm">{faculty.name}</span>
                              {hasConflict && isSelected && (
                                <AlertTriangle className="h-4 w-4 text-destructive ml-auto" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Faculty Conflict Warning */}
                  {facultyConflicts.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                      <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        Faculty Conflict Detected!
                      </div>
                      <div className="text-sm space-y-1">
                        {facultyConflicts.map((conflict, idx) => (
                          <div key={idx} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{conflict.facultyName}</span> ({conflict.initials}) is already assigned to{" "}
                            <span className="font-medium text-foreground">{conflict.subject}</span> in{" "}
                            <span className="font-medium text-foreground">{conflict.conflictSection}</span> at the same time slot ({conflict.day} {conflict.startTime}).
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-destructive mt-2">
                        You cannot assign this faculty to multiple classes at the same time.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMapDialogOpen(false)}
              disabled={isMapping}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMapSubject}
              disabled={isMapping || !selectedSubjectId || facultyConflicts.length > 0 || checkingConflicts}
            >
              {isMapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mapping...
                </>
              ) : checkingConflicts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : facultyConflicts.length > 0 ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Conflict Detected
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Map Subject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Allocation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this slot? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAllocation && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedAllocation.subject}</span>
                <Badge variant={selectedAllocation.type === "LAB" ? "default" : "secondary"}>
                  {selectedAllocation.type}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Faculty: {selectedAllocation.faculty}</p>
                <p>Day: {selectedAllocation.day}</p>
                <p>Time: {selectedAllocation.startTime}</p>
                {selectedAllocation.room && <p>Room: {selectedAllocation.room}</p>}
              </div>
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Free Slot Request Dialog */}
      {selectedFreeSlot && (
        <FreeSlotRequestDialog
          open={freeSlotDialogOpen}
          onOpenChange={setFreeSlotDialogOpen}
          day={selectedFreeSlot.day}
          startTime={selectedFreeSlot.time}
          sectionId={section.id}
          sectionLabel={`${section.department.code} ${label}`}
          onRequestCreated={() => {
            router.refresh();
          }}
        />
      )}

      {/* Exchange Slot Dialog */}
      {selectedAllocation && (
        <ExchangeSlotDialog
          open={exchangeDialogOpen}
          onOpenChange={setExchangeDialogOpen}
          sourceAllocation={{
            id: selectedAllocation.id,
            day: selectedAllocation.day,
            startTime: selectedAllocation.startTime,
            endTime: selectedAllocation.endTime,
            subject: selectedAllocation.subject,
            faculty: selectedAllocation.faculty || "",
            type: selectedAllocation.type,
            room: selectedAllocation.room,
          }}
          sectionId={section.id}
          sectionLabel={`${section.department.code} ${label}`}
          onExchangeCreated={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
