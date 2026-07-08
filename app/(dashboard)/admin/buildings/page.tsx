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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, Trash2, Loader2, Home, Layers } from "lucide-react";
import toast from "react-hot-toast";

interface Building {
  id: string;
  name: string;
  code: string;
  address: string | null;
  floors: number;
  _count: {
    rooms: number;
  };
  createdAt: string;
}

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    floors: 1,
  });

  const fetchBuildings = async () => {
    try {
      const res = await fetch("/api/admin/buildings");
      if (res.ok) {
        setBuildings(await res.json());
      }
    } catch (error) {
      toast.error("Failed to fetch buildings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  const handleOpenDialog = (building?: Building) => {
    if (building) {
      setSelectedBuilding(building);
      setFormData({
        name: building.name,
        code: building.code,
        address: building.address || "",
        floors: building.floors,
      });
    } else {
      setSelectedBuilding(null);
      setFormData({ name: "", code: "", address: "", floors: 1 });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Name and code are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = selectedBuilding
        ? `/api/admin/buildings/${selectedBuilding.id}`
        : "/api/admin/buildings";
      
      const res = await fetch(url, {
        method: selectedBuilding ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedBuilding ? "Building updated" : "Building created");
        setDialogOpen(false);
        fetchBuildings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save building");
      }
    } catch (error) {
      toast.error("Failed to save building");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBuilding) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/buildings/${selectedBuilding.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Building deleted");
        setDeleteDialogOpen(false);
        setSelectedBuilding(null);
        fetchBuildings();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete building");
      }
    } catch (error) {
      toast.error("Failed to delete building");
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Buildings</h1>
          <p className="text-muted-foreground">
            Manage campus buildings and assign rooms to them
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Building
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buildings.reduce((sum, b) => sum + b._count.rooms, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Floors</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buildings.reduce((sum, b) => sum + b.floors, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buildings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Buildings</CardTitle>
          <CardDescription>
            Click on a building to edit or delete it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No buildings found</h3>
              <p className="text-muted-foreground">
                Start by adding your first building
              </p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Building
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Floors</TableHead>
                  <TableHead className="text-center">Rooms</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((building) => (
                  <TableRow key={building.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {building.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{building.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {building.address || "-"}
                    </TableCell>
                    <TableCell className="text-center">{building.floors}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={building._count.rooms > 0 ? "default" : "secondary"}>
                        {building._count.rooms}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(building)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedBuilding(building);
                            setDeleteDialogOpen(true);
                          }}
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
              {selectedBuilding ? "Edit Building" : "Add New Building"}
            </DialogTitle>
            <DialogDescription>
              {selectedBuilding
                ? "Update building information"
                : "Add a new building to organize rooms"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., PJ Block"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., PJ-BLOCK"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., Main Campus, Block A"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floors">Number of Floors</Label>
              <Input
                id="floors"
                type="number"
                min="1"
                max="50"
                value={formData.floors}
                onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedBuilding ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Building</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this building? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBuilding && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p><strong>Name:</strong> {selectedBuilding.name}</p>
              <p><strong>Code:</strong> {selectedBuilding.code}</p>
              <p><strong>Rooms:</strong> {selectedBuilding._count.rooms}</p>
              {selectedBuilding._count.rooms > 0 && (
                <p className="text-destructive text-sm">
                  ⚠️ This building has rooms assigned. Reassign them first.
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
              disabled={isSubmitting || (selectedBuilding?._count.rooms ?? 0) > 0}
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
