export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  credits: number;
  departmentId: string;
  departmentName: string;
  courseId: string;
  courseName: string;
  teacherId?: string;
  teacherName?: string;
  isActive: boolean;
}

const MOCK_SUBJECTS: Subject[] = [
  { id: "sub-001", name: "Data Structures & Algorithms", code: "CSE201", semester: 3, credits: 4, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-btech-cse", courseName: "B.Tech Computer Science", teacherId: "teacher-001", teacherName: "Dr. Rajesh Kumar", isActive: true },
  { id: "sub-002", name: "Operating Systems", code: "CSE301", semester: 5, credits: 4, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-btech-cse", courseName: "B.Tech Computer Science", teacherId: "teacher-003", teacherName: "Dr. Sanjay Joshi", isActive: true },
  { id: "sub-003", name: "Machine Learning", code: "CSE401", semester: 7, credits: 3, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-btech-cse", courseName: "B.Tech Computer Science", teacherId: "teacher-001", teacherName: "Dr. Rajesh Kumar", isActive: true },
  { id: "sub-004", name: "Digital Logic Design", code: "ECE201", semester: 3, credits: 4, departmentId: "dept-ece", departmentName: "Electronics & Communication", courseId: "course-btech-ece", courseName: "B.Tech Electronics", teacherId: "teacher-002", teacherName: "Dr. Priya Sharma", isActive: true },
  { id: "sub-005", name: "VLSI Design", code: "ECE401", semester: 7, credits: 3, departmentId: "dept-ece", departmentName: "Electronics & Communication", courseId: "course-btech-ece", courseName: "B.Tech Electronics", teacherId: "teacher-006", teacherName: "Dr. Kavita Reddy", isActive: true },
  { id: "sub-006", name: "Thermodynamics", code: "ME201", semester: 3, credits: 4, departmentId: "dept-mech", departmentName: "Mechanical Engineering", courseId: "course-btech-mech", courseName: "B.Tech Mechanical", teacherId: "teacher-003", teacherName: "Dr. Suresh Patel", isActive: true },
  { id: "sub-007", name: "Fluid Mechanics", code: "ME301", semester: 5, credits: 3, departmentId: "dept-mech", departmentName: "Mechanical Engineering", courseId: "course-btech-mech", courseName: "B.Tech Mechanical", teacherId: "teacher-009", teacherName: "Dr. Manoj Mehta", isActive: true },
  { id: "sub-008", name: "Structural Analysis", code: "CE301", semester: 5, credits: 4, departmentId: "dept-civil", departmentName: "Civil Engineering", courseId: "course-btech-civil", courseName: "B.Tech Civil", teacherId: "teacher-004", teacherName: "Dr. Anjali Verma", isActive: true },
  { id: "sub-009", name: "Control Systems", code: "EEE301", semester: 5, credits: 3, departmentId: "dept-ele", departmentName: "Electrical Engineering", courseId: "course-btech-ele", courseName: "B.Tech Electrical", teacherId: "teacher-005", teacherName: "Dr. Vikram Singh", isActive: true },
  { id: "sub-010", name: "Bioinformatics", code: "BT301", semester: 5, credits: 3, departmentId: "dept-bt", departmentName: "Biotechnology", courseId: "course-bsc-bt", courseName: "B.Sc Biotechnology", teacherId: "teacher-006", teacherName: "Dr. Meera Nair", isActive: true },
  { id: "sub-011", name: "Computer Networks", code: "CSE302", semester: 5, credits: 4, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-btech-cse", courseName: "B.Tech Computer Science", teacherId: "teacher-007", teacherName: "Dr. Arun Nair", isActive: true },
  { id: "sub-012", name: "Database Management Systems", code: "CSE202", semester: 3, credits: 4, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-btech-cse", courseName: "B.Tech Computer Science", teacherId: "teacher-008", teacherName: "Dr. Neha Desai", isActive: true },
  { id: "sub-013", name: "Artificial Intelligence", code: "CSE402", semester: 7, credits: 3, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", courseId: "course-mtech-cse", courseName: "M.Tech Computer Science", teacherId: "teacher-001", teacherName: "Dr. Rajesh Kumar", isActive: true },
  { id: "sub-014", name: "Signal Processing", code: "ECE302", semester: 5, credits: 3, departmentId: "dept-ece", departmentName: "Electronics & Communication", courseId: "course-btech-ece", courseName: "B.Tech Electronics", teacherId: "teacher-002", teacherName: "Dr. Priya Sharma", isActive: true },
  { id: "sub-015", name: "Financial Management", code: "MBA201", semester: 1, credits: 3, departmentId: "dept-mba", departmentName: "Management Studies", courseId: "course-mba", courseName: "MBA", teacherId: "teacher-007", teacherName: "Dr. Amit Choudhary", isActive: true },
];

export function getSubjects(departmentId?: string, courseId?: string): Promise<Subject[]> {
  let filtered = [...MOCK_SUBJECTS];
  if (departmentId) filtered = filtered.filter((s) => s.departmentId === departmentId);
  if (courseId) filtered = filtered.filter((s) => s.courseId === courseId);
  return Promise.resolve(filtered);
}

export function getSubjectById(id: string): Promise<Subject | undefined> {
  return Promise.resolve(MOCK_SUBJECTS.find((s) => s.id === id));
}
