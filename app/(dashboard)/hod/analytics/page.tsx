"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  BookOpen,
  Building2,
  DoorOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  FlaskConical,
  Loader2,
  RefreshCw,
  PieChart as PieChartIcon,
  Percent,
  Target,
  Award,
  Download,
} from "lucide-react";
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
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";

// Vibrant color schemes
const COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  pink: "#ec4899",
  cyan: "#06b6d4",
  orange: "#f97316",
  teal: "#14b8a6",
};

const GRADIENT_CARDS = [
  "from-indigo-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
];

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];

interface AnalyticsData {
  department: {
    id: string;
    code: string;
    name: string;
  };
  activeSession: {
    id: string;
    name: string;
    academicYear: string;
    semesterType: string;
  };  overviewStats: {
    totalSections: number;
    totalRooms: number;
    totalSharedRooms: number;
    totalSubjects: number;
    totalFaculty: number;
    totalAllocations: number;
    totalMappings: number;
  };
  sectionAnalytics: {
    id: string;
    label: string;
    semester: string;
    year: number;
    division: string;
    studentCount: number;
    theoryAllocated: number;
    theoryRequired: number;
    labAllocated: number;
    labRequired: number;
    totalAllocated: number;
    totalRequired: number;
    completionRate: number;
    mappingsCount: number;
    modifiedSlots: number;
  }[];
  sectionSummary: {
    totalTheoryAllocated: number;
    totalTheoryRequired: number;
    totalLabAllocated: number;
    totalLabRequired: number;
    avgCompletionRate: number;
    highCompletion: number;
    mediumCompletion: number;
    lowCompletion: number;
  };
  roomAnalytics: {
    id: string;
    code: string;
    name: string;
    type: string;
    capacity: number;
    building: string;
    buildingCode: string;
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
    isShared: boolean;
    deptAllocations: number;
    overallUtilizationPct: number;
  }[];
  departmentRoomAnalytics: {
    id: string;
    code: string;
    name: string;
    type: string;
    capacity: number;
    building: string;
    buildingCode: string;
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
    isShared: boolean;
    deptAllocations: number;
    overallUtilizationPct: number;
  }[];
  sharedRoomAnalytics: {
    id: string;
    code: string;
    name: string;
    type: string;
    capacity: number;
    building: string;
    buildingCode: string;
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
    isShared: boolean;
    deptAllocations: number;
    overallUtilizationPct: number;
  }[];
  roomSummary: {
    totalDepartmentRooms: number;
    deptClassrooms: number;
    deptLabs: number;
    deptAvgUtilization: number;
    deptCapacity: number;
    totalSharedRooms: number;
    sharedClassrooms: number;
    sharedLabs: number;
    sharedAvgUtilization: number;
    sharedCapacity: number;
    totalClassrooms: number;
    totalLabs: number;
    avgUtilization: number;
    highUtilization: number;
    mediumUtilization: number;
    lowUtilization: number;
    totalCapacity: number;
  };
  subjectSummary: {
    theory: number;
    lab: number;
    tutorial: number;
    totalCredits: number;
    avgCredits: number;
    bySemester: { semester: number; count: number; theory: number; lab: number; tutorial: number }[];
  };
  facultyAnalytics: {
    id: string;
    name: string;
    initials: string;
    designation: string | null;
    mappingsCount: number;
    subjectsHandled: number;
    sectionsHandled: number;
  }[];
  facultySummary: {
    total: number;
    withMappings: number;
    withoutMappings: number;
    avgMappings: number;
    byDesignation: { designation: string; count: number }[];
  };
  allocationSummary: {
    total: number;
    theory: number;
    lab: number;
    modified: number;
    mapped: number;
    unmapped: number;
    mappingRate: number;
  };
  dayWiseAllocations: {
    day: string;
    total: number;
    theory: number;
    lab: number;
  }[];
  requestSummary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  semesterBreakdown: {
    semester: string;
    sections: number;
    students: number;
    allocations: number;
    mappings: number;
  }[];
}

