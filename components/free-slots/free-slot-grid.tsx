"use client"

import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SlotInfo {
  slot: string
  isFree: boolean
  occupiedBy?: string
}

interface DaySlots {
  morning: SlotInfo[]
  midday: SlotInfo[]
  afternoon: SlotInfo[]
}

interface RoomData {
  room: {
    id: string
    code: string
    name: string
    type: string
    capacity: number
    building: string
    buildingCode: string
    department: string
    departmentCode: string
  }
  stats: {
    totalSlots: number
    freeSlots: number
    occupiedSlots: number
    utilization: number
    morningFree: number
    middayFree: number
    afternoonFree: number
  }
  slots: Record<string, DaySlots>
}

interface SlotPeriod {
  label: string
  slots: string[]
  time: string
}

interface FreeSlotGridProps {
  roomData: RoomData
  days: string[]
  slotPeriods: {
    morning: SlotPeriod
    midday: SlotPeriod
    afternoon: SlotPeriod
  }
  slotTimeMap?: Record<string, string>
  compact?: boolean
}

export function FreeSlotGrid({ roomData, days, slotPeriods, slotTimeMap, compact = false }: FreeSlotGridProps) {
  const periods = ['morning', 'midday', 'afternoon'] as const

  return (
    <div className="space-y-4">
      {/* Room Header */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-lg">{roomData.room.name}</h3>
          <p className="text-sm text-muted-foreground">
            {roomData.room.building} • {roomData.room.type} • Capacity: {roomData.room.capacity}
            {roomData.room.department && ` • ${roomData.room.departmentCode}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">{roomData.stats.freeSlots}</div>
          <div className="text-xs text-muted-foreground">Free Slots</div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-lg">
          <div className="text-lg font-semibold text-orange-600">{roomData.stats.morningFree}</div>
          <div className="text-xs text-muted-foreground">Morning Free</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded-lg">
          <div className="text-lg font-semibold text-yellow-600">{roomData.stats.middayFree}</div>
          <div className="text-xs text-muted-foreground">Midday Free</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg">
          <div className="text-lg font-semibold text-purple-600">{roomData.stats.afternoonFree}</div>
          <div className="text-xs text-muted-foreground">Afternoon Free</div>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Utilization</span>
          <span className={cn(
            "font-medium",
            roomData.stats.utilization >= 80 ? "text-red-600" :
            roomData.stats.utilization >= 50 ? "text-yellow-600" : "text-green-600"
          )}>
            {roomData.stats.utilization}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              roomData.stats.utilization >= 80 ? "bg-red-500" :
              roomData.stats.utilization >= 50 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${roomData.stats.utilization}%` }}
          />
        </div>
      </div>

      {/* Slots Grid */}
      <TooltipProvider>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left font-medium border bg-muted">Day</th>
                {periods.map(period => (
                  <th
                    key={period}
                    className={cn(
                      "p-2 text-center font-medium border",
                      period === 'morning' ? "bg-orange-100 dark:bg-orange-950/50" :
                      period === 'midday' ? "bg-yellow-100 dark:bg-yellow-950/50" :
                      "bg-purple-100 dark:bg-purple-950/50"
                    )}
                  >
                    <div>{slotPeriods[period].label}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {slotPeriods[period].time}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day}>
                  <td className="p-2 font-medium border bg-muted/50">{day}</td>
                  {periods.map(period => {
                    const periodSlots = roomData.slots[day]?.[period] || []
                    return (
                      <td key={period} className="p-2 border">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {periodSlots.map((slotInfo, idx) => (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110",
                                    slotInfo.isFree
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                  )}
                                >
                                  {slotInfo.isFree ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <div className="font-medium">{slotTimeMap?.[slotInfo.slot] || slotInfo.slot}</div>
                                  {slotInfo.isFree ? (
                                    <div className="text-green-600">✓ Available</div>
                                  ) : (
                                    <div className="text-red-600">{slotInfo.occupiedBy || 'Occupied'}</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground justify-center pt-2">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/50 rounded flex items-center justify-center">
            <Check className="h-3 w-3 text-green-700 dark:text-green-300" />
          </div>
          <span>Free</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/50 rounded flex items-center justify-center">
            <X className="h-3 w-3 text-red-700 dark:text-red-300" />
          </div>
          <span>Occupied</span>
        </div>
      </div>
    </div>
  )
}

// Compact version for summary view
export function FreeSlotSummary({ roomData }: { roomData: RoomData }) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium">{roomData.room.name}</h4>
          <p className="text-xs text-muted-foreground">
            {roomData.room.building} • {roomData.room.type}
          </p>
        </div>
        <div className={cn(
          "text-xl font-bold",
          roomData.stats.freeSlots > 20 ? "text-green-600" :
          roomData.stats.freeSlots > 10 ? "text-yellow-600" : "text-red-600"
        )}>
          {roomData.stats.freeSlots}
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-700 dark:text-orange-300">
          🌅 {roomData.stats.morningFree}
        </span>
        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-300">
          ☀️ {roomData.stats.middayFree}
        </span>
        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-300">
          🌆 {roomData.stats.afternoonFree}
        </span>
      </div>
      <div className="mt-2">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full",
              roomData.stats.utilization >= 80 ? "bg-red-500" :
              roomData.stats.utilization >= 50 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${roomData.stats.utilization}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right mt-1">
          {roomData.stats.utilization}% utilized
        </div>
      </div>
    </div>
  )
}
