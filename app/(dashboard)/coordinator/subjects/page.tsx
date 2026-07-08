"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, FlaskConical, GraduationCap, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Filter, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Subject {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  type: "THEORY" | "LAB" | "TUTORIAL";
  credits: number;
  hoursPerWeek: number;
  semesterNum: number;
  department: { id: string; code: string; name: string };
  _count: { facultyMappings: number };
}

interface UploadResult {
  success: boolean;
  imported?: number;
  total?: number;
  errors?: { row: number; error: string }[];
  skipped?: { row: number; code: string; reason: string }[];
  message?: string;
}

const SUBJECT_TYPES = [
  { value: "THEORY", label: "Theory", icon: BookOpen, color: "bg-green-100 text-green-800" },
  { value: "LAB", label: "Lab", icon: FlaskConical, color: "bg-blue-100 text-blue-800" },
  { value: "TUTORIAL", label: "Tutorial", icon: GraduationCap, color: "bg-purple-100 text-purple-800" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CoordinatorSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    shortName: "",
    type: "THEORY" as "THEORY" | "LAB" | "TUTORIAL",
    credits: 3,
    hoursPerWeek: 3,
    semesterNum: 1,
  });

  const fetchSubjects = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSemester !== "all") params.set("semester", filterSemester);
      if (filterType !== "all") params.set("type", filterType);
      
      const res = await fetch(`/api/coordinator/subjects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      } else {
        toast.error("Failed to fetch subjects");
      }
    } catch (error) {
      toast.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [filterSemester, filterType]);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedSubject
        ? `/api/coordinator/subjects/${selectedSubject.id}`
        : "/api/coordinator/subjects";
      const method = selectedSubject ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedSubject ? "Subject updated" : "Subject created");
        setDialogOpen(false);
        resetForm();
        fetchSubjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save subject");
      }
    } catch (error) {
      toast.error("Failed to save subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/coordinator/subjects/${selectedSubject.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Subject deleted");
        setDeleteDialogOpen(false);
        setSelectedSubject(null);
        fetchSubjects();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete subject");
      }
    } catch (error) {
      toast.error("Failed to delete subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      shortName: "",
      type: "THEORY",
      credits: 3,
      hoursPerWeek: 3,
      semesterNum: 1,
    });
    setSelectedSubject(null);
  };

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      shortName: subject.shortName || "",
      type: subject.type,
      credits: subject.credits,
      hoursPerWeek: subject.hoursPerWeek,
      semesterNum: subject.semesterNum,
    });
    setDialogOpen(true);
  };

  const getTypeConfig = (type: string) => {
    return SUBJECT_TYPES.find(t => t.value === type) || SUBJECT_TYPES[0];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/coordinator/subjects/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadResult(data);

      if (data.success) {
        toast.success(`Imported ${data.imported} subjects`);
        fetchSubjects();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadTemplate = () => {
    const csv = `Code,Name,Short Name,Type,Credits,Hours,Semester
CS301,Data Structures and Algorithms,DSA,THEORY,4,4,3
CS302,Database Management Systems,DBMS,THEORY,3,3,3
CS303L,Data Structures Lab,DS-LAB,LAB,2,2,3
CS304T,Problem Solving Tutorial,PST,TUTORIAL,1,1,3
CS401,Operating Systems,OS,THEORY,4,4,4
CS402L,Operating Systems Lab,OS-LAB,LAB,2,2,4`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subjects_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage theory courses, lab subjects, and tutorials for your department
          </p>
        </div>
        <div className="flex gap-2">
          {/* Bulk Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open) setUploadResult(null);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Upload Subjects</DialogTitle>
                <DialogDescription>
                  Upload an Excel or CSV file with subject information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    File Format
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your file should have the following columns:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li><strong>Code</strong> (required) - Subject code (e.g., CS301)</li>
                    <li><strong>Name</strong> (required) - Full subject name</li>
                    <li><strong>Semester</strong> (required) - Semester number (1-8)</li>
                    <li><strong>Short Name</strong> (optional) - Abbreviation (e.g., DSA)</li>
                    <li><strong>Type</strong> (optional) - THEORY, LAB, or TUTORIAL</li>
                    <li><strong>Credits</strong> (optional) - 1-10, default: 3</li>
                    <li><strong>Hours</strong> (optional) - Hours per week, default: credits</li>
                  </ul>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
                    <Download className="mr-1 h-3 w-3" />
                    Download Template
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Processing file...</span>
                  </div>
                )}

                {uploadResult && (
                  <div className="space-y-3">
                    {uploadResult.success ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">
                            Successfully imported {uploadResult.imported} of {uploadResult.total} subjects
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">{uploadResult.message}</span>
                        </div>
                      </div>
                    )}

                    {uploadResult.skipped && uploadResult.skipped.length > 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">
                          Skipped ({uploadResult.skipped.length})
                        </h5>
                        <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                          {uploadResult.skipped.map((s, i) => (
                            <li key={i}>
                              Row {s.row}: {s.code} - {s.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h5 className="font-medium text-red-800 mb-2">
                          Errors ({uploadResult.errors.length})
                        </h5>
                        <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                          {uploadResult.errors.map((e, i) => (
                            <li key={i}>
                              Row {e.row}: {e.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Subject Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedSubject ? "Edit Subject" : "Add New Subject"}
              </DialogTitle>
              <DialogDescription>
                {selectedSubject
                  ? "Update the subject details"
                  : "Create a new subject for your department"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Subject Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g., CS301"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select
                    value={formData.semesterNum.toString()}
                    onValueChange={(v) => setFormData({ ...formData, semesterNum: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Data Structures"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short Name (optional)</Label>
                <Input
                  id="shortName"
                  placeholder="e.g., DS"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours/Week</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.hoursPerWeek}
                    onChange={(e) => setFormData({ ...formData, hoursPerWeek: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedSubject ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={filterSemester} onValueChange={setFilterSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {SEMESTERS.map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {SUBJECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subjects List</CardTitle>
          <CardDescription>
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No subjects found</h3>
              <p className="text-muted-foreground">
                {filterSemester !== "all" || filterType !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first subject"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Hrs/Week</TableHead>
                  <TableHead className="text-center">Mappings</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => {
                  const typeConfig = getTypeConfig(subject.type);
                  return (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.code}</TableCell>
                      <TableCell>
                        <div>
                          {subject.name}
                          {subject.shortName && (
                            <span className="ml-2 text-muted-foreground">({subject.shortName})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig.color}>
                          <typeConfig.icon className="mr-1 h-3 w-3" />
                          {typeConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">Sem {subject.semesterNum}</TableCell>
                      <TableCell className="text-center">{subject.credits}</TableCell>
                      <TableCell className="text-center">{subject.hoursPerWeek}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{subject._count.facultyMappings}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(subject)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedSubject(subject);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedSubject?.name}"? This will also remove all faculty mappings for this subject.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
