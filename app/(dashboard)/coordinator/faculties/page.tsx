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
import { Users, Plus, MoreHorizontal, Pencil, Trash2, Loader2, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Faculty {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: { id: string; code: string; name: string };
  _count: { subjectMappings: number };
}

interface UploadResult {
  success: boolean;
  imported?: number;
  total?: number;
  errors?: { row: number; error: string }[];
  skipped?: { row: number; initials: string; reason: string }[];
  message?: string;
}

export default function CoordinatorFacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    initials: "",
    email: "",
    phone: "",
    designation: "",
  });

  const fetchFaculties = async () => {
    try {
      const res = await fetch("/api/coordinator/faculties");
      if (res.ok) {
        const data = await res.json();
        setFaculties(data);
      } else {
        toast.error("Failed to fetch faculties");
      }
    } catch (error) {
      toast.error("Failed to fetch faculties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.initials) {
      toast.error("Please fill in name and initials");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedFaculty
        ? `/api/coordinator/faculties/${selectedFaculty.id}`
        : "/api/coordinator/faculties";
      const method = selectedFaculty ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          designation: formData.designation || null,
        }),
      });

      if (res.ok) {
        toast.success(selectedFaculty ? "Faculty updated" : "Faculty created");
        setDialogOpen(false);
        resetForm();
        fetchFaculties();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save faculty");
      }
    } catch (error) {
      toast.error("Failed to save faculty");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFaculty) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/coordinator/faculties/${selectedFaculty.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Faculty deleted");
        setDeleteDialogOpen(false);
        setSelectedFaculty(null);
        fetchFaculties();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete faculty");
      }
    } catch (error) {
      toast.error("Failed to delete faculty");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/coordinator/faculties/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadResult(data);

      if (data.success) {
        toast.success(`Imported ${data.imported} faculties`);
        fetchFaculties();
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

  const resetForm = () => {
    setFormData({
      name: "",
      initials: "",
      email: "",
      phone: "",
      designation: "",
    });
    setSelectedFaculty(null);
  };

  const openEditDialog = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      name: faculty.name,
      initials: faculty.initials,
      email: faculty.email || "",
      phone: faculty.phone || "",
      designation: faculty.designation || "",
    });
    setDialogOpen(true);
  };

  const downloadTemplate = () => {
    const csv = `Name,Initials,Email,Phone,Designation
Dr. John Smith,DJS,john@example.com,9876543210,Associate Professor
Ms. Jane Doe,JD,jane@example.com,9876543211,Assistant Professor
Prof. Robert Wilson,RW,robert@example.com,9876543212,Professor
Mr. David Lee,DL,david@example.com,9876543213,Lecturer`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty_template.csv";
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
          <h1 className="text-3xl font-bold tracking-tight">Faculty</h1>
          <p className="text-muted-foreground">
            Manage faculty members for your department
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
                <DialogTitle>Bulk Upload Faculty</DialogTitle>
                <DialogDescription>
                  Upload an Excel or CSV file with faculty information
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
                    <li><strong>Name</strong> (required) - Faculty full name</li>
                    <li><strong>Initials</strong> (required) - Short code (e.g., DJS)</li>
                    <li><strong>Email</strong> (optional)</li>
                    <li><strong>Phone</strong> (optional)</li>
                    <li><strong>Designation</strong> (optional)</li>
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
                            Successfully imported {uploadResult.imported} of {uploadResult.total} faculties
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
                              Row {s.row}: {s.initials} - {s.reason}
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

          {/* Add Faculty Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedFaculty ? "Edit Faculty" : "Add New Faculty"}
                </DialogTitle>
                <DialogDescription>
                  {selectedFaculty
                    ? "Update the faculty details"
                    : "Add a new faculty member to your department"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Dr. John Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initials">Initials *</Label>
                    <Input
                      id="initials"
                      placeholder="e.g., DJS"
                      value={formData.initials}
                      onChange={(e) => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    placeholder="e.g., Associate Professor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="e.g., 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedFaculty ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faculties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faculties.filter(f => f._count.subjectMappings > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faculties.reduce((sum, f) => sum + f._count.subjectMappings, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty Table */}
      <Card>
        <CardHeader>
          <CardTitle>Faculty List</CardTitle>
          <CardDescription>
            {faculties.length} faculty member{faculties.length !== 1 ? "s" : ""} in your department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faculties.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No faculty members</h3>
              <p className="text-muted-foreground">
                Add faculty members manually or use bulk upload
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initials</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Mappings</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faculties.map((faculty) => (
                  <TableRow key={faculty.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {faculty.initials}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{faculty.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {faculty.designation || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {faculty.email || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={faculty._count.subjectMappings > 0 ? "default" : "secondary"}>
                        {faculty._count.subjectMappings}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(faculty)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedFaculty(faculty);
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Faculty</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFaculty?.name}"? This will also remove all subject mappings for this faculty.
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
