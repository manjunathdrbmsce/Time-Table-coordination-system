import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.slotRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.timetableUpload.deleteMany();
  await prisma.roomStats.deleteMany();
  await prisma.room.deleteMany();
  await prisma.section.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.departmentStats.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("🧹 Cleaned existing data");

  // Create Departments
  const csDept = await prisma.department.create({
    data: {
      code: "CS",
      name: "Computer Science",
      statistics: {
        create: {
          totalSections: 8,
          totalRooms: 4,
          targetClassHours: 200,
          achievedClassHours: 180,
          classGapHours: 20,
          targetLabHours: 120,
          achievedLabHours: 100,
          labGapHours: 20,
          allocationPercent: 88,
        },
      },
    },
  });

  const eceDept = await prisma.department.create({
    data: {
      code: "ECE",
      name: "Electronics & Communication",
      statistics: {
        create: {
          totalSections: 6,
          totalRooms: 3,
          targetClassHours: 150,
          achievedClassHours: 140,
          classGapHours: 10,
          targetLabHours: 90,
          achievedLabHours: 80,
          labGapHours: 10,
          allocationPercent: 92,
        },
      },
    },
  });

  const meDept = await prisma.department.create({
    data: {
      code: "ME",
      name: "Mechanical Engineering",
      statistics: {
        create: {
          totalSections: 4,
          totalRooms: 2,
          targetClassHours: 100,
          achievedClassHours: 90,
          classGapHours: 10,
          targetLabHours: 60,
          achievedLabHours: 55,
          labGapHours: 5,
          allocationPercent: 91,
        },
      },
    },
  });

  console.log("🏢 Created departments");

  // Create Semesters
  const sem1 = await prisma.semester.create({
    data: {
      name: "Semester 1",
      code: "S1",
      isActive: true,
      startDate: new Date("2024-08-01"),
      endDate: new Date("2024-12-15"),
    },
  });

  const sem2 = await prisma.semester.create({
    data: {
      name: "Semester 2",
      code: "S2",
      isActive: false,
      startDate: new Date("2025-01-10"),
      endDate: new Date("2025-05-15"),
    },
  });

  const sem3 = await prisma.semester.create({
    data: {
      name: "Semester 3",
      code: "S3",
      isActive: false,
    },
  });

  const sem4 = await prisma.semester.create({
    data: {
      name: "Semester 4",
      code: "S4",
      isActive: false,
    },
  });

  console.log("📅 Created semesters");

  // Hash password
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create Admin User
  await prisma.user.create({
    data: {
      email: "admin@university.edu",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
    },
  });

  // Create Coordinator Users
  const csCoordinator = await prisma.user.create({
    data: {
      email: "cs.coordinator@university.edu",
      password: hashedPassword,
      name: "CS Coordinator",
      role: "COORDINATOR",
      departmentId: csDept.id,
    },
  });

  const eceCoordinator = await prisma.user.create({
    data: {
      email: "ece.coordinator@university.edu",
      password: hashedPassword,
      name: "ECE Coordinator",
      role: "COORDINATOR",
      departmentId: eceDept.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "me.coordinator@university.edu",
      password: hashedPassword,
      name: "ME Coordinator",
      role: "COORDINATOR",
      departmentId: meDept.id,
    },
  });

  // Create HOD Users
  await prisma.user.create({
    data: {
      email: "cs.hod@university.edu",
      password: hashedPassword,
      name: "Dr. CS Head",
      role: "HOD",
      departmentId: csDept.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "ece.hod@university.edu",
      password: hashedPassword,
      name: "Dr. ECE Head",
      role: "HOD",
      departmentId: eceDept.id,
    },
  });

  console.log("👥 Created users");

  // Create Sections for CS Department
  const csSection1A = await prisma.section.create({
    data: {
      departmentId: csDept.id,
      semesterId: sem1.id,
      year: 1,
      division: "A",
      studentCount: 60,
      requiredTheoryHours: 25,
      requiredLabHours: 15,
    },
  });

  const csSection1B = await prisma.section.create({
    data: {
      departmentId: csDept.id,
      semesterId: sem1.id,
      year: 1,
      division: "B",
      studentCount: 58,
      requiredTheoryHours: 25,
      requiredLabHours: 15,
    },
  });

  const csSection2A = await prisma.section.create({
    data: {
      departmentId: csDept.id,
      semesterId: sem3.id,
      year: 2,
      division: "A",
      studentCount: 55,
      requiredTheoryHours: 25,
      requiredLabHours: 15,
    },
  });

  // Create Sections for ECE Department
  const eceSection1A = await prisma.section.create({
    data: {
      departmentId: eceDept.id,
      semesterId: sem1.id,
      year: 1,
      division: "A",
      studentCount: 50,
      requiredTheoryHours: 25,
      requiredLabHours: 15,
    },
  });

  console.log("📚 Created sections");

  // Create Rooms
  const room101 = await prisma.room.create({
    data: {
      logicalName: "CS-101",
      actualName: "Computer Lab 1",
      code: "CS101",
      type: "LAB",
      capacity: 40,
      departmentId: csDept.id,
      statistics: {
        create: {
          totalSlots: 40,
          occupiedSlots: 32,
          freeSlots: 8,
          utilizationPct: 80,
        },
      },
    },
  });

  const room102 = await prisma.room.create({
    data: {
      logicalName: "CS-102",
      actualName: "Classroom Block A",
      code: "CS102",
      type: "CLASSROOM",
      capacity: 60,
      departmentId: csDept.id,
      statistics: {
        create: {
          totalSlots: 40,
          occupiedSlots: 35,
          freeSlots: 5,
          utilizationPct: 88,
        },
      },
    },
  });

  const room201 = await prisma.room.create({
    data: {
      logicalName: "ECE-201",
      actualName: "Electronics Lab",
      code: "ECE201",
      type: "LAB",
      capacity: 30,
      departmentId: eceDept.id,
      statistics: {
        create: {
          totalSlots: 40,
          occupiedSlots: 28,
          freeSlots: 12,
          utilizationPct: 70,
        },
      },
    },
  });

  const room301 = await prisma.room.create({
    data: {
      logicalName: "LH-301",
      actualName: "Lecture Hall 301",
      code: "LH301",
      type: "CLASSROOM",
      capacity: 120,
      statistics: {
        create: {
          totalSlots: 40,
          occupiedSlots: 36,
          freeSlots: 4,
          utilizationPct: 90,
        },
      },
    },
  });

  console.log("🏫 Created rooms");

  // Create sample allocations
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = [
    { start: "Slot 1", end: "Slot 1" },
    { start: "Slot 2", end: "Slot 2" },
    { start: "Slot 3", end: "Slot 3" },
    { start: "Slot 4", end: "Slot 4" },
    { start: "Slot 5", end: "Slot 5" },
    { start: "Slot 6", end: "Slot 6" },
    { start: "Slot 7", end: "Slot 7" },
    { start: "Slot 8", end: "Slot 8" },
  ];

  const subjects = [
    "Data Structures",
    "Algorithms",
    "Database Systems",
    "Operating Systems",
    "Computer Networks",
    "Web Development",
    "Machine Learning",
    "Software Engineering",
  ];

  const faculty = [
    "Dr. John Smith",
    "Prof. Jane Doe",
    "Dr. Robert Wilson",
    "Prof. Mary Johnson",
    "Dr. David Brown",
  ];

  // Create allocations for CS Section 1A in Room 102
  for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      await prisma.allocation.create({
        data: {
          sectionId: csSection1A.id,
          roomId: room102.id,
          day: days[dayIdx],
          startTime: timeSlots[slotIdx].start,
          endTime: timeSlots[slotIdx].end,
          subject: subjects[(dayIdx + slotIdx) % subjects.length],
          faculty: faculty[(dayIdx + slotIdx) % faculty.length],
          type: "THEORY",
          allocationType: "ALLOCATED",
        },
      });
    }
  }

  // Create lab allocations for CS Section 1A in Room 101
  for (let dayIdx = 0; dayIdx < 3; dayIdx++) {
    await prisma.allocation.create({
      data: {
        sectionId: csSection1A.id,
        roomId: room101.id,
        day: days[dayIdx],
        startTime: "Slot 5",
        endTime: "Slot 6",
        subject: "Programming Lab",
        faculty: faculty[dayIdx % faculty.length],
        type: "LAB",
        allocationType: "ALLOCATED",
      },
    });
  }

  console.log("📝 Created allocations");

  // Create a sample slot request
  const slotRequest = await prisma.slotRequest.create({
    data: {
      requesterId: csCoordinator.id,
      roomId: room201.id,
      sectionId: csSection2A.id,
      day: "Thursday",
      startTime: "Slot 6",
      endTime: "Slot 7",
      reason: "Need additional lab slot for project work",
      status: "PENDING",
    },
  });

  // Create approval for the slot request
  await prisma.approval.create({
    data: {
      slotRequestId: slotRequest.id,
      approverId: eceCoordinator.id,
      approverDeptId: eceDept.id,
      decision: "PENDING",
    },
  });

  console.log("📨 Created slot requests");

  console.log("✅ Database seeded successfully!");
  console.log("");
  console.log("📧 Test Accounts:");
  console.log("   Admin:       admin@university.edu / password123");
  console.log("   CS Coord:    cs.coordinator@university.edu / password123");
  console.log("   ECE Coord:   ece.coordinator@university.edu / password123");
  console.log("   ME Coord:    me.coordinator@university.edu / password123");
  console.log("   CS HOD:      cs.hod@university.edu / password123");
  console.log("   ECE HOD:     ece.hod@university.edu / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
