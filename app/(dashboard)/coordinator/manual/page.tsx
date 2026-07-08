"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  GraduationCap,
  DoorOpen,
  Users,
  Link2,
  ClipboardCheck,
  Bell,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  MousePointerClick,
  Eye,
  Edit,
  Download,
  RefreshCw,
  ArrowLeftRight,
  Play,
  Home,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  Star,
  Keyboard,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
  icon?: React.ReactNode;
  tips?: string[];
  example?: {
    scenario: string;
    steps: string[];
    result: string;
  };
}

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: Step[];
  keyFeatures?: string[];
}

const modules: Module[] = [
  {
    id: "dashboard",
    title: "Dashboard Overview",
    description: "Your central command center for quick insights and navigation",
    icon: <Home className="w-5 h-5" />,
    color: "from-violet-500 to-purple-600",
    keyFeatures: [
      "Quick stats for sections, rooms, and pending requests",
      "Progress tracking for theory and lab hours",
      "Quick links to all major sections",
      "Real-time status of your requests",
    ],
    steps: [
      {
        title: "Understanding Your Dashboard",
        description: "When you log in, the dashboard shows you an overview of your department's timetable status. You'll see the number of sections you manage, rooms available, pending requests you've made, and any incoming approvals waiting for your action.",
        icon: <Eye className="w-4 h-4" />,
        tips: [
          "The progress bar shows how much of required hours are allocated",
          "Click on any stat card to navigate to that section",
        ],
        example: {
          scenario: "You're the CSE department coordinator and just logged in on Monday morning.",
          steps: [
            "You see '12 Sections' - these are all CSE sections you manage",
            "You see '8 Rooms' - classrooms and labs assigned to CSE",
            "You notice '2 My Pending' - you have 2 slot requests waiting for other coordinators",
            "You see '3 Approvals' - 3 requests from other departments need your review",
          ],
          result: "You quickly know there are 3 urgent approvals to handle and can click directly to review them.",
        },
      },
      {
        title: "Navigating the Sidebar",
        description: "The left sidebar contains all the main sections. Click on any menu item to navigate. The current page is highlighted for easy reference.",
        icon: <MousePointerClick className="w-4 h-4" />,
        example: {
          scenario: "You need to check if a specific classroom is free on Wednesday Slot 4.",
          steps: [
            "Look at the sidebar on the left",
            "Click on 'Room Timetables'",
            "The page changes and 'Room Timetables' becomes highlighted",
          ],
          result: "You're now on the rooms page where you can search and view any room's schedule.",
        },
      },
    ],
  },
  {
    id: "sections",
    title: "Section Timetables",
    description: "View and manage timetables for all sections in your department",
    icon: <GraduationCap className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-600",
    keyFeatures: [
      "View all sections with their allocation status",
      "Interactive timetable grid with color coding",
      "Export timetables to Excel with one click",
      "Modify slots, exchange slots between sections",
    ],
    steps: [
      {
        title: "Viewing Section List",
        description: "Navigate to 'Section Timetables' from the sidebar. You'll see a list/grid of all sections in your department with their year, division, and allocation progress.",
        icon: <Eye className="w-4 h-4" />,
        tips: [
          "Use the search bar to quickly find a section",
          "Filter by year or semester if available",
        ],
        example: {
          scenario: "A faculty member asks about 3rd year B section's timetable.",
          steps: [
            "Go to 'Section Timetables' from sidebar",
            "Type '3B' in the search box",
            "The 3rd year B section card appears",
            "You can see it has 85% hours allocated",
          ],
          result: "You found the section quickly and know its allocation status at a glance.",
        },
      },
      {
        title: "Opening Section Timetable",
        description: "Click on any section card to view its detailed timetable. You'll see a weekly grid showing all 8 slots for each day (Monday to Friday).",
        icon: <Calendar className="w-4 h-4" />,
        example: {
          scenario: "You need to see what's scheduled for 2nd year A section on Thursday.",
          steps: [
            "Click on the '2A' section card",
            "The full weekly timetable opens",
            "Look at the 'Thursday' column",
            "You see Slot 1: Data Structures (Prof. Kumar), Slot 2: DBMS Lab, etc.",
          ],
          result: "You can see the complete Thursday schedule with subjects, faculty, and rooms.",
        },
      },
      {
        title: "Understanding the Timetable Grid",
        description: "The timetable shows slots in rows and days in columns. Each cell shows the subject, faculty, and room. Color coding helps identify slot types.",
        icon: <Eye className="w-4 h-4" />,
        tips: [
          "🟢 Green = Theory class",
          "🔵 Blue = Lab session",
          "⬜ Gray/White = Free slot",
          "🟡 Yellow = Modified slot",
          "🟠 Orange = Pending approval",
        ],
        example: {
          scenario: "You're looking at 1st year C section's timetable and see different colors.",
          steps: [
            "Green cells show theory classes like 'Engineering Mathematics'",
            "Blue cells (often spanning 2-3 slots) show lab sessions like 'Programming Lab'",
            "White/gray cells are free - no class scheduled",
            "A yellow cell means someone modified that slot recently",
          ],
          result: "You instantly understand the schedule pattern without reading every cell.",
        },
      },
      {
        title: "Modifying a Slot",
        description: "Click on any allocated slot to open the modification panel. You can change the subject, faculty, or room. Changes are saved immediately and marked as 'Modified'.",
        icon: <Edit className="w-4 h-4" />,
        tips: [
          "Only modify slots when necessary",
          "Modified slots are highlighted in yellow",
        ],
        example: {
          scenario: "Prof. Sharma is on leave, and you need to replace him with Prof. Verma for Monday Slot 3.",
          steps: [
            "Open the section's timetable",
            "Click on Monday Slot 3 (shows Prof. Sharma - Data Structures)",
            "A modification panel opens",
            "Change faculty from 'Prof. Sharma' to 'Prof. Verma' in the dropdown",
            "Click 'Save Changes'",
          ],
          result: "The slot now shows Prof. Verma, and the cell turns yellow indicating it was modified.",
        },
      },
      {
        title: "Exchange Slots Feature",
        description: "To swap slots between two sections: (1) Click 'Exchange Slots' button, (2) Select the first slot, (3) Select the second slot from same/different section, (4) Confirm the exchange. Both sections' timetables are updated automatically.",
        icon: <ArrowLeftRight className="w-4 h-4" />,
        tips: [
          "Useful for resolving faculty conflicts",
          "You can exchange slots within the same section or between different sections",
        ],
        example: {
          scenario: "Prof. Kumar teaches 2A on Monday Slot 2 and 2B on Monday Slot 2 (conflict!). You need to swap 2B's Monday Slot 2 with their Tuesday Slot 2.",
          steps: [
            "Open 2B section's timetable",
            "Click the 'Exchange Slots' button",
            "Click on Monday Slot 2 (it gets highlighted as 'Source')",
            "Click on Tuesday Slot 2 (it gets highlighted as 'Target')",
            "Review the exchange preview",
            "Click 'Confirm Exchange'",
          ],
          result: "Monday Slot 2 and Tuesday Slot 2 are swapped. Prof. Kumar no longer has a conflict - he teaches 2A on Monday Slot 2 and 2B on Tuesday Slot 2.",
        },
      },
      {
        title: "Exporting Timetable",
        description: "Click the 'Export' or 'Download' button to download the section's timetable as an Excel file. The export includes breaks (coffee break and lunch) based on the semester.",
        icon: <Download className="w-4 h-4" />,
        tips: [
          "Semesters 1-4: Lunch after Slot 5",
          "Semesters 5-8: Lunch after Slot 4",
        ],
        example: {
          scenario: "The HOD asks for a printout of all 2nd year timetables for the notice board.",
          steps: [
            "Open 2A section's timetable",
            "Click 'Export to Excel' button",
            "An Excel file downloads: 'CSE_2A_Timetable.xlsx'",
            "Repeat for 2B, 2C sections",
            "Open Excel files and print them",
          ],
          result: "You have professional-looking timetables with proper formatting, breaks, and all details ready for printing.",
        },
      },
    ],
  },
  {
    id: "rooms",
    title: "Room Timetables",
    description: "View room availability and manage room-based allocations",
    icon: <DoorOpen className="w-5 h-5" />,
    color: "from-emerald-500 to-green-600",
    keyFeatures: [
      "See all rooms with utilization percentage",
      "Check room availability before allocation",
      "View which sections are using a room",
      "Filter by room type (Classroom/Lab)",
    ],
    steps: [
      {
        title: "Viewing Room List",
        description: "Navigate to 'Room Timetables' to see all rooms assigned to your department. Each room card shows the room name, type, capacity, and utilization percentage.",
        icon: <Eye className="w-4 h-4" />,
        example: {
          scenario: "You need to find a lab with low utilization for an extra practical session.",
          steps: [
            "Go to 'Room Timetables'",
            "Look at room cards - each shows utilization like '65%' or '80%'",
            "Filter by 'Labs Only' if available",
            "You spot 'Lab 3' with only 45% utilization",
          ],
          result: "You found Lab 3 which has the most free slots available for scheduling.",
        },
      },
      {
        title: "Checking Room Schedule",
        description: "Click on a room to view its weekly schedule. You'll see which sections are using the room at each slot. Free slots are marked clearly.",
        icon: <Calendar className="w-4 h-4" />,
        example: {
          scenario: "You want to schedule an extra class in Room CR-5 on Friday. Is it free?",
          steps: [
            "Click on 'CR-5' room card",
            "The room's weekly timetable opens",
            "Look at Friday column",
            "Slot 1: 2A - Data Structures, Slot 2: FREE, Slot 3: 3B - Networks...",
            "You see Slots 2, 6, 7, 8 are free on Friday",
          ],
          result: "You know exactly which Friday slots are available in CR-5 and can schedule accordingly.",
        },
      },
      {
        title: "Understanding Utilization",
        description: "The utilization percentage shows how much of the room's capacity (40 slots/week) is being used. Higher utilization means the room is in high demand.",
        icon: <Clock className="w-4 h-4" />,
        example: {
          scenario: "Admin asks which rooms are underutilized and might be shared with other departments.",
          steps: [
            "View Room Timetables list",
            "Sort or scan for low utilization percentages",
            "You find: CR-8 (30%), Lab-5 (25%), CR-12 (35%)",
            "These rooms have over 60% free slots each week",
          ],
          result: "You can report that CR-8, Lab-5, and CR-12 are underutilized and available for sharing.",
        },
      },
    ],
  },
  {
    id: "subjects",
    title: "Subjects Management",
    description: "Add and manage subjects for your department",
    icon: <BookOpen className="w-5 h-5" />,
    color: "from-amber-500 to-orange-600",
    keyFeatures: [
      "Add new subjects with code and name",
      "Specify theory and lab hours",
      "Link subjects to semesters",
      "View all subjects at a glance",
    ],
    steps: [
      {
        title: "Viewing Subjects",
        description: "The Subjects page shows all subjects in your department. Each subject displays its code, name, type (Theory/Lab/Both), and required hours.",
        icon: <Eye className="w-4 h-4" />,
        example: {
          scenario: "A new faculty asks what subjects are taught in 4th semester.",
          steps: [
            "Go to 'Subjects' from sidebar",
            "Filter by '4th Semester' if filter is available",
            "Or scroll to find subjects tagged with Sem-4",
            "You see: CS401-DBMS (3T+2L), CS402-OS (4T), CS403-DAA (3T+2L)...",
          ],
          result: "You can show the faculty all 4th semester subjects with their theory and lab hours.",
        },
      },
      {
        title: "Adding a New Subject",
        description: "Click the 'Add Subject' button. Fill in the subject code, name, type, and weekly hours. Click 'Save' to add the subject to your department.",
        icon: <Edit className="w-4 h-4" />,
        tips: [
          "Subject codes should be unique",
          "Specify correct hours for accurate progress tracking",
        ],
        example: {
          scenario: "A new elective 'Machine Learning' is introduced for 6th semester with 3 theory + 2 lab hours per week.",
          steps: [
            "Click 'Add Subject' button",
            "Enter Code: 'CS601E'",
            "Enter Name: 'Machine Learning'",
            "Select Type: 'Theory + Lab'",
            "Enter Theory Hours: 3",
            "Enter Lab Hours: 2",
            "Select Semester: '6th Semester'",
            "Click 'Save'",
          ],
          result: "Machine Learning is now added and will appear when allocating slots for 6th semester sections.",
        },
      },
    ],
  },
  {
    id: "faculties",
    title: "Faculty Management",
    description: "Manage faculty members for your department",
    icon: <Users className="w-5 h-5" />,
    color: "from-pink-500 to-rose-600",
    keyFeatures: [
      "Add faculty with name and code",
      "View faculty workload",
      "Track faculty allocations",
      "Avoid scheduling conflicts",
    ],
    steps: [
      {
        title: "Viewing Faculty List",
        description: "The Faculty page shows all faculty members in your department with their codes and current workload.",
        icon: <Eye className="w-4 h-4" />,
        example: {
          scenario: "HOD asks who has the lightest workload to take an additional subject.",
          steps: [
            "Go to 'Faculty' from sidebar",
            "View the list with workload indicators",
            "You see: Prof. Kumar (18 hrs), Prof. Sharma (22 hrs), Prof. Verma (12 hrs)...",
            "Prof. Verma has the lowest workload at 12 hours/week",
          ],
          result: "You can recommend Prof. Verma for the additional subject as they have capacity.",
        },
      },
      {
        title: "Adding Faculty",
        description: "Click 'Add Faculty' to add a new faculty member. Enter their name and a unique code. The code is used in timetable allocations.",
        icon: <Edit className="w-4 h-4" />,
        tips: [
          "Use consistent naming conventions",
          "Faculty codes appear in timetable exports",
        ],
        example: {
          scenario: "A new assistant professor Dr. Priya Singh joins the department.",
          steps: [
            "Click 'Add Faculty' button",
            "Enter Name: 'Dr. Priya Singh'",
            "Enter Code: 'PS' (or 'DPS' - keep it short)",
            "Enter Designation: 'Assistant Professor' (if field exists)",
            "Click 'Save'",
          ],
          result: "Dr. Priya Singh (PS) is now in the system and can be assigned to subjects and slots.",
        },
      },
    ],
  },
  {
    id: "mappings",
    title: "Faculty Mappings",
    description: "Assign subjects to faculty members for each section",
    icon: <Link2 className="w-5 h-5" />,
    color: "from-indigo-500 to-blue-600",
    keyFeatures: [
      "Link subjects to specific faculty members",
      "Assign mappings per section",
      "Ensure proper faculty-subject association",
      "Quick reference for allocations",
    ],
    steps: [
      {
        title: "Understanding Mappings",
        description: "Faculty Mappings connect subjects to faculty members for each section. This ensures the right faculty is assigned when allocating slots.",
        icon: <Link2 className="w-4 h-4" />,
        example: {
          scenario: "Prof. Kumar teaches Data Structures to 2A and 2B, but Prof. Sharma teaches it to 2C.",
          steps: [
            "Without mappings, you'd have to remember this for every allocation",
            "With mappings, it's pre-configured:",
            "2A → Data Structures → Prof. Kumar",
            "2B → Data Structures → Prof. Kumar",
            "2C → Data Structures → Prof. Sharma",
          ],
          result: "When allocating DS slots, the system automatically suggests the correct faculty for each section.",
        },
      },
      {
        title: "Creating a Mapping",
        description: "Select the section, then choose a subject and the faculty member who will teach it. Save the mapping for future allocations.",
        icon: <Edit className="w-4 h-4" />,
        tips: [
          "Set up mappings before allocating slots",
          "One subject can have different faculty for different sections",
        ],
        example: {
          scenario: "You need to set up that Dr. Priya Singh will teach 'Machine Learning' to all 3rd year sections.",
          steps: [
            "Go to 'Faculty Mappings'",
            "Click 'Add Mapping'",
            "Select Section: '3A'",
            "Select Subject: 'Machine Learning'",
            "Select Faculty: 'Dr. Priya Singh'",
            "Click 'Save'",
            "Repeat for sections 3B, 3C (or use bulk add if available)",
          ],
          result: "Now when you allocate ML slots for any 3rd year section, Dr. Priya Singh is automatically selected.",
        },
      },
    ],
  },
  {
    id: "requests",
    title: "My Requests",
    description: "Track slot requests you've made to other departments",
    icon: <ClipboardCheck className="w-5 h-5" />,
    color: "from-teal-500 to-cyan-600",
    keyFeatures: [
      "View all your pending requests",
      "Track approved and rejected requests",
      "Request slots in rooms from other departments",
      "Cancel pending requests if needed",
    ],
    steps: [
      {
        title: "Viewing Your Requests",
        description: "The 'My Requests' page shows all slot requests you've made. Requests are categorized as Pending, Approved, or Rejected.",
        icon: <Eye className="w-4 h-4" />,
        example: {
          scenario: "You made 3 room requests last week and want to check their status.",
          steps: [
            "Go to 'My Requests' from sidebar",
            "You see a list of your requests with status badges:",
            "Request 1: ECE Lab - Friday Slot 5 - 🟡 PENDING",
            "Request 2: ME Workshop - Monday Slot 7 - ✅ APPROVED",
            "Request 3: Physics Lab - Tuesday Slot 3 - ❌ REJECTED (Reason: Already booked)",
          ],
          result: "You know Request 2 is confirmed, Request 1 is still waiting, and you need to find an alternative for Request 3.",
        },
      },
      {
        title: "Making a Slot Request",
        description: "When you need a room from another department, create a slot request. Specify the room, day, time slot, and reason. The other department's coordinator will review it.",
        icon: <Edit className="w-4 h-4" />,
        tips: [
          "Provide clear reasons for faster approval",
          "Check room availability before requesting",
        ],
        example: {
          scenario: "CSE needs the ECE department's 'Communication Lab' for a networking practical on Thursday Slot 4.",
          steps: [
            "Go to 'My Requests' → Click 'New Request'",
            "Select Room: 'ECE - Communication Lab'",
            "Select Day: 'Thursday'",
            "Select Slot: 'Slot 4 (11:15 AM - 12:05 PM)'",
            "Select Section: '3A' (the section that needs it)",
            "Enter Reason: 'Computer Networks practical requires communication equipment available in ECE lab'",
            "Click 'Submit Request'",
          ],
          result: "Your request is sent to the ECE coordinator. They'll see your request in their 'Pending Approvals' and can approve or reject it.",
        },
      },
      {
        title: "Request Status Updates",
        description: "Once the other coordinator reviews your request, the status will change. Approved requests automatically update the timetable.",
        icon: <RefreshCw className="w-4 h-4" />,
        example: {
          scenario: "The ECE coordinator approved your Communication Lab request.",
          steps: [
            "You receive a notification (or check 'My Requests')",
            "The request status changes from 🟡 PENDING to ✅ APPROVED",
            "Automatically, your 3A section's Thursday Slot 4 now shows:",
            "'Computer Networks Lab - Communication Lab (ECE)'",
          ],
          result: "The slot is confirmed and visible in your section's timetable. No manual update needed!",
        },
      },
    ],
  },
  {
    id: "approvals",
    title: "Pending Approvals",
    description: "Review and approve slot requests from other coordinators",
    icon: <Bell className="w-5 h-5" />,
    color: "from-red-500 to-pink-600",
    keyFeatures: [
      "View incoming requests for your rooms",
      "Approve or reject with one click",
      "Add comments when rejecting",
      "Maintain room control",
    ],
    steps: [
      {
        title: "Checking Incoming Requests",
        description: "The 'Pending Approvals' page shows requests from other departments wanting to use rooms assigned to your department.",
        icon: <Eye className="w-4 h-4" />,
        example: {
          scenario: "You're the CSE coordinator and other departments want to use CSE labs.",
          steps: [
            "Go to 'Pending Approvals' from sidebar",
            "You see 3 incoming requests:",
            "1. ECE wants 'CSE Lab 2' - Monday Slot 6 - for IoT practical",
            "2. ME wants 'CSE Lab 1' - Wednesday Slot 4 - for CAD software",
            "3. Civil wants 'CSE Lab 3' - Friday Slot 2 - for AutoCAD session",
          ],
          result: "You can see exactly who wants your rooms, when, and why.",
        },
      },
      {
        title: "Reviewing a Request",
        description: "Click on a request to see details: who's requesting, which room, what day/slot, and their reason. Check if the slot is actually free.",
        icon: <Search className="w-4 h-4" />,
        example: {
          scenario: "You want to verify if CSE Lab 2 is actually free on Monday Slot 6 before approving ECE's request.",
          steps: [
            "Click on the ECE request to expand details",
            "See: Requested by: ECE Coordinator (Prof. Reddy)",
            "Room: CSE Lab 2, Day: Monday, Slot: 6 (2:00 PM)",
            "Reason: 'IoT practical requires programming setup'",
            "Click 'View Room Schedule' or open room timetable in another tab",
            "Check Monday Slot 6 - it shows 'FREE'",
          ],
          result: "You've verified the slot is available and the reason is valid. Ready to approve!",
        },
      },
      {
        title: "Approving a Request",
        description: "If the request is valid and the slot is available, click 'Approve'. The slot is automatically allocated to the requesting section.",
        icon: <CheckCircle2 className="w-4 h-4" />,
        tips: [
          "Verify room availability before approving",
          "Approved requests cannot be easily undone",
        ],
        example: {
          scenario: "ECE's request for CSE Lab 2 is valid. You want to approve it.",
          steps: [
            "On the request card, click the green 'Approve' button",
            "A confirmation dialog appears: 'Approve this request?'",
            "Click 'Confirm'",
            "The request disappears from pending and moves to 'Approved'",
          ],
          result: "ECE's section now has CSE Lab 2 on Monday Slot 6. They're notified automatically, and both timetables are updated.",
        },
      },
      {
        title: "Rejecting a Request",
        description: "If you can't accommodate the request, click 'Reject'. Optionally add a reason so the requester understands why.",
        icon: <AlertCircle className="w-4 h-4" />,
        example: {
          scenario: "ME wants CSE Lab 1 on Wednesday Slot 4, but you know there's a scheduled maintenance that day.",
          steps: [
            "On the ME request card, click the red 'Reject' button",
            "A dialog opens asking for a reason (optional but recommended)",
            "Type: 'Lab under scheduled maintenance on Wednesday. Please request Thursday instead.'",
            "Click 'Reject'",
          ],
          result: "ME coordinator sees the rejection with your helpful message and can submit a new request for Thursday.",
        },
      },
    ],
  },
];

