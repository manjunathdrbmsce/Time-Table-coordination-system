"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Clock, BookOpen, FlaskConical, RefreshCw, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Semester {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Configuration {
  departmentId: string;
  semesterId: string;
  requiredTheoryHours: number;
  requiredLabHours: number;
  sectionCount: number;
  totalAllocations: number;
}

export default function SectionHoursPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [theoryHours, setTheoryHours] = useState<number>(25);
  const [labHours, setLabHours] = useState<number>(15);

  // Inline edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editTheoryHours, setEditTheoryHours] = useState<number>(0);
  const [editLabHours, setEditLabHours] = useState<number>(0);
  const [savingRow, setSavingRow] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/section-hours");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        setSemesters(data.semesters);
        setConfigurations(data.configurations);
      } else {
        toast.error("Failed to fetch configuration data");
      }
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update form when selection changes
  useEffect(() => {
    if (selectedDepartment && selectedSemester) {
      const existing = configurations.find(
        c => c.departmentId === selectedDepartment && c.semesterId === selectedSemester
      );
      if (existing) {
        setTheoryHours(existing.requiredTheoryHours);
        setLabHours(existing.requiredLabHours);
      } else {
        setTheoryHours(25);
        setLabHours(15);
      }
    }
  }, [selectedDepartment, selectedSemester, configurations]);

  const handleSave = async () => {
    if (!selectedDepartment || !selectedSemester) {
      toast.error("Please select both department and semester");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/section-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: selectedDepartment,
          semesterId: selectedSemester,
          requiredTheoryHours: theoryHours,
          requiredLabHours: labHours,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchData(); // Refresh the table
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update");
      }
    } catch (error) {
      toast.error("Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find(d => d.id === id);
    return dept ? `${dept.code} - ${dept.name}` : id;
  };

  const getSemesterName = (id: string) => {
    const sem = semesters.find(s => s.id === id);
    return sem ? sem.name : id;
  };

  const getUtilization = (config: Configuration) => {
    const totalRequired = (config.requiredTheoryHours + config.requiredLabHours) * config.sectionCount;
    if (totalRequired === 0) return 0;
    return Math.round((config.totalAllocations / totalRequired) * 100);
  };

  const getUtilizationBadge = (percentage: number) => {
    if (percentage >= 90) {
      return <Badge className="bg-green-500">✓ {percentage}%</Badge>;
    } else if (percentage >= 60) {
      return <Badge className="bg-yellow-500">{percentage}%</Badge>;
    } else {
      return <Badge className="bg-red-500">{percentage}%</Badge>;
    }
  };

  const startEditing = (config: Configuration) => {
    const key = `${config.departmentId}-${config.semesterId}`;
    setEditingRow(key);
    setEditTheoryHours(config.requiredTheoryHours);
    setEditLabHours(config.requiredLabHours);
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditTheoryHours(0);
    setEditLabHours(0);
  };

  const saveRowEdit = async (config: Configuration) => {
    setSavingRow(true);
    try {
      const res = await fetch("/api/admin/section-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: config.departmentId,
          semesterId: config.semesterId,
          requiredTheoryHours: editTheoryHours,
          requiredLabHours: editLabHours,
        }),
      });

      if (res.ok) {
        toast.success("Hours updated successfully");
        setEditingRow(null);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update");
      }
    } catch (error) {
      toast.error("Error saving configuration");
    } finally {
      setSavingRow(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Section Hours Configuration</h1>
          <p className="text-muted-foreground">
            Configure required theory and lab hours per department and semester
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchData()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Set Required Hours
          </CardTitle>
          <CardDescription>
            Select department and semester to configure required hours for all sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {/* Department Select */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.code} - {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester Select */}
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id}>
                      {sem.name} {sem.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theory Hours Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                Theory Hours/Week
              </Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={theoryHours}
                onChange={(e) => setTheoryHours(parseInt(e.target.value) || 0)}
                placeholder="25"
              />
            </div>

            {/* Lab Hours Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <FlaskConical className="w-4 h-4" />
                Lab Hours/Week
              </Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={labHours}
                onChange={(e) => setLabHours(parseInt(e.target.value) || 0)}
                placeholder="15"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-end">
              <Button
                onClick={handleSave}
                disabled={!selectedDepartment || !selectedSemester || saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Apply to All Sections
              </Button>
            </div>
          </div>

          {selectedDepartment && selectedSemester && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will update <strong>all sections</strong> in{" "}
                <strong>{departments.find(d => d.id === selectedDepartment)?.code}</strong> for{" "}
                <strong>{semesters.find(s => s.id === selectedSemester)?.name}</strong> to have{" "}
                <strong>{theoryHours}</strong> theory hours and{" "}
                <strong>{labHours}</strong> lab hours per week.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>
            View configured hours for each department and semester combination
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sections found. Create sections first to configure hours.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-center">Sections</TableHead>
                  <TableHead className="text-center">Theory Hours</TableHead>
                  <TableHead className="text-center">Lab Hours</TableHead>
                  <TableHead className="text-center">Total Required</TableHead>
                  <TableHead className="text-center">Allocated</TableHead>
                  <TableHead className="text-center">Utilization</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configurations.map((config, index) => {
                  const totalRequired = (config.requiredTheoryHours + config.requiredLabHours) * config.sectionCount;
                  const utilization = getUtilization(config);
                  const rowKey = `${config.departmentId}-${config.semesterId}`;
                  const isEditing = editingRow === rowKey;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {getDepartmentName(config.departmentId)}
                      </TableCell>
                      <TableCell>{getSemesterName(config.semesterId)}</TableCell>
                      <TableCell className="text-center">{config.sectionCount}</TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            value={editTheoryHours}
                            onChange={(e) => setEditTheoryHours(parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-center mx-auto"
                          />
                        ) : (
                          <Badge variant="outline" className="bg-green-50">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {config.requiredTheoryHours}h
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            value={editLabHours}
                            onChange={(e) => setEditLabHours(parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-center mx-auto"
                          />
                        ) : (
                          <Badge variant="outline" className="bg-blue-50">
                            <FlaskConical className="w-3 h-3 mr-1" />
                            {config.requiredLabHours}h
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing 
                          ? `${(editTheoryHours + editLabHours) * config.sectionCount}h`
                          : `${totalRequired}h`
                        }
                      </TableCell>
                      <TableCell className="text-center">{config.totalAllocations}h</TableCell>
                      <TableCell className="text-center">
                        {getUtilizationBadge(utilization)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => saveRowEdit(config)}
                              disabled={savingRow}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              {savingRow ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={savingRow}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(config)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Color Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500">≥90%</Badge>
          <span>On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-500">60-89%</Badge>
          <span>Needs Attention</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500">&lt;60%</Badge>
          <span>Critical Gap</span>
        </div>
      </div>
    </div>
  );
}