export default function HODAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportingFullReport, setIsExportingFullReport] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hod/analytics");
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

  const handleFullReportExport = async () => {
    setIsExportingFullReport(true);
    try {
      const res = await fetch("/api/hod/reports/export");
      if (!res.ok) throw new Error("Failed to export report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HOD_Department_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Department report exported successfully");
    } catch (error) {
      toast.error("Failed to export department report");
    } finally {
      setIsExportingFullReport(false);
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
          <p className="mt-4 text-muted-foreground">Loading department analytics...</p>
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
  const completionPieData = [
    { name: "High (ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥80%)", value: data.sectionSummary.highCompletion, color: COLORS.success },
    { name: "Medium (50-80%)", value: data.sectionSummary.mediumCompletion, color: COLORS.warning },
    { name: "Low (<50%)", value: data.sectionSummary.lowCompletion, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const roomUtilizationPieData = [
    { name: "High (ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥80%)", value: data.roomSummary.highUtilization, color: COLORS.success },
    { name: "Medium (50-80%)", value: data.roomSummary.mediumUtilization, color: COLORS.warning },
    { name: "Low (<50%)", value: data.roomSummary.lowUtilization, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const subjectTypePieData = [
    { name: "Theory", value: data.subjectSummary.theory, color: COLORS.success },
    { name: "Lab", value: data.subjectSummary.lab, color: COLORS.info },
    { name: "Tutorial", value: data.subjectSummary.tutorial, color: COLORS.secondary },
  ].filter(d => d.value > 0);

  const allocationTypePieData = [
    { name: "Theory", value: data.allocationSummary.theory, color: COLORS.success },
    { name: "Lab", value: data.allocationSummary.lab, color: COLORS.info },
  ];

  const mappingStatusPieData = [
    { name: "Mapped", value: data.allocationSummary.mapped, color: COLORS.success },
    { name: "Unmapped", value: data.allocationSummary.unmapped, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const requestStatusPieData = [
    { name: "Approved", value: data.requestSummary.approved, color: COLORS.success },
    { name: "Pending", value: data.requestSummary.pending, color: COLORS.warning },
    { name: "Rejected", value: data.requestSummary.rejected, color: COLORS.danger },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Department Analytics
            </h1>
            <Badge variant="secondary" className="text-sm">
              {data.department.code}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{data.department.name} | {data.activeSession.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleFullReportExport} disabled={isExportingFullReport} className="gap-2">
            {isExportingFullReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Full Report
          </Button>
          <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats Cards - Colorful Gradient */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[0]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Sections</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalSections}</p>
              </div>
              <GraduationCap className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[1]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Rooms</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalRooms}</p>
              </div>
              <DoorOpen className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[2]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Subjects</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalSubjects}</p>
              </div>
              <BookOpen className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[3]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Faculty</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalFaculty}</p>
              </div>
              <Users className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[4]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Allocations</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalAllocations}</p>
              </div>
              <Calendar className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[5]} text-white border-0 shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Mappings</p>
                <p className="text-3xl font-bold">{data.overviewStats.totalMappings}</p>
              </div>
              <Activity className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Section Completion */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-12">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Section Completion
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Average across all sections
            </CardDescription>
          </CardHeader>
          <CardContent className="-mt-8">
            <Card className="shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56"
                      stroke="url(#completionGradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${data.sectionSummary.avgCompletionRate * 3.52} 352`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-3xl font-bold">{data.sectionSummary.avgCompletionRate}%</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">{data.sectionSummary.highCompletion}</div>
                    <div className="text-green-600">High</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <div className="font-bold text-yellow-600">{data.sectionSummary.mediumCompletion}</div>
                    <div className="text-yellow-600">Medium</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <div className="font-bold text-red-600">{data.sectionSummary.lowCompletion}</div>
                    <div className="text-red-600">Low</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Room Utilization */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white pb-12">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Room Utilization
            </CardTitle>
            <CardDescription className="text-blue-100">
              Average across all rooms
            </CardDescription>
          </CardHeader>
          <CardContent className="-mt-8">
            <Card className="shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56"
                      stroke="url(#roomGradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${data.roomSummary.avgUtilization * 3.52} 352`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="roomGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-3xl font-bold">{data.roomSummary.avgUtilization}%</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-indigo-50 rounded-lg flex items-center gap-2 justify-center">
                    <DoorOpen className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-indigo-600">{data.roomSummary.totalClassrooms} Class</span>
                  </div>
                  <div className="p-2 bg-cyan-50 rounded-lg flex items-center gap-2 justify-center">
                    <FlaskConical className="w-4 h-4 text-cyan-600" />
                    <span className="font-medium text-cyan-600">{data.roomSummary.totalLabs} Labs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Mapping Rate */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white pb-12">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Mapping Rate
            </CardTitle>
            <CardDescription className="text-purple-100">
              Subject-Faculty mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="-mt-8">
            <Card className="shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="64" cy="64" r="56"
                      stroke="url(#mappingGradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${data.allocationSummary.mappingRate * 3.52} 352`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="mappingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-3xl font-bold">{data.allocationSummary.mappingRate}%</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-600">{data.allocationSummary.mapped}</div>
                    <div className="text-green-600 text-xs">Mapped</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <div className="font-bold text-red-600">{data.allocationSummary.unmapped}</div>
                    <div className="text-red-600 text-xs">Unmapped</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="sections" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <Building2 className="w-4 h-4" />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="free-slots" className="gap-2">
            <Clock className="w-4 h-4" />
            Free Slots
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="faculty" className="gap-2">
            <Users className="w-4 h-4" />
            Faculty
          </TabsTrigger>
          <TabsTrigger value="allocations" className="gap-2">
            <Calendar className="w-4 h-4" />
            Allocations
          </TabsTrigger>
        </TabsList>

        {/* SECTIONS TAB */}
        <TabsContent value="sections" className="space-y-6">
          {/* Section Completion Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                Section-wise Completion
              </CardTitle>
              <CardDescription>Theory and lab allocation progress per section</CardDescription>
            </CardHeader>
            <CardContent>
              {data.sectionAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={data.sectionAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="theoryAllocated" name="Theory" stackId="a" fill={COLORS.success} />
                    <Bar yAxisId="left" dataKey="labAllocated" name="Lab" stackId="a" fill={COLORS.info} />
                    <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion %" stroke={COLORS.pink} strokeWidth={3} dot={{ fill: COLORS.pink }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No section data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Details Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Theory vs Lab Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Theory vs Lab Hours</CardTitle>
                <CardDescription>Overall allocation summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-green-500" />
                        Theory Hours
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.sectionSummary.totalTheoryAllocated} / {data.sectionSummary.totalTheoryRequired}
                      </span>
                    </div>
                    <Progress 
                      value={data.sectionSummary.totalTheoryRequired > 0 
                        ? (data.sectionSummary.totalTheoryAllocated / data.sectionSummary.totalTheoryRequired) * 100 
                        : 0} 
                      className="h-3"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-blue-500" />
                        Lab Hours
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {data.sectionSummary.totalLabAllocated} / {data.sectionSummary.totalLabRequired}
                      </span>
                    </div>
                    <Progress 
                      value={data.sectionSummary.totalLabRequired > 0 
                        ? (data.sectionSummary.totalLabAllocated / data.sectionSummary.totalLabRequired) * 100 
                        : 0} 
                      className="h-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Distribution</CardTitle>
                <CardDescription>Sections by completion rate</CardDescription>
              </CardHeader>
              <CardContent>
                {completionPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={completionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {completionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section Table */}
          <Card>
            <CardHeader>
              <CardTitle>Section Details</CardTitle>
              <CardDescription>Detailed breakdown of all sections</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {data.sectionAnalytics.map((section) => (
                    <div key={section.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{section.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {section.studentCount} students
                          </span>
                        </div>
                        <Badge 
                          variant={section.completionRate >= 80 ? "default" : section.completionRate >= 50 ? "secondary" : "destructive"}
                          className={section.completionRate >= 80 ? "bg-green-500" : ""}
                        >
                          {section.completionRate}% Complete
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Theory:</span>
                          <span className="ml-2 font-medium">{section.theoryAllocated}/{section.theoryRequired}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lab:</span>
                          <span className="ml-2 font-medium">{section.labAllocated}/{section.labRequired}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mappings:</span>
                          <span className="ml-2 font-medium">{section.mappingsCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Modified:</span>
                          <span className="ml-2 font-medium">{section.modifiedSlots}</span>
                        </div>
                      </div>
                      <Progress value={section.completionRate} className="h-2 mt-3" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROOMS TAB */}
        <TabsContent value="rooms" className="space-y-6">
          {/* Room Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Dept. Rooms</p>
                    <p className="text-3xl font-bold">{data.roomSummary.totalDepartmentRooms}</p>
                  </div>
                  <DoorOpen className="w-8 h-8 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Shared Rooms</p>
                    <p className="text-3xl font-bold">{data.roomSummary.totalSharedRooms}</p>
                  </div>
                  <Building2 className="w-8 h-8 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Dept. Utilization</p>
                    <p className="text-3xl font-bold">{data.roomSummary.deptAvgUtilization}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Shared Usage</p>
                    <p className="text-3xl font-bold">{data.roomSummary.sharedAvgUtilization}%</p>
                  </div>
                  <Percent className="w-8 h-8 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Rooms Section */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-blue-600" />
                Department Rooms
              </CardTitle>
              <CardDescription>Rooms owned by your department</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {data.departmentRoomAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, data.departmentRoomAnalytics.length * 45)}>
                  <BarChart data={data.departmentRoomAnalytics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="code" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const room = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border">
                              <p className="font-bold">{room.name}</p>
                              <p className="text-sm text-muted-foreground">{room.building}</p>
                              <div className="mt-2 space-y-1 text-sm">
                                <p>Type: <span className="font-medium">{room.type}</span></p>
                                <p>Capacity: <span className="font-medium">{room.capacity}</span></p>
                                <p>Utilization: <span className="font-bold text-blue-600">{room.utilizationPct}%</span></p>
                                <p>Slots: <span className="font-medium">{room.occupiedSlots}/{room.totalSlots}</span></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="utilizationPct" radius={[0, 4, 4, 0]}>
                      {data.departmentRoomAnalytics.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.utilizationPct >= 80 ? COLORS.success :
                            entry.utilizationPct >= 50 ? COLORS.warning :
                            COLORS.danger
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <DoorOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No department rooms assigned</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shared Rooms Section */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                Shared Rooms Used
                <Badge variant="secondary" className="ml-2">Cross-Department</Badge>
              </CardTitle>
              <CardDescription>
                Rooms shared across departments that your department is using
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {data.sharedRoomAnalytics.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(200, data.sharedRoomAnalytics.length * 50)}>
                    <BarChart data={data.sharedRoomAnalytics} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="code" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const room = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border">
                                <p className="font-bold">{room.name}</p>
                                <p className="text-sm text-muted-foreground">{room.building}</p>
                                <div className="mt-2 space-y-1 text-sm">
                                  <p>Type: <span className="font-medium">{room.type}</span></p>
                                  <p>Capacity: <span className="font-medium">{room.capacity}</span></p>
                                  <div className="border-t pt-2 mt-2">
                                    <p className="text-purple-600">Your Dept Usage: <span className="font-bold">{room.deptAllocations} slots ({room.utilizationPct}%)</span></p>
                                    <p className="text-gray-500">Overall Utilization: <span className="font-medium">{room.overallUtilizationPct}%</span></p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="utilizationPct" name="Your Dept Usage %" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Shared Rooms Detail List */}
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Detailed Breakdown</h4>
                    {data.sharedRoomAnalytics.map((room) => (
                      <div key={room.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">{room.code}</Badge>
                            <span className="font-medium">{room.name}</span>
                            <Badge variant="secondary" className="text-xs">{room.building}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={room.type === 'LAB' ? 'bg-cyan-500' : 'bg-blue-500'}>
                              {room.type}
                            </Badge>
                            <Badge variant="outline">{room.capacity} seats</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Your Dept Usage</p>
                            <div className="flex items-center gap-2">
                              <Progress value={room.utilizationPct} className="h-2 flex-1" />
                              <span className="text-sm font-bold text-purple-600">{room.utilizationPct}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{room.deptAllocations} slots used</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Overall Utilization</p>
                            <div className="flex items-center gap-2">
                              <Progress value={room.overallUtilizationPct} className="h-2 flex-1" />
                              <span className="text-sm font-medium">{room.overallUtilizationPct}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{room.freeSlots} slots available</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No shared rooms being used</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room Stats Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Department Room Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-blue-500" />
                  Department Room Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <DoorOpen className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                      <div className="text-lg font-bold text-blue-600">{data.roomSummary.deptClassrooms}</div>
                      <div className="text-xs text-blue-600">Classrooms</div>
                    </div>
                    <div className="p-3 bg-cyan-50 rounded-lg text-center">
                      <FlaskConical className="w-6 h-6 mx-auto text-cyan-500 mb-1" />
                      <div className="text-lg font-bold text-cyan-600">{data.roomSummary.deptLabs}</div>
                      <div className="text-xs text-cyan-600">Labs</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Capacity</span>
                      <span className="text-2xl font-bold text-indigo-600">{data.roomSummary.deptCapacity}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shared Room Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  Shared Room Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <DoorOpen className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                      <div className="text-lg font-bold text-purple-600">{data.roomSummary.sharedClassrooms}</div>
                      <div className="text-xs text-purple-600">Classrooms</div>
                    </div>
                    <div className="p-3 bg-pink-50 rounded-lg text-center">
                      <FlaskConical className="w-6 h-6 mx-auto text-pink-500 mb-1" />
                      <div className="text-lg font-bold text-pink-600">{data.roomSummary.sharedLabs}</div>
                      <div className="text-xs text-pink-600">Labs</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Capacity Used</span>
                      <span className="text-2xl font-bold text-purple-600">{data.roomSummary.sharedCapacity}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Room Utilization Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Distribution</CardTitle>
                <CardDescription>By utilization level (all rooms)</CardDescription>
              </CardHeader>
              <CardContent>
                {roomUtilizationPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={roomUtilizationPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name }) => name as string}
                        labelLine={false}
                      >
                        {roomUtilizationPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Combined Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Combined Summary</CardTitle>
                <CardDescription>All rooms overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Total Rooms (Dept + Shared)</span>
                    <span className="font-bold text-lg">{data.roomSummary.totalDepartmentRooms + data.roomSummary.totalSharedRooms}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">High Utilization (ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥80%)</span>
                    <span className="font-bold text-lg text-green-600">{data.roomSummary.highUtilization}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-yellow-700">Medium Utilization (50-80%)</span>
                    <span className="font-bold text-lg text-yellow-600">{data.roomSummary.mediumUtilization}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">Low Utilization (&lt;50%)</span>
                    <span className="font-bold text-lg text-red-600">{data.roomSummary.lowUtilization}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FREE SLOTS TAB */}
        <TabsContent value="free-slots" className="space-y-6">
          <FreeSlotsSection departmentId={data.department.id} />
        </TabsContent>

        {/* SUBJECTS TAB */}
        <TabsContent value="subjects" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Subject Types Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-purple-500" />
                  Subject Types
                </CardTitle>
                <CardDescription>Distribution by type</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectTypePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={subjectTypePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {subjectTypePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No subject data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Stats Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Overview</CardTitle>
                <CardDescription>Summary statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <BookOpen className="w-6 h-6 mx-auto text-green-500 mb-1" />
                      <div className="text-xl font-bold text-green-600">{data.subjectSummary.theory}</div>
                      <div className="text-xs text-green-600">Theory</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <FlaskConical className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                      <div className="text-xl font-bold text-blue-600">{data.subjectSummary.lab}</div>
                      <div className="text-xs text-blue-600">Lab</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <GraduationCap className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                      <div className="text-xl font-bold text-purple-600">{data.subjectSummary.tutorial}</div>
                      <div className="text-xs text-purple-600">Tutorial</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Credits</span>
                      <span className="text-2xl font-bold text-amber-600">{data.subjectSummary.totalCredits}</span>
                    </div>
                    <div className="text-xs text-amber-600 mt-1">Avg: {data.subjectSummary.avgCredits} credits/subject</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subjects by Semester */}
          <Card>
            <CardHeader>
              <CardTitle>Subjects by Semester</CardTitle>
              <CardDescription>Distribution across semesters</CardDescription>
            </CardHeader>
            <CardContent>
              {data.subjectSummary.bySemester.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.subjectSummary.bySemester}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="semester" tickFormatter={(v) => `Sem ${v}`} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelFormatter={(label) => `Semester ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="theory" name="Theory" stackId="a" fill={COLORS.success} />
                    <Bar dataKey="lab" name="Lab" stackId="a" fill={COLORS.info} />
                    <Bar dataKey="tutorial" name="Tutorial" stackId="a" fill={COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No subject data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FACULTY TAB */}
        <TabsContent value="faculty" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Faculty Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-500" />
                  Faculty Overview
                </CardTitle>
                <CardDescription>Mapping statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                      <div className="text-2xl font-bold text-green-600">{data.facultySummary.withMappings}</div>
                      <div className="text-sm text-green-600">With Mappings</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                      <div className="text-2xl font-bold text-red-600">{data.facultySummary.withoutMappings}</div>
                      <div className="text-sm text-red-600">Without Mappings</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Avg Mappings per Faculty</span>
                      <span className="text-2xl font-bold text-indigo-600">{data.facultySummary.avgMappings}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Faculty by Designation */}
            <Card>
              <CardHeader>
                <CardTitle>By Designation</CardTitle>
                <CardDescription>Faculty distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {data.facultySummary.byDesignation.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.facultySummary.byDesignation}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="designation"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {data.facultySummary.byDesignation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No designation data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Faculty by Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>Faculty Workload</CardTitle>
              <CardDescription>Top faculty by subject mappings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {data.facultyAnalytics.slice(0, 15).map((faculty, index) => (
                    <div key={faculty.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{faculty.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {faculty.initials} {faculty.designation && `ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ${faculty.designation}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{faculty.subjectsHandled} subjects</Badge>
                        <Badge variant="outline">{faculty.sectionsHandled} sections</Badge>
                        <Badge className="bg-indigo-500">{faculty.mappingsCount} mappings</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations" className="space-y-6">
          {/* Day-wise Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                Day-wise Allocations
              </CardTitle>
              <CardDescription>Distribution of classes across weekdays</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dayWiseAllocations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="theory" name="Theory" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lab" name="Lab" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Allocation Type Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Allocation Types</CardTitle>
                <CardDescription>Theory vs Lab</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={allocationTypePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationTypePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mapping Status */}
            <Card>
              <CardHeader>
                <CardTitle>Mapping Status</CardTitle>
                <CardDescription>Linked vs Unlinked</CardDescription>
              </CardHeader>
              <CardContent>
                {mappingStatusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={mappingStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {mappingStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slot Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Slot Requests</CardTitle>
                <CardDescription>Request status</CardDescription>
              </CardHeader>
              <CardContent>
                {requestStatusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={requestStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {requestStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No requests
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Allocation Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
              <CardContent className="p-4">
                <div className="text-white/80 text-sm">Total Allocations</div>
                <div className="text-3xl font-bold">{data.allocationSummary.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="text-white/80 text-sm">Theory Classes</div>
                <div className="text-3xl font-bold">{data.allocationSummary.theory}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0">
              <CardContent className="p-4">
                <div className="text-white/80 text-sm">Lab Sessions</div>
                <div className="text-3xl font-bold">{data.allocationSummary.lab}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
              <CardContent className="p-4">
                <div className="text-white/80 text-sm">Modified Slots</div>
                <div className="text-3xl font-bold">{data.allocationSummary.modified}</div>
              </CardContent>
            </Card>
          </div>

          {/* Semester Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Semester-wise Breakdown</CardTitle>
              <CardDescription>Sections, students, and allocations per semester</CardDescription>
            </CardHeader>
            <CardContent>
              {data.semesterBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.semesterBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="semester" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sections" name="Sections" fill={COLORS.primary} />
                    <Bar yAxisId="left" dataKey="allocations" name="Allocations" fill={COLORS.cyan} />
                    <Line yAxisId="right" type="monotone" dataKey="students" name="Students" stroke={COLORS.pink} strokeWidth={3} dot={{ fill: COLORS.pink }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No semester data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Free Slots Section Component
function FreeSlotsSection({ departmentId }: { departmentId: string }) {
  const [freeSlotsData, setFreeSlotsData] = useState<FreeSlotsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  interface SlotInfo {
    slot: string;
    isFree: boolean;
    occupiedBy?: string;
  }

  interface DaySlots {
    morning: SlotInfo[];
    midday: SlotInfo[];
    afternoon: SlotInfo[];
  }

  interface RoomData {
    room: {
      id: string;
      code: string;
      name: string;
      type: string;
      capacity: number;
      building: string;
      buildingCode: string;
      department: string;
      departmentCode: string;
    };
    stats: {
      totalSlots: number;
      freeSlots: number;
      occupiedSlots: number;
      utilization: number;
      morningFree: number;
      middayFree: number;
      afternoonFree: number;
    };
    slots: Record<string, DaySlots>;
  }

  interface SlotPeriod {
    label: string;
    slots: string[];
    time: string;
  }

  interface FreeSlotsData {
    rooms: RoomData[];
    slotPeriods: {
      morning: SlotPeriod;
      midday: SlotPeriod;
      afternoon: SlotPeriod;
    };
    days: string[];
  }

  useEffect(() => {
    fetchFreeSlots();
  }, [departmentId]);

  const fetchFreeSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/free-slots?departmentId=${departmentId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFreeSlotsData(data);
    } catch (error) {
      toast.error('Failed to load free slots data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/admin/free-slots/export?departmentId=${departmentId}`);
      if (!res.ok) throw new Error('Failed to export');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Free_Slots_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!freeSlotsData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Failed to load free slots data
        </CardContent>
      </Card>
    );
  }

  const selectedRoomData = selectedRoom
    ? freeSlotsData.rooms.find(r => r.room.id === selectedRoom)
    : null;

  // Calculate totals
  const totalStats = freeSlotsData.rooms.reduce(
    (acc, room) => ({
      totalFree: acc.totalFree + room.stats.freeSlots,
      totalOccupied: acc.totalOccupied + room.stats.occupiedSlots,
      morningFree: acc.morningFree + room.stats.morningFree,
      middayFree: acc.middayFree + room.stats.middayFree,
      afternoonFree: acc.afternoonFree + room.stats.afternoonFree,
    }),
    { totalFree: 0, totalOccupied: 0, morningFree: 0, middayFree: 0, afternoonFree: 0 }
  );

  const periods = ['morning', 'midday', 'afternoon'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Room Free Slots Analysis</h3>
          <p className="text-sm text-muted-foreground">
            View slot availability across department rooms by time period
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          Export Report
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{totalStats.totalFree}</div>
            <div className="text-sm text-muted-foreground">Total Free</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{totalStats.totalOccupied}</div>
            <div className="text-sm text-muted-foreground">Occupied</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{totalStats.morningFree}</div>
            <div className="text-sm text-muted-foreground">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â¦ Morning</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{totalStats.middayFree}</div>
            <div className="text-sm text-muted-foreground">ÃƒÂ¢Ã‹Å“Ã¢â€šÂ¬ÃƒÂ¯Ã‚Â¸Ã‚Â Midday</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{totalStats.afternoonFree}</div>
            <div className="text-sm text-muted-foreground">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â  Afternoon</div>
          </CardContent>
        </Card>
      </div>

      {/* Room Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Room for Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {freeSlotsData.rooms.map(room => (
              <Button
                key={room.room.id}
                variant={selectedRoom === room.room.id ? "default" : "outline"}
                className="justify-between h-auto py-2"
                onClick={() => setSelectedRoom(selectedRoom === room.room.id ? null : room.room.id)}
              >
                <span className="text-xs truncate">{room.room.name}</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {room.stats.freeSlots}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Room Details */}
      {selectedRoomData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedRoomData.room.name}</CardTitle>
                <CardDescription>
                  {selectedRoomData.room.building} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {selectedRoomData.room.type} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Capacity: {selectedRoomData.room.capacity}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{selectedRoomData.stats.freeSlots}</div>
                <div className="text-xs text-muted-foreground">Free Slots</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg">
                <div className="text-lg font-semibold text-orange-600">{selectedRoomData.stats.morningFree}</div>
                <div className="text-xs text-muted-foreground">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â¦ Morning</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-lg">
                <div className="text-lg font-semibold text-yellow-600">{selectedRoomData.stats.middayFree}</div>
                <div className="text-xs text-muted-foreground">ÃƒÂ¢Ã‹Å“Ã¢â€šÂ¬ÃƒÂ¯Ã‚Â¸Ã‚Â Midday</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">{selectedRoomData.stats.afternoonFree}</div>
                <div className="text-xs text-muted-foreground">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â  Afternoon</div>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span>Utilization</span>
                <span className={`font-medium ${
                  selectedRoomData.stats.utilization >= 80 ? "text-red-600" :
                  selectedRoomData.stats.utilization >= 50 ? "text-yellow-600" : "text-green-600"
                }`}>
                  {selectedRoomData.stats.utilization}%
                </span>
              </div>
              <Progress 
                value={selectedRoomData.stats.utilization} 
                className="h-2"
              />
            </div>

            {/* Slots Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-medium border bg-muted">Day</th>
                    {periods.map(period => (
                      <th
                        key={period}
                        className={`p-2 text-center font-medium border ${
                          period === 'morning' ? "bg-orange-100 dark:bg-orange-950/50" :
                          period === 'midday' ? "bg-yellow-100 dark:bg-yellow-950/50" :
                          "bg-purple-100 dark:bg-purple-950/50"
                        }`}
                      >
                        <div>{freeSlotsData.slotPeriods[period].label}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {freeSlotsData.slotPeriods[period].time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {freeSlotsData.days.map(day => (
                    <tr key={day}>
                      <td className="p-2 font-medium border bg-muted/50">{day}</td>
                      {periods.map(period => {
                        const periodSlots = selectedRoomData.slots[day]?.[period] || [];
                        return (
                          <td key={period} className="p-2 border">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {periodSlots.map((slotInfo, idx) => (
                                <div
                                  key={idx}
                                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-medium ${
                                    slotInfo.isFree
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                  }`}
                                  title={slotInfo.isFree ? `${slotInfo.slot} - Available` : `${slotInfo.slot} - ${slotInfo.occupiedBy || 'Occupied'}`}
                                >
                                  {slotInfo.isFree ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted-foreground justify-center pt-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-100 dark:bg-green-900/50 rounded flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-green-700 dark:text-green-300" />
                </div>
                <span>Free</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-900/50 rounded flex items-center justify-center">
                  <XCircle className="h-3 w-3 text-red-700 dark:text-red-300" />
                </div>
                <span>Occupied</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room List Summary */}
      {!selectedRoomData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Rooms Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Room</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-center p-2">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â¦ Morning</th>
                    <th className="text-center p-2">ÃƒÂ¢Ã‹Å“Ã¢â€šÂ¬ÃƒÂ¯Ã‚Â¸Ã‚Â Midday</th>
                    <th className="text-center p-2">ÃƒÂ°Ã…Â¸Ã…â€™Ã¢â‚¬Â  Afternoon</th>
                    <th className="text-center p-2">Total Free</th>
                    <th className="text-center p-2">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {freeSlotsData.rooms.map(room => (
                    <tr
                      key={room.room.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedRoom(room.room.id)}
                    >
                      <td className="p-2 font-medium">{room.room.name}</td>
                      <td className="p-2">
                        <Badge variant={room.room.type === 'LAB' ? 'default' : 'secondary'}>
                          {room.room.type}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                          {room.stats.morningFree}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                          {room.stats.middayFree}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                          {room.stats.afternoonFree}
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold text-green-600">
                        {room.stats.freeSlots}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                room.stats.utilization >= 80 ? 'bg-red-500' :
                                room.stats.utilization >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${room.stats.utilization}%` }}
                            />
                          </div>
                          <span className="text-xs">{room.stats.utilization}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
