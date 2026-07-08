import { AllocationType } from "@prisma/client";

// ==================== TIMETABLE TYPES ====================

export interface AllocationCell {
  id: string;
  day: number;
  slot: number;
  roomId: string;
  roomName: string;
  roomActualName: string;
  sectionId: string | null;
  sectionLabel: string | null;
  subjectName: string | null;
  allocationType: AllocationType;
  isModified: boolean;
  isPendingApproval: boolean;
  departmentCode: string | null;
}

export interface RoomTimetable {
  roomId: string;
  logicalName: string;
  actualName: string;
  type: "CLASSROOM" | "LAB";
  allocations: AllocationCell[][];  // [day][slot]
  statistics: {
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    utilizationPct: number;
  };
}

export interface SectionTimetable {
  sectionId: string;
  sectionLabel: string;
  semesterCode: string;
  departmentCode: string;
  allocations: AllocationCell[][];  // [day][slot]
  statistics: {
    targetClassHours: number;
    achievedClassHours: number;
    classGapHours: number;
    targetLabHours: number;
    achievedLabHours: number;
    labGapHours: number;
  };
}

// ==================== DASHBOARD TYPES ====================

export interface DepartmentStatistics {
  departmentId: string;
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
  pendingRequests: number;
  modificationsCount: number;
}

export interface RoomStatistics {
  roomId: string;
  logicalName: string;
  actualName: string;
  type: "CLASSROOM" | "LAB";
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  utilizationPct: number;
}

export interface OverviewStatistics {
  totalDepartments: number;
  totalSections: number;
  totalRooms: number;
  totalClassrooms: number;
  totalLabs: number;
  overallUtilization: number;
  pendingRequests: number;
  approvedToday: number;
  rejectedToday: number;
}

// ==================== REQUEST TYPES ====================

export interface SlotRequestWithDetails {
  id: string;
  day: number;
  slot: number;
  roomId: string;
  roomName: string;
  sectionId: string;
  sectionLabel: string;
  subjectName: string | null;
  allocationType: AllocationType;
  justification: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  requesterName: string;
  requesterDeptCode: string;
  requiredApprovals: number;
  receivedApprovals: number;
  createdAt: Date;
  resolvedAt: Date | null;
  approvals: ApprovalDetail[];
}

export interface ApprovalDetail {
  id: string;
  approverDeptCode: string;
  approverName: string | null;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  comments: string | null;
  decidedAt: Date | null;
}

// ==================== NAVIGATION TYPES ====================

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// ==================== COMPONENT PROPS TYPES ====================

export type TimetableMode = "view" | "edit";

export interface TimetableGridProps {
  data: AllocationCell[][];
  mode: TimetableMode;
  onCellClick?: (day: number, slot: number, cell: AllocationCell) => void;
  showModifications?: boolean;
  highlightFreeSlots?: boolean;
}

export interface SlotRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot: {
    day: number;
    slot: number;
    roomId: string;
    roomName: string;
  };
  onSubmit: (data: {
    sectionId: string;
    subjectName?: string;
    allocationType: AllocationType;
    justification?: string;
  }) => void;
}
