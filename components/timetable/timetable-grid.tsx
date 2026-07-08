"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { Coffee, UtensilsCrossed } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Allocation {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string;
  type: 'THEORY' | 'LAB';
  room?: string;
  section?: string;
  isModified?: boolean;
  isPending?: boolean;
  subjectId?: string;
  facultyIds?: string; // comma-separated faculty IDs
}

export interface TimetableGridProps {
  allocations: Allocation[];
  mode: 'view' | 'edit';
  onSlotClick?: (day: string, time: string) => void;
  onAllocationClick?: (allocation: Allocation) => void;
  showModifications?: boolean;
  highlightFreeSlots?: boolean;
  showRoomInfo?: boolean;
  semesterNum?: number; // 1-4: lunch after slot 5, 5-8: lunch after slot 6
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time slots with timing information (55 minutes each) in 12-hour format
// For semesters 1-4: Lunch after Slot 5
const TIME_SLOTS_SEM_1_4: { slot: string; start: string; end: string }[] = [
  { slot: 'Slot 1', start: '8:00 AM', end: '8:55 AM' },
  { slot: 'Slot 2', start: '8:55 AM', end: '9:50 AM' },
  { slot: 'Slot 3', start: '9:50 AM', end: '10:45 AM' },
  { slot: 'Slot 4', start: '11:15 AM', end: '12:10 PM' },
  { slot: 'Slot 5', start: '12:10 PM', end: '1:05 PM' },
  { slot: 'Slot 6', start: '2:00 PM', end: '2:55 PM' },
  { slot: 'Slot 7', start: '2:55 PM', end: '3:50 PM' },
  { slot: 'Slot 8', start: '3:50 PM', end: '4:45 PM' },
];

// For semesters 5-8: Lunch after Slot 6
const TIME_SLOTS_SEM_5_8: { slot: string; start: string; end: string }[] = [
  { slot: 'Slot 1', start: '8:00 AM', end: '8:55 AM' },
  { slot: 'Slot 2', start: '8:55 AM', end: '9:50 AM' },
  { slot: 'Slot 3', start: '9:50 AM', end: '10:45 AM' },
  { slot: 'Slot 4', start: '11:15 AM', end: '12:10 PM' },
  { slot: 'Slot 5', start: '12:10 PM', end: '1:05 PM' },
  { slot: 'Slot 6', start: '1:05 PM', end: '2:00 PM' },
  { slot: 'Slot 7', start: '2:55 PM', end: '3:50 PM' },
  { slot: 'Slot 8', start: '3:50 PM', end: '4:45 PM' },
];

// Define breaks - coffee is always after slot 3
const BREAKS_SEM_1_4: Record<string, { label: string; icon: 'coffee' | 'lunch'; time: string }> = {
  'Slot 3': { label: 'Coffee Break', icon: 'coffee', time: '10:45 - 11:15 AM' },
  'Slot 5': { label: 'Lunch Break', icon: 'lunch', time: '1:05 - 2:00 PM' },
};

const BREAKS_SEM_5_8: Record<string, { label: string; icon: 'coffee' | 'lunch'; time: string }> = {
  'Slot 3': { label: 'Coffee Break', icon: 'coffee', time: '10:45 - 11:15 AM' },
  'Slot 6': { label: 'Lunch Break', icon: 'lunch', time: '2:00 - 2:55 PM' },
};

export function TimetableGrid({
  allocations,
  mode,
  onSlotClick,
  onAllocationClick,
  showModifications = true,
  highlightFreeSlots = false,
  showRoomInfo = true,
  semesterNum = 5, // Default to 5-8 pattern
}: TimetableGridProps) {
  // Select time slots and breaks based on semester
  const isJuniorSemester = semesterNum >= 1 && semesterNum <= 4;
  const TIME_SLOTS = isJuniorSemester ? TIME_SLOTS_SEM_1_4 : TIME_SLOTS_SEM_5_8;
  const BREAKS = isJuniorSemester ? BREAKS_SEM_1_4 : BREAKS_SEM_5_8;

  // Create a lookup map for quick access
  const allocationMap = new Map<string, Allocation>();
  allocations.forEach(a => {
    const key = `${a.day}-${a.startTime}`;
    allocationMap.set(key, a);
  });

  const getCell = (day: string, time: string): Allocation | null => {
    return allocationMap.get(`${day}-${time}`) || null;
  };

  const getCellStyles = (cell: Allocation | null) => {
    if (!cell) {
      return highlightFreeSlots
        ? "bg-white border-dashed border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
        : "bg-gray-50";
    }

    // Pending approval takes priority - Orange
    if (cell.isPending) {
      return "bg-orange-100 border-l-4 border-orange-500 text-orange-900";
    }

    // Modified slot - Yellow
    if (cell.isModified && showModifications) {
      return "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900";
    }

    // By allocation type
    if (cell.type === 'THEORY') {
      // Green for Theory
      return "bg-green-100 border-l-4 border-green-600 text-green-900";
    } else if (cell.type === 'LAB') {
      // Blue for Lab
      return "bg-blue-100 border-l-4 border-blue-600 text-blue-900";
    }

    return "bg-gray-50";
  };

  const getAllocationIcon = (type: string) => {
    switch (type) {
      case "THEORY":
        return "📚";
      case "LAB":
        return "🔬";
      default:
        return "";
    }
  };

  const handleCellClick = (day: string, time: string, cell: Allocation | null) => {
    if (cell && onAllocationClick) {
      onAllocationClick(cell);
    } else if (!cell && onSlotClick) {
      onSlotClick(day, time);
    }
  };

  return (
    <TooltipProvider>
      <div className="overflow-auto timetable-scroll rounded-lg border bg-card">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 p-3 text-left text-sm font-semibold border-b border-r min-w-[100px]">
                Day / Time
              </th>
              {TIME_SLOTS.map((timeSlot) => (
                <Fragment key={timeSlot.slot}>
                  <th
                    className="p-2 text-center text-sm font-semibold border-b min-w-[100px]"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{timeSlot.slot}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {timeSlot.start} - {timeSlot.end}
                      </span>
                    </div>
                  </th>
                  {BREAKS[timeSlot.slot] && (
                    <th
                      key={`break-${timeSlot.slot}`}
                      className="p-2 text-center text-xs font-medium border-b bg-muted/30 min-w-[70px]"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        {BREAKS[timeSlot.slot].icon === 'coffee' ? (
                          <Coffee className="h-4 w-4 text-amber-600" />
                        ) : (
                          <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                        )}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {BREAKS[timeSlot.slot].label}
                        </span>
                        <span className="text-[9px] text-muted-foreground/70 whitespace-nowrap">
                          {BREAKS[timeSlot.slot].time}
                        </span>
                      </div>
                    </th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="hover:bg-muted/30 transition-colors">
                <td className="sticky left-0 z-10 bg-card p-3 text-sm font-medium border-b border-r">
                  {day}
                </td>
                {TIME_SLOTS.map((timeSlot) => {
                  const time = timeSlot.slot;
                  const cell = getCell(day, time);
                  const isClickable =
                    mode === "edit" || (!cell && highlightFreeSlots) || (cell && onAllocationClick);

                  return (
                    <Fragment key={`${day}-${time}`}>
                      <td className="p-1 border-b">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => isClickable && handleCellClick(day, time, cell)}
                              className={cn(
                                "rounded-md p-2 min-h-[70px] transition-all",
                                getCellStyles(cell),
                                isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
                              )}
                            >
                              {cell ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">
                                      {getAllocationIcon(cell.type)}
                                    </span>
                                    <span className="text-xs font-semibold truncate">
                                      {cell.subject}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {cell.faculty}
                                  </span>
                                  {showRoomInfo && cell.room && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      📍 {cell.room}
                                    </span>
                                  )}
                                  {cell.section && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      👥 {cell.section}
                                    </span>
                                  )}
                                  {cell.isModified && showModifications && (
                                    <span className="text-[10px] text-yellow-600 font-medium">
                                      📋 Requested
                                    </span>
                                  )}
                                  {cell.isPending && (
                                    <span className="text-[10px] text-orange-600 font-medium animate-pulse">
                                      ⏳ Pending
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-xs text-muted-foreground">
                                    {highlightFreeSlots ? "Click to request" : "—"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            {cell ? (
                              <div className="space-y-1">
                                <p className="font-semibold">{cell.subject}</p>
                                <p className="text-xs">Faculty: {cell.faculty}</p>
                                {cell.room && (
                                  <p className="text-xs text-muted-foreground">
                                    Room: {cell.room}
                                  </p>
                                )}
                                {cell.section && (
                                  <p className="text-xs text-muted-foreground">
                                    Section: {cell.section}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {day}, {timeSlot.start} - {timeSlot.end}
                                </p>
                                <p className="text-xs">
                                  Type: {cell.type === 'THEORY' ? '📚 Theory' : '🔬 Lab'}
                                </p>
                              </div>
                            ) : (
                              <p>Free Slot - {day}, {timeSlot.start} - {timeSlot.end}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {BREAKS[time] && (
                        <td
                          key={`break-${day}-${time}`}
                          className="p-1 border-b bg-muted/20"
                        >
                          <div className="flex items-center justify-center min-h-[70px]">
                            {BREAKS[time].icon === 'coffee' ? (
                              <Coffee className="h-5 w-5 text-amber-500/50" />
                            ) : (
                              <UtensilsCrossed className="h-5 w-5 text-orange-500/50" />
                            )}
                          </div>
                        </td>
                      )}
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
