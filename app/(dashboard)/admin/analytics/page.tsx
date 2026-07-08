"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  FlaskConical,
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";

interface AnalyticsData {
  classroomUtilization: {
    high: number;
    medium: number;
    low: number;
    veryLow: number;
    total: number;
    avgUtilization: number;
  };
  labUtilization: {
    high: number;
    medium: number;
    low: number;
    veryLow: number;
    total: number;
    avgUtilization: number;
  };
  roomUtilizationDetails: {
    name: string;
    type: string;
    utilization: number;
    occupied: number;
    total: number;
  }[];
  modificationAnalytics: {
    totalAllocations: number;
    modifiedAllocations: number;
    modificationPercentage: number;
  };
  requestAnalytics: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
  };
  subjectsByDepartment: {
    department: string;
    departmentName: string;
    total: number;
    theory: number;
    lab: number;
    tutorial: number;
  }[];
  facultyByDepartment: {
    department: string;
    departmentName: string;
    count: number;
  }[];
  mappingsByDepartment: {
    department: string;
    departmentName: string;
    mappings: number;
  }[];
  sectionsByDepartment: {
    department: string;
    departmentName: string;
    sections: number;
    subjectMappings: number;
    facultyMappings: number;
  }[];
  allocationsByDepartment: {
    department: string;
    departmentName: string;
    total: number;
    mapped: number;
    unmapped: number;
    mappingRate: number;
  }[];
  overallStats: {
    totalRooms: number;
    totalClassrooms: number;
    totalLabs: number;
    totalDepartments: number;
    totalSubjects: number;
    totalFaculty: number;
    totalSections: number;
    totalAllocations: number;
    totalMappings: number;
    totalBuildings: number;
  };
  buildingAnalytics: {
    id: string;
    code: string;
    name: string;
    floors: number;
    totalRooms: number;
    classrooms: number;
    labs: number;
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    avgUtilization: number;
    utilizationBreakdown: {
      high: number;
      medium: number;
      low: number;
      veryLow: number;
    };
  }[];
  buildingSummary: {
    totalBuildings: number;
    unassignedRooms: number;
    unassignedUtilization: number;
    highestUtilizationBuilding: {
      code: string;
      name: string;
      avgUtilization: number;
    } | null;
    lowestUtilizationBuilding: {
      code: string;
      name: string;
      avgUtilization: number;
    } | null;
  };
}

// Vibrant color palettes
const COLORS = {
  primary: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],
  success: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
  warning: ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"],
  danger: ["#ef4444", "#f87171", "#fca5a5", "#fecaca"],
  info: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
  gradient: ["#667eea", "#764ba2", "#f093fb", "#f5576c"],
};

const UTILIZATION_COLORS = {
  high: "#10b981",     // Green - 80%+
  medium: "#3b82f6",   // Blue - 60-80%
  low: "#f59e0b",      // Orange - 50-60%
  veryLow: "#ef4444",  // Red - <50%
};

