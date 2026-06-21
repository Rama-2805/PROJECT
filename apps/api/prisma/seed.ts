import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as argon2 from "argon2";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding SmartCampus AI database...\n");

  // ─── 1. Roles ──────────────────────────────────────────────────
  const roleDefinitions = [
    { name: "SUPER_ADMIN", label: "Super Admin" },
    { name: "INSTITUTION_ADMIN", label: "Institution Admin" },
    { name: "TEACHER", label: "Teacher" },
    { name: "DEVICE_MANAGER", label: "Device Manager" },
    { name: "RESEARCH_ANALYST", label: "Research Analyst" },
  ];

  const roles: Record<string, any> = {};
  for (const r of roleDefinitions) {
    roles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: { label: r.label },
      create: r,
    });
  }
  console.log("✅ Roles seeded");

  // ─── 2. Institution ────────────────────────────────────────────
  const institution = await prisma.institution.upsert({
    where: { slug: "smartcampus-academy" },
    update: {},
    create: {
      name: "SmartCampus Academy",
      slug: "smartcampus-academy",
      plan: "enterprise",
      planEnum: "ENTERPRISE",
      website: "https://smartcampus.edu",
      email: "admin@smartcampus.edu",
      country: "India",
      state: "Karnataka",
      city: "Bangalore",
      maxStudents: 2000,
      maxTeachers: 100,
      maxDevices: 50,
    },
  });
  console.log(`✅ Institution seeded: ${institution.name} (${institution.id})`);

  // ─── 3. Department ─────────────────────────────────────────────
  const department = await prisma.department.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: "CSE",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: "Computer Science & Engineering",
      code: "CSE",
      hodName: "Dr. Rajesh Kumar",
      description: "Department of Computer Science and Engineering",
    },
  });
  console.log(`✅ Department seeded: ${department.name} (${department.id})`);

  // ─── 4. Course ─────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: "BTECH-CSE",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      departmentId: department.id,
      name: "B.Tech Computer Science",
      code: "BTECH-CSE",
      duration: "4 years",
      credits: 160,
    },
  });
  console.log(`✅ Course seeded: ${course.name} (${course.id})`);

  // ─── 5. Classroom ─────────────────────────────────────────────
  const classroom = await prisma.classroom.upsert({
    where: {
      institutionId_roomNumber: {
        institutionId: institution.id,
        roomNumber: "CSE LAB 301",
      },
    },
    update: {},
    create: {
      id: "room-023",
      institutionId: institution.id,
      departmentId: department.id,
      roomNumber: "CSE LAB 301",
      building: "Academic Block A",
      floor: 3,
      capacity: 60,
    },
  });
  console.log(`✅ Classroom seeded: ${classroom.roomNumber} (${classroom.id})`);

  // ─── 6. Hash passwords ────────────────────────────────────────
  const adminPwHash = await argon2.hash("admin123");
  const teacherPwHash = await argon2.hash("teacher123");
  const studentPwHash = await argon2.hash("student123");

  // ─── 7. Admin User ────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@smartcampus.edu" },
    update: { passwordHash: adminPwHash },
    create: {
      institutionId: institution.id,
      fullName: "Dr. Anil Sharma",
      email: "admin@smartcampus.edu",
      passwordHash: adminPwHash,
      emailVerified: true,
    },
  });

  // Assign SUPER_ADMIN + INSTITUTION_ADMIN roles
  for (const roleName of ["SUPER_ADMIN", "INSTITUTION_ADMIN"]) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: roles[roleName].id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: roles[roleName].id,
      },
    });
  }
  console.log(`✅ Admin user seeded: ${adminUser.email}`);

  // ─── 8. Teacher User + Profile ─────────────────────────────────
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@smartcampus.edu" },
    update: { passwordHash: teacherPwHash },
    create: {
      institutionId: institution.id,
      fullName: "Prof. Meera Iyer",
      email: "teacher@smartcampus.edu",
      passwordHash: teacherPwHash,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: teacherUser.id,
        roleId: roles["TEACHER"].id,
      },
    },
    update: {},
    create: {
      userId: teacherUser.id,
      roleId: roles["TEACHER"].id,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: {
      institutionId_employeeId: {
        institutionId: institution.id,
        employeeId: "EMP001",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      departmentId: department.id,
      userId: teacherUser.id,
      employeeId: "EMP001",
      fullName: "Prof. Meera Iyer",
      email: "teacher@smartcampus.edu",
      specialization: "Artificial Intelligence & Machine Learning",
    },
  });
  console.log(`✅ Teacher seeded: ${teacher.fullName} (${teacher.id})`);

  // ─── 9. Student User + Profile ─────────────────────────────────
  const studentUser = await prisma.user.upsert({
    where: { email: "student@smartcampus.edu" },
    update: { passwordHash: studentPwHash },
    create: {
      institutionId: institution.id,
      fullName: "Siddharth Saxena",
      email: "student@smartcampus.edu",
      passwordHash: studentPwHash,
      emailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: studentUser.id,
        roleId: roles["RESEARCH_ANALYST"].id,
      },
    },
    update: {},
    create: {
      userId: studentUser.id,
      roleId: roles["RESEARCH_ANALYST"].id,
    },
  });
  console.log(`✅ Student user seeded: ${studentUser.email}`);

  // Student profile
  const student = await prisma.student.upsert({
    where: {
      institutionId_studentId: {
        institutionId: institution.id,
        studentId: "CSE2026002",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      departmentId: department.id,
      courseId: course.id,
      studentId: "CSE2026002",
      rollNumber: "26CSE002",
      fullName: "Siddharth Saxena",
      email: "student@smartcampus.edu",
      gender: "Male",
      semester: 6,
      section: "A",
      batchYear: 2026,
      status: "ACTIVE",
      faceEnrolled: true,
      faceSamples: 25,
      enrollmentConfidence: 0.96,
      attendancePercentage: 87.5,
      engagementScore: 82.0,
    },
  });
  console.log(`✅ Student profile seeded: ${student.fullName} / USN: ${student.studentId}`);

  // ─── 10. Additional Students (for richer demo data) ────────────
  const extraStudents = [
    { studentId: "CSE2026001", fullName: "Aarav Mehta", rollNumber: "26CSE001", gender: "Male", semester: 6 },
    { studentId: "CSE2026003", fullName: "Priya Patel", rollNumber: "26CSE003", gender: "Female", semester: 6 },
    { studentId: "CSE2026004", fullName: "Rishi Verma", rollNumber: "26CSE004", gender: "Male", semester: 6 },
    { studentId: "CSE2026005", fullName: "Vikram Singh", rollNumber: "26CSE005", gender: "Male", semester: 6 },
    { studentId: "CSE2026006", fullName: "Ananya Reddy", rollNumber: "26CSE006", gender: "Female", semester: 6 },
    { studentId: "CSE2026007", fullName: "Karthik Nair", rollNumber: "26CSE007", gender: "Male", semester: 6 },
    { studentId: "CSE2026008", fullName: "Neha Gupta", rollNumber: "26CSE008", gender: "Female", semester: 6 },
    { studentId: "CSE2026009", fullName: "Arjun Das", rollNumber: "26CSE009", gender: "Male", semester: 6 },
    { studentId: "CSE2026010", fullName: "Divya Sharma", rollNumber: "26CSE010", gender: "Female", semester: 6 },
  ];

  for (const s of extraStudents) {
    await prisma.student.upsert({
      where: {
        institutionId_studentId: {
          institutionId: institution.id,
          studentId: s.studentId,
        },
      },
      update: {},
      create: {
        institutionId: institution.id,
        departmentId: department.id,
        courseId: course.id,
        studentId: s.studentId,
        rollNumber: s.rollNumber,
        fullName: s.fullName,
        gender: s.gender,
        semester: s.semester,
        section: "A",
        batchYear: 2026,
        status: "ACTIVE",
        attendancePercentage: 70 + Math.random() * 25,
        engagementScore: 60 + Math.random() * 30,
      },
    });
  }
  console.log(`✅ ${extraStudents.length} additional students seeded`);

  // ─── 11. Subject ────────────────────────────────────────────────
  const subject = await prisma.subject.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: "CS601",
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      courseId: course.id,
      departmentId: department.id,
      name: "Data Structures & Algorithms",
      code: "CS601",
      semester: 6,
      credits: 4,
      teacherId: teacher.id,
    },
  });
  console.log(`✅ Subject seeded: ${subject.name}`);

  // ─── 12. Class Schedule ─────────────────────────────────────────
  const classSchedule = await prisma.classSchedule.upsert({
    where: { id: "schedule-dsa-mon" },
    update: {},
    create: {
      id: "schedule-dsa-mon",
      institutionId: institution.id,
      classroomId: classroom.id,
      teacherId: teacher.id,
      name: "Data Structures & Algorithms",
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "10:00",
    },
  });
  console.log(`✅ Class schedule seeded: ${classSchedule.name} (Mon 09:00-10:00)`);

  console.log("\n🌱 Seed complete! All test data ready.\n");
  console.log("   Login credentials:");
  console.log("   ─────────────────────────────────────");
  console.log("   Admin:   admin@smartcampus.edu / admin123");
  console.log("   Teacher: teacher@smartcampus.edu / teacher123");
  console.log("   Student: student@smartcampus.edu / student123");
  console.log("   ─────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
