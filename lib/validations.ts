import { z } from "zod";

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["ADMIN", "COORDINATOR", "HOD"]),
  departmentId: z.string().optional().nullable(),
});

// ==================== DEPARTMENT SCHEMAS ====================

export const departmentSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(10, "Code must be at most 10 characters")
    .toUpperCase(),
  name: z.string().min(3, "Name must be at least 3 characters"),
});

// ==================== ROOM SCHEMAS ====================

export const roomSchema = z.object({
  logicalName: z.string().min(1, "Logical name is required"),
  actualName: z.string().min(1, "Actual name is required"),
  type: z.enum(["CLASSROOM", "LAB"]),
  capacity: z.number().optional().nullable(),
  building: z.string().optional().nullable(),
});

// ==================== SLOT REQUEST SCHEMAS ====================

export const slotRequestSchema = z.object({
  day: z.number().min(1).max(5),
  slot: z.number().min(1).max(8),
  roomId: z.string().cuid(),
  sectionId: z.string().cuid(),
  subjectName: z.string().optional(),
  allocationType: z.enum(["CLASS", "LAB", "TUTORIAL"]),
  justification: z.string().optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().optional(),
});

// ==================== ALLOCATION SCHEMAS ====================

export const updateAllocationSchema = z.object({
  sectionId: z.string().cuid().optional().nullable(),
  subjectName: z.string().optional().nullable(),
  allocationType: z.enum(["CLASS", "LAB", "TUTORIAL", "FREE"]),
});

// ==================== UPLOAD SCHEMAS ====================

export const uploadSchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, "Format: 2024-25"),
  semester: z.enum(["ODD", "EVEN"]),
});

// ==================== TYPE EXPORTS ====================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type SlotRequestInput = z.infer<typeof slotRequestSchema>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
