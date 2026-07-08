"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  DoorOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "border-l-primary",
    success: "border-l-slot-class",
    warning: "border-l-slot-modified",
    danger: "border-l-destructive",
  };

  return (
    <Card className={cn("border-l-4", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs mt-2",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value}% from last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HoursProgressProps {
  label: string;
  target: number;
  achieved: number;
  gap: number;
  type: "class" | "lab";
}

export function HoursProgress({
  label,
  target,
  achieved,
  gap,
  type,
}: HoursProgressProps) {
  const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;
  const isComplete = achieved >= target;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === "class" ? (
            <div className="w-2 h-2 rounded-full bg-slot-class" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slot-lab" />
          )}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {achieved} / {target} hrs
          </span>
          {isComplete ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : gap > 0 ? (
            <Badge variant="warning" className="text-xs">
              -{gap} hrs
            </Badge>
          ) : null}
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

interface DepartmentStatsCardProps {
  departmentCode: string;
  departmentName: string;
  totalSections: number;
  targetClassHours: number;
  achievedClassHours: number;
  classGapHours: number;
  targetLabHours: number;
  achievedLabHours: number;
  labGapHours: number;
  allocationPercent: number;
  pendingRequests?: number;
}

export function DepartmentStatsCard({
  departmentCode,
  departmentName,
  totalSections,
  targetClassHours,
  achievedClassHours,
  classGapHours,
  targetLabHours,
  achievedLabHours,
  labGapHours,
  allocationPercent,
  pendingRequests = 0,
}: DepartmentStatsCardProps) {
  const hasGaps = classGapHours > 0 || labGapHours > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{departmentCode}</CardTitle>
              <p className="text-xs text-muted-foreground">{departmentName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={allocationPercent >= 90 ? "success" : allocationPercent >= 70 ? "warning" : "destructive"}
            >
              {allocationPercent}% Allocated
            </Badge>
            {pendingRequests > 0 && (
              <Badge variant="pending" className="text-xs">
                {pendingRequests} pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Sections</span>
          <span className="font-semibold">{totalSections}</span>
        </div>

        <HoursProgress
          label="Class Hours"
          target={targetClassHours}
          achieved={achievedClassHours}
          gap={classGapHours}
          type="class"
        />

        <HoursProgress
          label="Lab Hours"
          target={targetLabHours}
          achieved={achievedLabHours}
          gap={labGapHours}
          type="lab"
        />

        {hasGaps && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-destructive">
              {classGapHours + labGapHours} hours shortfall
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RoomUtilizationCardProps {
  roomName: string;
  actualName: string;
  type: "CLASSROOM" | "LAB";
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  utilizationPct: number;
}

export function RoomUtilizationCard({
  roomName,
  actualName,
  type,
  totalSlots,
  occupiedSlots,
  freeSlots,
  utilizationPct,
}: RoomUtilizationCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DoorOpen
              className={cn(
                "w-4 h-4",
                type === "CLASSROOM" ? "text-slot-class" : "text-slot-lab"
              )}
            />
            <div>
              <p className="font-medium text-sm">{roomName}</p>
              <p className="text-xs text-muted-foreground">{actualName}</p>
            </div>
          </div>
          <Badge variant={type === "CLASSROOM" ? "success" : "info"}>
            {type === "CLASSROOM" ? "Class" : "Lab"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilization</span>
            <span>{utilizationPct}%</span>
          </div>
          <Progress value={utilizationPct} className="h-1.5" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1" />
              {occupiedSlots} / {totalSlots} slots
            </span>
            <span className="text-slot-class">{freeSlots} free</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
