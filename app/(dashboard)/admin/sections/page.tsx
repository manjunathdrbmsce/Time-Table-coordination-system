"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Loader2, Search, ChevronRight, Calendar, Filter, BookOpen, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";

interface Section {
  id: string;
  year: number;
  division: string;
  requiredTheoryHours: number;
  requiredLabHours: number;
  department: { id: string; code: string; name: string };
  semester: { id: string; name: string; isActive: boolean } | null;
  _count?: { allocations: number };
}

interface Department {
  id: string;
  code: string;
  name: string;
}

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterYear, setFilterYear] = useState<string>("ALL");

  useEffect(() => {
    fetchSections();
    fetchDepartments();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/admin/sections");
      if (res.ok) {
        const data = await res.json();
        setSections(data);
      }
    } catch (error) {
      toast.error("Failed to fetch sections");
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

  // Filter sections
  const filteredSections = sections.filter(section => {
    const searchString = `${section.department.code} Sem ${section.year} Sec ${section.division}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase()) ||
                          section.department.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === "ALL" || section.department.id === filterDept;
    const matchesYear = filterYear === "ALL" || section.year === parseInt(filterYear);
    return matchesSearch && matchesDept && matchesYear;
  });

  // Group by department for stats
  const sectionsByDept = departments.map(dept => ({
    ...dept,
    count: sections.filter(s => s.department.id === dept.id).length
  }));

  const years = [...new Set(sections.map(s => s.year))].sort();

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
          <h1 className="text-3xl font-bold tracking-tight">Section Timetables</h1>
          <p className="text-muted-foreground">View all section schedules across departments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(sections.map(s => s.department.id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Semesters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sections.filter(s => s.semester?.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sections.reduce((sum, s) => sum + (s._count?.allocations || 0), 0)}
            </div>
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
                  placeholder="Search sections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
              ))}
            </select>
            <select
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="ALL">All Semesters</option>
              {years.map((year) => (
                <option key={year} value={year}>Semester {year}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Section Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredSections.map((section) => {
          const totalRequired = section.requiredTheoryHours + section.requiredLabHours;
          const allocated = section._count?.allocations || 0;
          const fillRate = totalRequired > 0 ? Math.round((allocated / totalRequired) * 100) : 0;
          
          return (
            <Link key={section.id} href={`/admin/sections/${section.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {section.department.code} Sem {section.year} - Sec {section.division}
                    </CardTitle>
                    {section.semester?.isActive && (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    )}
                  </div>
                  <CardDescription>{section.department.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        Theory Hours
                      </span>
                      <span className="font-medium">{section.requiredTheoryHours}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <FlaskConical className="w-3 h-3" />
                        Lab Hours
                      </span>
                      <span className="font-medium">{section.requiredLabHours}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Schedule Fill</span>
                        <span className="font-medium">{fillRate}%</span>
                      </div>
                      <Progress value={fillRate} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>{allocated} slots allocated</span>
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
          );
        })}
      </div>

      {filteredSections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {sections.length === 0 ? "No sections found. Upload a timetable to create sections." : "No sections match your filters"}
            </p>
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
    </div>
  );
}
