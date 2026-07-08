"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { FreeSlotGrid, FreeSlotSummary } from "@/components/free-slots/free-slot-grid"
import { Calendar, Download, Search, Building2, LayoutGrid, List } from "lucide-react"
import { toast } from "react-hot-toast"

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

interface Building {
  id: string
  name: string
  code: string
}

interface SlotPeriod {
  label: string
  slots: string[]
  time: string
}

interface FreeSlotsData {
  rooms: RoomData[]
  buildings: Building[]
  slotPeriods: {
    morning: SlotPeriod
    midday: SlotPeriod
    afternoon: SlotPeriod
  }
  slotTimeMap?: Record<string, string>
  days: string[]
  session: { id: string; name: string }
}

export default function FreeSlotsPage() {
  const [buildingFilter, setBuildingFilter] = useState<string>("all")
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isExporting, setIsExporting] = useState(false)

  const { data, isLoading, error } = useQuery<FreeSlotsData>({
    queryKey: ['free-slots', buildingFilter, roomTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (buildingFilter && buildingFilter !== 'all') params.append('buildingId', buildingFilter)
      if (roomTypeFilter && roomTypeFilter !== 'all') params.append('roomType', roomTypeFilter)
      
      const res = await fetch(`/api/admin/free-slots?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch free slots')
      return res.json()
    },
  })

  // Filter rooms by search query
  const filteredRooms = data?.rooms.filter(room => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      room.room.name.toLowerCase().includes(query) ||
      room.room.code.toLowerCase().includes(query) ||
      room.room.building.toLowerCase().includes(query)
    )
  }) || []

  // Get selected room data
  const selectedRoomData = selectedRoom
    ? filteredRooms.find(r => r.room.id === selectedRoom)
    : null

  // Calculate totals
  const totalStats = filteredRooms.reduce(
    (acc, room) => ({
      totalFree: acc.totalFree + room.stats.freeSlots,
      totalOccupied: acc.totalOccupied + room.stats.occupiedSlots,
      morningFree: acc.morningFree + room.stats.morningFree,
      middayFree: acc.middayFree + room.stats.middayFree,
      afternoonFree: acc.afternoonFree + room.stats.afternoonFree,
    }),
    { totalFree: 0, totalOccupied: 0, morningFree: 0, middayFree: 0, afternoonFree: 0 }
  )

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (buildingFilter && buildingFilter !== 'all') params.append('buildingId', buildingFilter)
      if (roomTypeFilter && roomTypeFilter !== 'all') params.append('roomType', roomTypeFilter)
      
      const res = await fetch(`/api/admin/free-slots/export?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to export')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Free_Slots_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load free slots data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Free Slots Analysis
          </h1>
          <p className="text-muted-foreground">
            View and analyze room availability across time periods
            {data?.session && ` • ${data.session.name}`}
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-green-600">{totalStats.totalFree}</div>
            <div className="text-sm text-muted-foreground">Total Free Slots</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-600">{totalStats.totalOccupied}</div>
            <div className="text-sm text-muted-foreground">Occupied Slots</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-orange-600">{totalStats.morningFree}</div>
            <div className="text-sm text-muted-foreground">🌅 Morning Free</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-yellow-600">{totalStats.middayFree}</div>
            <div className="text-sm text-muted-foreground">☀️ Midday Free</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-purple-600">{totalStats.afternoonFree}</div>
            <div className="text-sm text-muted-foreground">🌆 Afternoon Free</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Search Rooms</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, building..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-48">
              <Label>Building</Label>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {data?.buildings.map(building => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label>Room Type</Label>
              <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CLASSROOM">Classroom</SelectItem>
                  <SelectItem value="LAB">Lab</SelectItem>
                  <SelectItem value="SEMINAR_HALL">Seminar Hall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label>Select Room</Label>
              <Select value={selectedRoom || "all"} onValueChange={(v) => setSelectedRoom(v === "all" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="View Details" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms (Summary)</SelectItem>
                  {filteredRooms.map(room => (
                    <SelectItem key={room.room.id} value={room.room.id}>
                      {room.room.name} ({room.stats.freeSlots} free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {selectedRoomData ? (
        <Card>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
            <CardDescription>
              Detailed slot availability for {selectedRoomData.room.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FreeSlotGrid
              roomData={selectedRoomData}
              days={data?.days || []}
              slotTimeMap={data?.slotTimeMap}
              slotPeriods={data?.slotPeriods || {
                morning: { label: 'Morning', slots: [], time: '' },
                midday: { label: 'Midday', slots: [], time: '' },
                afternoon: { label: 'Afternoon', slots: [], time: '' },
              }}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map(room => (
            <div
              key={room.room.id}
              className="cursor-pointer"
              onClick={() => setSelectedRoom(room.room.id)}
            >
              <FreeSlotSummary roomData={room} />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Room</th>
                    <th className="text-left p-2">Building</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-center p-2">🌅 Morning</th>
                    <th className="text-center p-2">☀️ Midday</th>
                    <th className="text-center p-2">🌆 Afternoon</th>
                    <th className="text-center p-2">Total Free</th>
                    <th className="text-center p-2">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => (
                    <tr
                      key={room.room.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedRoom(room.room.id)}
                    >
                      <td className="p-2 font-medium">{room.room.name}</td>
                      <td className="p-2 text-muted-foreground">{room.room.building}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          room.room.type === 'LAB' ? 'bg-blue-100 text-blue-700' :
                          room.room.type === 'SEMINAR_HALL' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {room.room.type}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          {room.stats.morningFree}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          {room.stats.middayFree}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {room.stats.afternoonFree}
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold text-green-600">
                        {room.stats.freeSlots}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                room.stats.utilization >= 80 ? 'bg-red-500' :
                                room.stats.utilization >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${room.stats.utilization}%` }}
                            />
                          </div>
                          <span className="text-sm">{room.stats.utilization}%</span>
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

      {filteredRooms.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No rooms found matching your criteria.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