const quickTips = [
  {
    icon: <Keyboard className="w-4 h-4" />,
    title: "Use Search",
    description: "Most pages have search functionality - use it to quickly find sections, rooms, or faculty.",
  },
  {
    icon: <Monitor className="w-4 h-4" />,
    title: "Color Coding",
    description: "Pay attention to colors in timetables - they indicate slot types and statuses at a glance.",
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: "Refresh Data",
    description: "If changes aren't reflecting, refresh the page to get the latest data from the server.",
  },
  {
    icon: <Download className="w-4 h-4" />,
    title: "Export Often",
    description: "Export timetables regularly for offline reference and sharing with faculty.",
  },
  {
    icon: <Clock className="w-4 h-4" />,
    title: "Check Conflicts",
    description: "Before modifying slots, check for faculty conflicts across sections.",
  },
  {
    icon: <Star className="w-4 h-4" />,
    title: "Plan Ahead",
    description: "Set up subjects, faculty, and mappings before starting allocations.",
  },
];

export default function UserManualPage() {
  const [expandedModule, setExpandedModule] = useState<string | null>("dashboard");
  const [activeStep, setActiveStep] = useState<number>(0);

  const toggleModule = (moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      setActiveStep(0);
    }
  };

  const currentModule = modules.find(m => m.id === expandedModule);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              Interactive Guide
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Coordinator User Manual
          </h1>
          <p className="text-white/80 max-w-2xl">
            Welcome! This guide will help you master all the features available in your coordinator dashboard. 
            Click on any module below to learn step-by-step.
          </p>
        </div>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-lg">Quick Tips for Efficient Use</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickTips.map((tip, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2 mb-1 text-primary">
                  {tip.icon}
                  <span className="font-medium text-sm">{tip.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Module Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            Feature Modules
          </h2>
          <ScrollArea className="h-[600px] pr-3">
            <div className="space-y-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all duration-200",
                    expandedModule === module.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br text-white",
                      module.color
                    )}>
                      {module.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{module.title}</h3>
                        {expandedModule === module.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  {expandedModule === module.id && module.keyFeatures && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {module.keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Step-by-Step Guide */}
        <div className="lg:col-span-2">
          {currentModule ? (
            <Card className="h-[650px] flex flex-col">
              <CardHeader className={cn(
                "rounded-t-lg bg-gradient-to-r text-white",
                currentModule.color
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {currentModule.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentModule.title}</CardTitle>
                    <CardDescription className="text-white/80">
                      {currentModule.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full flex">
                  {/* Step Navigation */}
                  <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-2">
                    {currentModule.steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveStep(index)}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                          activeStep === index
                            ? "bg-primary text-primary-foreground"
                            : activeStep > index
                            ? "bg-green-100 text-green-600"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        )}
                      >
                        {activeStep > index ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Step Content */}
                  <ScrollArea className="flex-1 p-6">
                    {currentModule.steps[activeStep] && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br text-white",
                            currentModule.color
                          )}>
                            {currentModule.steps[activeStep].icon || <Play className="w-4 h-4" />}
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-1">
                              Step {activeStep + 1} of {currentModule.steps.length}
                            </Badge>
                            <h3 className="text-lg font-semibold">
                              {currentModule.steps[activeStep].title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-muted-foreground leading-relaxed">
                          {currentModule.steps[activeStep].description}
                        </p>

                        {currentModule.steps[activeStep].tips && (
                          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="flex items-center gap-2 mb-2 text-amber-700">
                              <Lightbulb className="w-4 h-4" />
                              <span className="font-medium text-sm">Pro Tips</span>
                            </div>
                            <ul className="space-y-1">
                              {currentModule.steps[activeStep].tips.map((tip, idx) => (
                                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                                  <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Use Case Example */}
                        {currentModule.steps[activeStep].example && (
                          <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                            <div className="flex items-center gap-2 mb-3 text-blue-700">
                              <Play className="w-4 h-4" />
                              <span className="font-semibold text-sm">Real-World Example</span>
                            </div>
                            
                            {/* Scenario */}
                            <div className="mb-3 p-3 bg-white/60 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Scenario</span>
                              </div>
                              <p className="text-sm text-blue-900 font-medium">
                                {currentModule.steps[activeStep].example.scenario}
                              </p>
                            </div>

                            {/* Steps */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">What You Do</span>
                              </div>
                              <ol className="space-y-1.5">
                                {currentModule.steps[activeStep].example.steps.map((step, idx) => (
                                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-medium">
                                      {idx + 1}
                                    </span>
                                    <span className="pt-0.5">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Result */}
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Result</span>
                              </div>
                              <p className="text-sm text-green-800">
                                {currentModule.steps[activeStep].example.result}
                              </p>
                            </div>
                          </div>
                        )}

                        <Separator className="my-6" />

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                            disabled={activeStep === 0}
                          >
                            Previous Step
                          </Button>
                          <Button
                            onClick={() => setActiveStep(Math.min(currentModule.steps.length - 1, activeStep + 1))}
                            disabled={activeStep === currentModule.steps.length - 1}
                            className={cn("bg-gradient-to-r text-white", currentModule.color)}
                          >
                            Next Step
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[650px] flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MousePointerClick className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Select a Module</h3>
                <p className="text-muted-foreground max-w-sm">
                  Click on any module from the left panel to view detailed step-by-step instructions.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Color Legend Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Timetable Color Legend
          </CardTitle>
          <CardDescription>
            Quick reference for understanding timetable slot colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="w-8 h-8 rounded bg-green-500 border-l-4 border-green-700" />
              <div>
                <span className="font-medium text-sm text-green-800">Theory</span>
                <p className="text-xs text-green-600">Regular class</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="w-8 h-8 rounded bg-blue-500 border-l-4 border-blue-700" />
              <div>
                <span className="font-medium text-sm text-blue-800">Lab</span>
                <p className="text-xs text-blue-600">Lab session</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-8 h-8 rounded bg-gray-200 border border-dashed border-gray-400" />
              <div>
                <span className="font-medium text-sm text-gray-800">Free</span>
                <p className="text-xs text-gray-600">Unallocated</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="w-8 h-8 rounded bg-yellow-400 border-l-4 border-yellow-600" />
              <div>
                <span className="font-medium text-sm text-yellow-800">Modified</span>
                <p className="text-xs text-yellow-600">Changed slot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div className="w-8 h-8 rounded bg-orange-400 border-l-4 border-orange-600" />
              <div>
                <span className="font-medium text-sm text-orange-800">Pending</span>
                <p className="text-xs text-orange-600">Awaiting approval</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="w-8 h-8 rounded bg-red-400 border-l-4 border-red-600" />
              <div>
                <span className="font-medium text-sm text-red-800">Conflict</span>
                <p className="text-xs text-red-600">Needs attention</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Need More Help?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your system administrator for additional support or training sessions.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="hidden md:flex">
              Version 1.0
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