const DEPARTMENT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", 
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"
];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to fetch analytics");
      }
    } catch (error) {
      toast.error("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="mt-4 text-lg">No analytics data available</p>
      </div>
    );
  }

  // Prepare chart data
  const classroomPieData = [
    { name: "80%+ Utilization", value: data.classroomUtilization.high, color: UTILIZATION_COLORS.high },
    { name: "60-80% Utilization", value: data.classroomUtilization.medium, color: UTILIZATION_COLORS.medium },
    { name: "50-60% Utilization", value: data.classroomUtilization.low, color: UTILIZATION_COLORS.low },
    { name: "<50% Utilization", value: data.classroomUtilization.veryLow, color: UTILIZATION_COLORS.veryLow },
  ].filter(d => d.value > 0);

  const labPieData = [
    { name: "80%+ Utilization", value: data.labUtilization.high, color: UTILIZATION_COLORS.high },
    { name: "60-80% Utilization", value: data.labUtilization.medium, color: UTILIZATION_COLORS.medium },
    { name: "50-60% Utilization", value: data.labUtilization.low, color: UTILIZATION_COLORS.low },
    { name: "<50% Utilization", value: data.labUtilization.veryLow, color: UTILIZATION_COLORS.veryLow },
  ].filter(d => d.value > 0);

  const requestPieData = [
    { name: "Approved", value: data.requestAnalytics.approved, color: "#10b981" },
    { name: "Rejected", value: data.requestAnalytics.rejected, color: "#ef4444" },
    { name: "Pending", value: data.requestAnalytics.pending, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const radialData = [
    {
      name: "Classroom",
      value: data.classroomUtilization.avgUtilization,
      fill: "#6366f1",
    },
    {
      name: "Lab",
      value: data.labUtilization.avgUtilization,
      fill: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Comprehensive insights into timetable coordination</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Total Rooms</p>
                <p className="text-3xl font-bold">{data.overallStats.totalRooms}</p>
              </div>
              <Building2 className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Departments</p>
                <p className="text-3xl font-bold">{data.overallStats.totalDepartments}</p>
              </div>
              <GraduationCap className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Subjects</p>
                <p className="text-3xl font-bold">{data.overallStats.totalSubjects}</p>
              </div>
              <BookOpen className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Faculty</p>
                <p className="text-3xl font-bold">{data.overallStats.totalFaculty}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm">Sections</p>
                <p className="text-3xl font-bold">{data.overallStats.totalSections}</p>
              </div>
              <Activity className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="utilization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="utilization" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Utilization
          </TabsTrigger>
          <TabsTrigger value="buildings" className="gap-2">
            <Building2 className="w-4 h-4" />
            Buildings
          </TabsTrigger>
          <TabsTrigger value="modifications" className="gap-2">
            <Activity className="w-4 h-4" />
            Modifications
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <PieChartIcon className="w-4 h-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">
            <Users className="w-4 h-4" />
            Mappings
          </TabsTrigger>
        </TabsList>

        {/* UTILIZATION TAB */}
        <TabsContent value="utilization" className="space-y-6">
          {/* Average Utilization Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white pb-8">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Classroom Utilization
                </CardTitle>
                <CardDescription className="text-indigo-100">
                  {data.classroomUtilization.total} classrooms tracked
                </CardDescription>
              </CardHeader>
              <CardContent className="-mt-6">
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                          <circle
                            cx="64" cy="64" r="56"
                            stroke="url(#classroomGradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${data.classroomUtilization.avgUtilization * 3.52} 352`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="classroomGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold">{data.classroomUtilization.avgUtilization}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium">80%+:</span>
                        <span className="ml-auto font-bold text-green-600">{data.classroomUtilization.high}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-medium">60-80%:</span>
                        <span className="ml-auto font-bold text-blue-600">{data.classroomUtilization.medium}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="font-medium">50-60%:</span>
                        <span className="ml-auto font-bold text-orange-600">{data.classroomUtilization.low}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">&lt;50%:</span>
                        <span className="ml-auto font-bold text-red-600">{data.classroomUtilization.veryLow}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white pb-8">
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Lab Utilization
                </CardTitle>
                <CardDescription className="text-cyan-100">
                  {data.labUtilization.total} labs tracked
                </CardDescription>
              </CardHeader>
              <CardContent className="-mt-6">
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                          <circle
                            cx="64" cy="64" r="56"
                            stroke="url(#labGradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${data.labUtilization.avgUtilization * 3.52} 352`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="labGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold">{data.labUtilization.avgUtilization}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium">80%+:</span>
                        <span className="ml-auto font-bold text-green-600">{data.labUtilization.high}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="font-medium">60-80%:</span>
                        <span className="ml-auto font-bold text-blue-600">{data.labUtilization.medium}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="font-medium">50-60%:</span>
                        <span className="ml-auto font-bold text-orange-600">{data.labUtilization.low}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">&lt;50%:</span>
                        <span className="ml-auto font-bold text-red-600">{data.labUtilization.veryLow}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          {/* Pie Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Classroom Distribution</CardTitle>
                <CardDescription>By utilization percentage</CardDescription>
              </CardHeader>
              <CardContent>
                {classroomPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={classroomPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {classroomPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} rooms`, 'Count']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No classroom data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lab Distribution</CardTitle>
                <CardDescription>By utilization percentage</CardDescription>
              </CardHeader>
              <CardContent>
                {labPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={labPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {labPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} labs`, 'Count']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No lab data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Room-wise Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Room-wise Utilization</CardTitle>
              <CardDescription>Top 15 rooms by utilization percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.roomUtilizationDetails.slice(0, 15)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Utilization']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="utilization" 
                    radius={[0, 4, 4, 0]}
                  >
                    {data.roomUtilizationDetails.slice(0, 15).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.utilization >= 80 ? UTILIZATION_COLORS.high :
                          entry.utilization >= 60 ? UTILIZATION_COLORS.medium :
                          entry.utilization >= 50 ? UTILIZATION_COLORS.low :
                          UTILIZATION_COLORS.veryLow
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BUILDINGS TAB */}
        <TabsContent value="buildings" className="space-y-6">
          {/* Building Summary Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-100 text-sm">Total Buildings</p>
                    <p className="text-3xl font-bold">{data.buildingSummary.totalBuildings}</p>
                  </div>
                  <Building2 className="w-10 h-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {data.buildingSummary.highestUtilizationBuilding && (
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <CardContent className="p-4">
                  <div>
                    <p className="text-green-100 text-sm">Highest Utilization</p>
                    <p className="text-xl font-bold">{data.buildingSummary.highestUtilizationBuilding.name}</p>
                    <p className="text-2xl font-bold">{data.buildingSummary.highestUtilizationBuilding.avgUtilization}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.buildingSummary.lowestUtilizationBuilding && (
              <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
                <CardContent className="p-4">
                  <div>
                    <p className="text-red-100 text-sm">Lowest Utilization</p>
                    <p className="text-xl font-bold">{data.buildingSummary.lowestUtilizationBuilding.name}</p>
                    <p className="text-2xl font-bold">{data.buildingSummary.lowestUtilizationBuilding.avgUtilization}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.buildingSummary.unassignedRooms > 0 && (
              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div>
                    <p className="text-amber-100 text-sm">Unassigned Rooms</p>
                    <p className="text-3xl font-bold">{data.buildingSummary.unassignedRooms}</p>
                    <p className="text-sm text-amber-100">Avg: {data.buildingSummary.unassignedUtilization}% util</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Building Utilization Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                Building-wise Utilization
              </CardTitle>
              <CardDescription>Average utilization percentage per building</CardDescription>
            </CardHeader>
            <CardContent>
              {data.buildingAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.buildingAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="code" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value, name) => {
                        if (name === 'avgUtilization') return [`${value}%`, 'Avg Utilization'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => {
                        const building = data.buildingAnalytics.find(b => b.code === label);
                        return building ? building.name : label;
                      }}
                    />
                    <Bar dataKey="avgUtilization" name="Avg Utilization" radius={[4, 4, 0, 0]}>
                      {data.buildingAnalytics.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.avgUtilization >= 80 ? UTILIZATION_COLORS.high :
                            entry.avgUtilization >= 60 ? UTILIZATION_COLORS.medium :
                            entry.avgUtilization >= 50 ? UTILIZATION_COLORS.low :
                            UTILIZATION_COLORS.veryLow
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No building data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Building Room Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Distribution by Building</CardTitle>
                <CardDescription>Classrooms vs Labs per building</CardDescription>
              </CardHeader>
              <CardContent>
                {data.buildingAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.buildingAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(label) => {
                          const building = data.buildingAnalytics.find(b => b.code === label);
                          return building ? building.name : label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="classrooms" name="Classrooms" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="labs" name="Labs" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No building data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slot Occupancy by Building</CardTitle>
                <CardDescription>Occupied vs Free slots per building</CardDescription>
              </CardHeader>
              <CardContent>
                {data.buildingAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.buildingAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="code" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(label) => {
                          const building = data.buildingAnalytics.find(b => b.code === label);
                          return building ? building.name : label;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="occupiedSlots" name="Occupied Slots" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="freeSlots" name="Free Slots" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No building data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Building Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Building Details</CardTitle>
              <CardDescription>Comprehensive overview of all buildings</CardDescription>
            </CardHeader>
            <CardContent>
              {data.buildingAnalytics.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {data.buildingAnalytics.map((building) => (
                      <Card key={building.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-100 rounded-lg">
                                <Building2 className="w-6 h-6 text-slate-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{building.name}</h3>
                                <p className="text-sm text-muted-foreground">Code: {building.code} • {building.floors} floor(s)</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                              <Badge variant="outline" className="gap-1">
                                <Building2 className="w-3 h-3" />
                                {building.totalRooms} rooms
                              </Badge>
                              <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-700">
                                {building.classrooms} classrooms
                              </Badge>
                              <Badge variant="secondary" className="gap-1 bg-cyan-100 text-cyan-700">
                                <FlaskConical className="w-3 h-3" />
                                {building.labs} labs
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Avg Utilization</p>
                                <p className={`text-2xl font-bold ${
                                  building.avgUtilization >= 80 ? 'text-green-600' :
                                  building.avgUtilization >= 60 ? 'text-blue-600' :
                                  building.avgUtilization >= 50 ? 'text-orange-600' :
                                  'text-red-600'
                                }`}>
                                  {building.avgUtilization}%
                                </p>
                              </div>
                              <div className="w-24">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      building.avgUtilization >= 80 ? 'bg-green-500' :
                                      building.avgUtilization >= 60 ? 'bg-blue-500' :
                                      building.avgUtilization >= 50 ? 'bg-orange-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${building.avgUtilization}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>{building.occupiedSlots} used</span>
                                  <span>{building.freeSlots} free</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Utilization Breakdown */}
                          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                            <div className="flex items-center gap-1 p-2 bg-green-50 rounded">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>80%+: {building.utilizationBreakdown.high}</span>
                            </div>
                            <div className="flex items-center gap-1 p-2 bg-blue-50 rounded">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>60-80%: {building.utilizationBreakdown.medium}</span>
                            </div>
                            <div className="flex items-center gap-1 p-2 bg-orange-50 rounded">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span>50-60%: {building.utilizationBreakdown.low}</span>
                            </div>
                            <div className="flex items-center gap-1 p-2 bg-red-50 rounded">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span>&lt;50%: {building.utilizationBreakdown.veryLow}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No buildings registered in the system
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MODIFICATIONS TAB */}
        <TabsContent value="modifications" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Allocations</p>
                    <p className="text-4xl font-bold text-blue-700">{data.modificationAnalytics.totalAllocations}</p>
                  </div>
                  <div className="p-4 bg-blue-100 rounded-full">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-600 text-sm font-medium">Modified/Requested Slots</p>
                    <p className="text-4xl font-bold text-amber-700">{data.modificationAnalytics.modifiedAllocations}</p>
                  </div>
                  <div className="p-4 bg-amber-100 rounded-full">
                    <Activity className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Modification Rate</p>
                    <p className="text-4xl font-bold text-purple-700">{data.modificationAnalytics.modificationPercentage}%</p>
                  </div>
                  <div className="p-4 bg-purple-100 rounded-full">
                    {data.modificationAnalytics.modificationPercentage > 20 ? (
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-purple-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Analytics */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Slot Request Status</CardTitle>
                <CardDescription>Distribution of slot requests by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{data.requestAnalytics.approved}</p>
                    <p className="text-sm text-green-600">Approved</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{data.requestAnalytics.rejected}</p>
                    <p className="text-sm text-red-600">Rejected</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-600">{data.requestAnalytics.pending}</p>
                    <p className="text-sm text-amber-600">Pending</p>
                  </div>
                </div>
                {requestPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={requestPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={true}
                      >
                        {requestPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No slot requests yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rate</CardTitle>
                <CardDescription>Percentage of requests approved</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-full py-8">
                  <div className="relative">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle cx="96" cy="96" r="80" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                      <circle
                        cx="96" cy="96" r="80"
                        stroke="url(#approvalGradient)"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${data.requestAnalytics.approvalRate * 5.02} 502`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="approvalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-green-600">{data.requestAnalytics.approvalRate}%</span>
                      <span className="text-muted-foreground text-sm">Approval Rate</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <p className="text-muted-foreground">
                    {data.requestAnalytics.approved} out of {data.requestAnalytics.total} requests approved
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-6">
          {/* Subjects by Department */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Subjects by Department
              </CardTitle>
              <CardDescription>Distribution of theory, lab, and tutorial subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {data.subjectsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.subjectsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => {
                        const dept = data.subjectsByDepartment.find(d => d.department === label);
                        return dept ? dept.departmentName : label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="theory" name="Theory" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="lab" name="Lab" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tutorial" name="Tutorial" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No subjects data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Faculty by Department */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Faculty by Department
              </CardTitle>
              <CardDescription>Number of faculty members per department</CardDescription>
            </CardHeader>
            <CardContent>
              {data.facultyByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.facultyByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => {
                        const dept = data.facultyByDepartment.find(d => d.department === label);
                        return dept ? dept.departmentName : label;
                      }}
                    />
                    <Bar dataKey="count" name="Faculty Count" radius={[4, 4, 0, 0]}>
                      {data.facultyByDepartment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No faculty data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allocations by Department - Mapping Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
                Allocation Mapping by Department
              </CardTitle>
              <CardDescription>Mapped vs unmapped allocations per department</CardDescription>
            </CardHeader>
            <CardContent>
              {data.allocationsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={data.allocationsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="department" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => {
                        const dept = data.allocationsByDepartment.find(d => d.department === label);
                        return dept ? dept.departmentName : label;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="mapped" name="Mapped" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar yAxisId="left" dataKey="unmapped" name="Unmapped" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="mappingRate" name="Mapping Rate %" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No allocation data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAPPINGS TAB */}
        <TabsContent value="mappings" className="space-y-6">
          {/* Section-wise Subject Mappings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-pink-500" />
                Section-wise Mappings by Department
              </CardTitle>
              <CardDescription>Sections, subject mappings, and faculty mappings per department</CardDescription>
            </CardHeader>
            <CardContent>
              {data.sectionsByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.sectionsByDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => {
                        const dept = data.sectionsByDepartment.find(d => d.department === label);
                        return dept ? dept.departmentName : label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sections" name="Sections" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="subjectMappings" name="Subject Mappings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="facultyMappings" name="Faculty Mappings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No section data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Faculty Mappings Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Faculty Mappings Distribution</CardTitle>
                <CardDescription>Faculty-subject mappings by department</CardDescription>
              </CardHeader>
              <CardContent>
                {data.mappingsByDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.mappingsByDepartment}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="mappings"
                        nameKey="department"
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {data.mappingsByDepartment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} mappings`, 'Count']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No mappings data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Mapping Summary</CardTitle>
                <CardDescription>Overall mapping statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-indigo-900">Total Faculty Mappings</p>
                          <p className="text-sm text-indigo-600">Across all departments</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-indigo-600">{data.overallStats.totalMappings}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 rounded-lg">
                          <BookOpen className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-pink-900">Total Subjects</p>
                          <p className="text-sm text-pink-600">Available for mapping</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-pink-600">{data.overallStats.totalSubjects}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-teal-900">Total Sections</p>
                          <p className="text-sm text-teal-600">With timetables</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-teal-600">{data.overallStats.totalSections}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Activity className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-900">Total Allocations</p>
                          <p className="text-sm text-amber-600">Scheduled slots</p>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-amber-600">{data.overallStats.totalAllocations}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
