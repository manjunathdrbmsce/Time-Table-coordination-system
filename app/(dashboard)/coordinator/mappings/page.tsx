"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Plus, Trash2, Loader2, Filter, BookOpen, FlaskConical, GraduationCap, Users, X, Pencil } from "lucide-react";
import toast from "react-hot-toast";

interface Faculty {
  id: string;
  name: string;
  initials: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  type: "THEORY" | "LAB" | "TUTORIAL";
  semesterNum: number;
}

interface Section {
  id: string;
  year: number;
  division: string;
  semester: { name: string };
}

interface Mapping {
  id: string;
  faculty: Faculty;
  subject: Subject;
  section: Section;
}

const SUBJECT_TYPES: Record<string, { icon: any; color: string; label: string }> = {
  THEORY: { icon: BookOpen, color: "bg-green-100 text-green-800", label: "Theory" },
  LAB: { icon: FlaskConical, color: "bg-blue-100 text-blue-800", label: "Lab" },
  TUTORIAL: { icon: GraduationCap, color: "bg-purple-100 text-purple-800", label: "Tutorial" },
};

const MAX_LAB_FACULTY = 5;

export default function CoordinatorMappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<Mapping | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ subject: Subject; section: Section; faculties: Faculty[]; mappingIds: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFacultyIds, setEditFacultyIds] = useState<string[]>([]);

  // Filters
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterFaculty, setFilterFaculty] = useState<string>("all");

  // Form state - supports multiple faculty for LAB subjects
  const [formData, setFormData] = useState({
    facultyIds: [] as string[],
    subjectId: "",
    sectionId: "",
  });

  const fetchData = async () => {
    try {
      const [mappingsRes, facultiesRes, subjectsRes, sectionsRes] = await Promise.all([
        fetch("/api/coordinator/mappings"),
        fetch("/api/coordinator/faculties"),
        fetch("/api/coordinator/subjects"),
        fetch("/api/coordinator/sections"),
      ]);

      if (mappingsRes.ok) setMappings(await mappingsRes.json());
      if (facultiesRes.ok) setFaculties(await facultiesRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSection !== "all") params.set("sectionId", filterSection);
      if (filterSubject !== "all") params.set("subjectId", filterSubject);
      if (filterFaculty !== "all") params.set("facultyId", filterFaculty);

      const res = await fetch(`/api/coordinator/mappings?${params}`);
      if (res.ok) {
        setMappings(await res.json());
      }
    } catch (error) {
      toast.error("Failed to fetch mappings");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchMappings();
    }
  }, [filterSection, filterSubject, filterFaculty]);

  const getSelectedSubject = () => {
    return subjects.find(s => s.id === formData.subjectId);
  };

  const isLabSubject = () => {
    const subject = getSelectedSubject();
    return subject?.type === "LAB";
  };

  const handleFacultyToggle = (facultyId: string) => {
    const subject = getSelectedSubject();
    const maxFaculty = subject?.type === "LAB" ? MAX_LAB_FACULTY : 1;

    setFormData(prev => {
      if (prev.facultyIds.includes(facultyId)) {
        // Remove faculty
        return { ...prev, facultyIds: prev.facultyIds.filter(id => id !== facultyId) };
      } else {
        // Add faculty (check limit)
        if (prev.facultyIds.length >= maxFaculty) {
          toast.error(`Maximum ${maxFaculty} faculty allowed for ${subject?.type || 'this subject'}`);
          return prev;
        }
        return { ...prev, facultyIds: [...prev.facultyIds, facultyId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (formData.facultyIds.length === 0 || !formData.subjectId || !formData.sectionId) {
      toast.error("Please select section, subject, and at least one faculty");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create mapping for each selected faculty
      const results = await Promise.all(
        formData.facultyIds.map(facultyId =>
          fetch("/api/coordinator/mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              facultyId,
              subjectId: formData.subjectId,
              sectionId: formData.sectionId,
            }),
          })
        )
      );

      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Created ${successCount} mapping${successCount > 1 ? 's' : ''}`);
        fetchMappings();
      }
      if (failCount > 0) {
        toast.error(`${failCount} mapping${failCount > 1 ? 's' : ''} failed (may already exist)`);
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create mappings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMapping) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/coordinator/mappings/${selectedMapping.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Mapping deleted");
        setDeleteDialogOpen(false);
        setSelectedMapping(null);
        fetchMappings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete mapping");
      }
    } catch (error) {
      toast.error("Failed to delete mapping");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = (group: { subject: Subject; section: Section; faculties: Faculty[]; mappingIds: string[] }) => {
    setSelectedGroup(group);
    setEditFacultyIds(group.faculties.map(f => f.id));
    setEditDialogOpen(true);
  };

  const handleEditFacultyToggle = (facultyId: string) => {
    const subject = selectedGroup?.subject;
    const maxFaculty = subject?.type === "LAB" ? MAX_LAB_FACULTY : 1;

    setEditFacultyIds(prev => {
      if (prev.includes(facultyId)) {
        // Remove faculty
        return prev.filter(id => id !== facultyId);
      } else {
        // Add faculty (check limit)
        if (prev.length >= maxFaculty) {
          toast.error(`Maximum ${maxFaculty} faculty allowed for ${subject?.type || 'this subject'}`);
          return prev;
        }
        return [...prev, facultyId];
      }
    });
  };

  const handleEditSubmit = async () => {
    if (!selectedGroup) return;

    setIsSubmitting(true);
    try {
      const currentFacultyIds = selectedGroup.faculties.map(f => f.id);
      
      // Find faculty to remove
      const toRemove = currentFacultyIds.filter(id => !editFacultyIds.includes(id));
      // Find faculty to add
      const toAdd = editFacultyIds.filter(id => !currentFacultyIds.includes(id));

      // Delete mappings for removed faculty
      for (const facultyId of toRemove) {
        const idx = currentFacultyIds.indexOf(facultyId);
        if (idx !== -1 && selectedGroup.mappingIds[idx]) {
          await fetch(`/api/coordinator/mappings/${selectedGroup.mappingIds[idx]}`, {
            method: "DELETE",
          });
        }
      }

      // Create mappings for added faculty
      for (const facultyId of toAdd) {
        await fetch("/api/coordinator/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            facultyId,
            subjectId: selectedGroup.subject.id,
            sectionId: selectedGroup.section.id,
          }),
        });
      }

      const changes = toRemove.length + toAdd.length;
      if (changes > 0) {
        toast.success(`Updated mapping: ${toRemove.length} removed, ${toAdd.length} added`);
      } else {
        toast.success("No changes made");
      }

      setEditDialogOpen(false);
      setSelectedGroup(null);
      fetchMappings();
    } catch (error) {
      toast.error("Failed to update mappings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ facultyIds: [], subjectId: "", sectionId: "" });
  };

  // Filter subjects based on selected section's semester
  const getFilteredSubjects = () => {
    if (!formData.sectionId) return subjects;
    const section = sections.find(s => s.id === formData.sectionId);
    if (!section) return subjects;
    return subjects.filter(s => s.semesterNum === section.year);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faculty Mappings</h1>
          <p className="text-muted-foreground">
            Assign faculty members to subjects for each section. Labs can have up to {MAX_LAB_FACULTY} faculty.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Faculty Mapping</DialogTitle>
              <DialogDescription>
                Assign faculty to teach a subject. For LAB subjects, you can select up to {MAX_LAB_FACULTY} faculty members.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Section *</Label>
                <Select
                  value={formData.sectionId}
                  onValueChange={(v) => setFormData({ ...formData, sectionId: v, subjectId: "", facultyIds: [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        Sem {section.year} - Sec {section.division} ({section.semester.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(v) => setFormData({ ...formData, subjectId: v, facultyIds: [] })}
                  disabled={!formData.sectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.sectionId ? "Select subject" : "Select section first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubjects().map((subject) => {
                      const typeConfig = SUBJECT_TYPES[subject.type];
                      return (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={`${typeConfig.color} text-xs py-0`}>
                              {typeConfig.label}
                            </Badge>
                            {subject.code} - {subject.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Faculty * {isLabSubject() && <span className="text-muted-foreground">(select up to {MAX_LAB_FACULTY})</span>}
                  </Label>
                  {formData.facultyIds.length > 0 && (
                    <Badge variant="secondary">{formData.facultyIds.length} selected</Badge>
                  )}
                </div>
                
                {/* Selected Faculty Tags */}
                {formData.facultyIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                    {formData.facultyIds.map(id => {
                      const faculty = faculties.find(f => f.id === id);
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

                {/* Faculty Selection List */}
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {faculties.map((faculty) => {
                      const isSelected = formData.facultyIds.includes(faculty.id);
                      const isDisabled = !formData.subjectId;
                      const maxReached = !isSelected && formData.facultyIds.length >= (isLabSubject() ? MAX_LAB_FACULTY : 1);
                      
                      return (
                        <div
                          key={faculty.id}
                          className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                            isDisabled || maxReached
                              ? "opacity-50 cursor-not-allowed"
                              : isSelected 
                                ? "bg-primary/10 border border-primary/20 cursor-pointer" 
                                : "hover:bg-muted cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!isDisabled && !maxReached) {
                              handleFacultyToggle(faculty.id);
                            }
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            disabled={isDisabled || maxReached}
                          />
                          <Badge variant="outline" className="font-mono text-xs">
                            {faculty.initials}
                          </Badge>
                          <span className="text-sm">{faculty.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                {!isLabSubject() && formData.subjectId && (
                  <p className="text-xs text-muted-foreground">
                    Theory/Tutorial subjects allow only 1 faculty
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || formData.facultyIds.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {formData.facultyIds.length > 1 ? `${formData.facultyIds.length} Mappings` : "Mapping"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mappings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sections Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mappings.map(m => m.section.id)).size} / {sections.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subjects Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mappings.map(m => m.subject.id)).size} / {subjects.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faculty Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mappings.map(m => m.faculty.id)).size} / {faculties.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="w-48">
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      Sem {section.year} - Sec {section.division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={filterFaculty} onValueChange={setFilterFaculty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Faculty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Faculty</SelectItem>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.initials} - {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings Table - Grouped View */}
      <Card>
        <CardHeader>
          <CardTitle>Mappings List</CardTitle>
          <CardDescription>
            {mappings.length} mapping{mappings.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No mappings found</h3>
              <p className="text-muted-foreground">
                {filterSection !== "all" || filterSubject !== "all" || filterFaculty !== "all"
                  ? "Try adjusting your filters"
                  : "Start by creating faculty-subject mappings"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Faculty (click to remove)</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Group mappings by subject+section
                  const grouped = mappings.reduce((acc, mapping) => {
                    const key = `${mapping.subject.id}-${mapping.section.id}`;
                    if (!acc[key]) {
                      acc[key] = {
                        subject: mapping.subject,
                        section: mapping.section,
                        faculties: [],
                        mappingIds: [],
                      };
                    }
                    acc[key].faculties.push(mapping.faculty);
                    acc[key].mappingIds.push(mapping.id);
                    return acc;
                  }, {} as Record<string, { subject: Subject; section: Section; faculties: Faculty[]; mappingIds: string[] }>);

                  return Object.entries(grouped).map(([key, group]) => {
                    const typeConfig = SUBJECT_TYPES[group.subject.type];
                    const TypeIcon = typeConfig.icon;
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Sem {group.section.year} - Sec {group.section.division}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{group.subject.code}</span>
                            <span className="text-muted-foreground ml-2">{group.subject.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeConfig.color}>
                            <TypeIcon className="mr-1 h-3 w-3" />
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.faculties.map((faculty, idx) => (
                              <Badge 
                                key={faculty.id} 
                                variant="outline" 
                                className="font-mono cursor-pointer hover:bg-destructive/10 hover:border-destructive"
                                title={`${faculty.name} - Click to remove`}
                                onClick={() => {
                                  setSelectedMapping({
                                    id: group.mappingIds[idx],
                                    faculty,
                                    subject: group.subject,
                                    section: group.section,
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                {faculty.initials}
                                <X className="ml-1 h-3 w-3" />
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit faculty mappings"
                              onClick={() => handleOpenEditDialog(group)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              title="Delete all faculty mappings for this subject"
                              onClick={() => {
                                if (confirm(`Delete all ${group.faculties.length} faculty mapping${group.faculties.length > 1 ? 's' : ''} for ${group.subject.code}?`)) {
                                  Promise.all(
                                    group.mappingIds.map(id => 
                                      fetch(`/api/coordinator/mappings/${id}`, { method: "DELETE" })
                                    )
                                  ).then(() => {
                                    toast.success("All mappings deleted");
                                    fetchMappings();
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Mapping Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove Faculty from Mapping</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this faculty from the subject mapping?
            </DialogDescription>
          </DialogHeader>
          {selectedMapping && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p><strong>Section:</strong> Sem {selectedMapping.section.year} - Sec {selectedMapping.section.division}</p>
              <p><strong>Subject:</strong> {selectedMapping.subject.code} - {selectedMapping.subject.name}</p>
              <p><strong>Faculty:</strong> {selectedMapping.faculty.name} ({selectedMapping.faculty.initials})</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faculty Mapping</DialogTitle>
            <DialogDescription>
              Update faculty assigned to this subject for the section.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Section:</strong> Sem {selectedGroup.section.year} - Sec {selectedGroup.section.division}</p>
                <p><strong>Subject:</strong> {selectedGroup.subject.code} - {selectedGroup.subject.name}</p>
                <Badge className={SUBJECT_TYPES[selectedGroup.subject.type].color}>
                  {SUBJECT_TYPES[selectedGroup.subject.type].label}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>
                  Select Faculty {selectedGroup.subject.type === "LAB" ? `(up to ${MAX_LAB_FACULTY})` : "(1 only)"}
                </Label>
                <ScrollArea className="h-48 border rounded-md p-3">
                  <div className="space-y-2">
                    {faculties.map((faculty) => (
                      <div key={faculty.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-faculty-${faculty.id}`}
                          checked={editFacultyIds.includes(faculty.id)}
                          onCheckedChange={() => handleEditFacultyToggle(faculty.id)}
                        />
                        <label
                          htmlFor={`edit-faculty-${faculty.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          <span className="font-mono">{faculty.initials}</span> - {faculty.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {editFacultyIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editFacultyIds.map(id => {
                      const faculty = faculties.find(f => f.id === id);
                      return faculty ? (
                        <Badge key={id} variant="secondary" className="font-mono">
                          {faculty.initials}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting || editFacultyIds.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
