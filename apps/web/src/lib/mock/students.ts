/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Student {
  id: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  profilePhoto?: string;
  departmentId: string;
  departmentName: string;
  courseId: string;
  courseName: string;
  semester: number;
  section: string;
  batchYear: number;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED";
  // AI Enrollment
  faceEnrolled: boolean;
  faceSamples: number;
  enrollmentConfidence: number;
  lastRecognitionDate?: string;
  recognitionAccuracy: number;
  // Statistics
  attendancePercentage: number;
  engagementScore: number;
  behaviorAlertCount: number;
  lastAttendanceTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentStats {
  totalStudents: number;
  faceEnrolled: number;
  pendingEnrollment: number;
  averageAttendance: number;
  averageEngagement: number;
}

export interface StudentTableParams {
  search?: string;
  departmentId?: string;
  semester?: string;
  section?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEPARTMENTS = [
  { id: "dept-cse", name: "Computer Science & Engineering" },
  { id: "dept-ece", name: "Electronics & Communication" },
  { id: "dept-mech", name: "Mechanical Engineering" },
  { id: "dept-civil", name: "Civil Engineering" },
  { id: "dept-ele", name: "Electrical Engineering" },
  { id: "dept-bt", name: "Biotechnology" },
];

const COURSES = [
  { id: "course-btech", name: "B.Tech" },
  { id: "course-mtech", name: "M.Tech" },
  { id: "course-bsc", name: "B.Sc" },
  { id: "course-msc", name: "M.Sc" },
  { id: "course-bba", name: "BBA" },
  { id: "course-mba", name: "MBA" },
];

const FIRST_NAMES = [
  "Arjun", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Karan", "Isha",
  "Rahul", "Neha", "Amit", "Pooja", "Siddharth", "Shreya", "Manish", "Divya",
  "Raj", "Kavya", "Deepak", "Ritu", "Suresh", "Anjali", "Vivek", "Nisha",
  "Aakash", "Meera", "Harsh", "Tanvi", "Gaurav", "Swati",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Singh", "Kumar", "Gupta", "Joshi", "Reddy",
  "Nair", "Desai", "Mehta", "Choudhary", "Mishra", "Pandey", "Rao", "Saxena",
  "Agarwal", "Bose", "Iyer", "Kapoor",
];

const SECTIONS = ["A", "B", "C", "D"];

function generateMockStudents(count: number): Student[] {
  const students: Student[] = [];
  for (let i = 1; i <= count; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const course = COURSES[i % COURSES.length];
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const semester = Math.min(Math.ceil(i / 30), 8);
    const section = SECTIONS[i % SECTIONS.length];
    const faceEnrolled = i % 7 !== 0;
    const attendance = parseFloat((85 + Math.random() * 15).toFixed(1));
    const engagement = parseFloat((70 + Math.random() * 28).toFixed(1));

    students.push({
      id: `stu-${String(i).padStart(4, "0")}`,
      studentId: `STU${String(2026000 + i)}`,
      rollNumber: `${dept.id === DEPARTMENTS[0].id ? "CSE" : dept.id === DEPARTMENTS[1].id ? "ECE" : dept.id === DEPARTMENTS[2].id ? "ME" : "OT"}-${String(2026000 + i)}`,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`,
      phone: `+91-98765${String(40000 + i).slice(1)}`,
      gender: i % 2 === 0 ? "Male" : "Female",
      dateOfBirth: `200${Math.min(Math.ceil(i / 100), 9)}-${String(Math.min(i % 12 + 1, 12)).padStart(2, "0")}-${String(Math.min(i % 28 + 1, 28)).padStart(2, "0")}`,
      departmentId: dept.id,
      departmentName: dept.name,
      courseId: course.id,
      courseName: course.name,
      semester,
      section,
      batchYear: 2026,
      status: i % 20 === 0 ? "INACTIVE" : i % 50 === 0 ? "GRADUATED" : "ACTIVE",
      faceEnrolled,
      faceSamples: faceEnrolled ? Math.floor(15 + Math.random() * 20) : 0,
      enrollmentConfidence: faceEnrolled ? parseFloat((90 + Math.random() * 9.5).toFixed(1)) : 0,
      lastRecognitionDate: faceEnrolled ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
      recognitionAccuracy: faceEnrolled ? parseFloat((92 + Math.random() * 7.5).toFixed(1)) : 0,
      attendancePercentage: attendance,
      engagementScore: engagement,
      behaviorAlertCount: Math.floor(Math.random() * 5),
      lastAttendanceTime: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    });
  }
  return students;
}

const mockStudents = generateMockStudents(250);

export const studentStats: StudentStats = {
  totalStudents: 12540,
  faceEnrolled: 11980,
  pendingEnrollment: 560,
  averageAttendance: 95.4,
  averageEngagement: 89,
};

export function getStudents(params?: StudentTableParams): Promise<PaginatedResponse<Student>> {
  const {
    search,
    departmentId,
    semester,
    section,
    status,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params || {};

  let filtered = [...mockStudents];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }
  if (departmentId) filtered = filtered.filter((s) => s.departmentId === departmentId);
  if (semester) filtered = filtered.filter((s) => s.semester === parseInt(semester));
  if (section) filtered = filtered.filter((s) => s.section === section);
  if (status) filtered = filtered.filter((s) => s.status === status);

  filtered.sort((a, b) => {
    const aVal = (a as any)[sortBy];
    const bVal = (b as any)[sortBy];
    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === "asc" ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const data = filtered.slice((page - 1) * limit, page * limit);

  return Promise.resolve({ data, total, page, limit, totalPages });
}

export function getStudentById(id: string): Promise<Student | undefined> {
  const student = mockStudents.find((s) => s.id === id || s.studentId === id);
  return Promise.resolve(student);
}

export function getStudentsStats(): Promise<StudentStats> {
  return Promise.resolve(studentStats);
}
