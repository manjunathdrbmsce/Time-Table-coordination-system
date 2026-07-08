"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, GraduationCap, Plus, Loader2, Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

interface Department {
  id: string;
  code: string;
  name: string;
  statistics: {
    allocationPercent: number;
    totalSections: number;
    totalRooms: number;
  } | null;
  _count: {
    users: number;
    sections: number;
    rooms: number;
  };
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/admin/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (error) {
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isEditing = !!editingDepartment;
      const res = await fetch("/api/admin/departments", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingDepartment.id, ...formData } : formData),
      });

      if (res.ok) {
        toast.success(isEditing ? "Department updated successfully" : "Department created successfully");
        setIsDialogOpen(false);
        setFormData({ code: "", name: "" });
        setEditingDepartment(null);
        fetchDepartments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save department");
      }
    } catch (error) {
      toast.error("Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({ code: dept.code, name: dept.name });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (dept: Department) => {
    setDepartmentToDelete(dept);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/departments?id=${departmentToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Department deleted successfully");
        setDeleteDialogOpen(false);
        setDepartmentToDelete(null);
        fetchDepartments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete department");
      }
    } catch (error) {
      toast.error("Failed to delete department");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingDepartment(null);
      setFormData({ code: "", name: "" });
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage departments and view their statistics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? "Edit Department" : "Add New Department"}</DialogTitle>
              <DialogDescription>
                {editingDepartment ? "Update department details" : "Create a new department"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Department Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="CSE"
                    required
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">Short code (e.g., CSE, ECE, ME)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Computer Science and Engineering"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDepartment ? "Save Changes" : "Create Department"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {dept.code}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{dept._count?.sections || 0} sections</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(dept)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(dept)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardDescription>{dept.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{dept._count?.users || 0}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
                <div>
                  <GraduationCap className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{dept._count?.sections || 0}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
                <div>
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{dept._count?.rooms || 0}</p>
                  <p className="text-xs text-muted-foreground">Rooms</p>
                </div>
              </div>
              {dept.statistics && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Allocation</span>
                    <span className="font-medium">{dept.statistics.allocationPercent}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No departments found</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Department
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{departmentToDelete?.code}</strong> ({departmentToDelete?.name})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {departmentToDelete && (departmentToDelete._count?.users > 0 || departmentToDelete._count?.sections > 0 || departmentToDelete._count?.rooms > 0) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <p className="font-medium text-yellow-800">Warning: This department has associated data:</p>
              <ul className="mt-2 list-disc list-inside text-yellow-700">
                {departmentToDelete._count?.users > 0 && <li>{departmentToDelete._count.users} user(s)</li>}
                {departmentToDelete._count?.sections > 0 && <li>{departmentToDelete._count.sections} section(s)</li>}
                {departmentToDelete._count?.rooms > 0 && <li>{departmentToDelete._count.rooms} room(s)</li>}
              </ul>
              <p className="mt-2 text-yellow-700">You must remove these first before deleting the department.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
