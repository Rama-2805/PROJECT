export interface Course {
  id: string;
  name: string;
  code: string;
  duration: string;
  credits: number;
  departmentId: string;
  departmentName: string;
  studentsCount: number;
  subjectsCount: number;
  isActive: boolean;
}

const MOCK_COURSES: Course[] = [
  { id: "course-btech-cse", name: "B.Tech Computer Science", code: "BT-CSE", duration: "4 Years", credits: 160, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", studentsCount: 1200, subjectsCount: 48, isActive: true },
  { id: "course-mtech-cse", name: "M.Tech Computer Science", code: "MT-CSE", duration: "2 Years", credits: 80, departmentId: "dept-cse", departmentName: "Computer Science & Engineering", studentsCount: 240, subjectsCount: 24, isActive: true },
  { id: "course-btech-ece", name: "B.Tech Electronics", code: "BT-ECE", duration: "4 Years", credits: 160, departmentId: "dept-ece", departmentName: "Electronics & Communication", studentsCount: 980, subjectsCount: 46, isActive: true },
  { id: "course-mtech-ece", name: "M.Tech Electronics", code: "MT-ECE", duration: "2 Years", credits: 80, departmentId: "dept-ece", departmentName: "Electronics & Communication", studentsCount: 180, subjectsCount: 22, isActive: true },
  { id: "course-btech-mech", name: "B.Tech Mechanical", code: "BT-ME", duration: "4 Years", credits: 160, departmentId: "dept-mech", departmentName: "Mechanical Engineering", studentsCount: 890, subjectsCount: 44, isActive: true },
  { id: "course-mtech-mech", name: "M.Tech Mechanical", code: "MT-ME", duration: "2 Years", credits: 80, departmentId: "dept-mech", departmentName: "Mechanical Engineering", studentsCount: 120, subjectsCount: 20, isActive: true },
  { id: "course-btech-civil", name: "B.Tech Civil", code: "BT-CE", duration: "4 Years", credits: 160, departmentId: "dept-civil", departmentName: "Civil Engineering", studentsCount: 720, subjectsCount: 44, isActive: true },
  { id: "course-btech-ele", name: "B.Tech Electrical", code: "BT-EEE", duration: "4 Years", credits: 160, departmentId: "dept-ele", departmentName: "Electrical Engineering", studentsCount: 850, subjectsCount: 44, isActive: true },
  { id: "course-bsc-bt", name: "B.Sc Biotechnology", code: "BSC-BT", duration: "3 Years", credits: 120, departmentId: "dept-bt", departmentName: "Biotechnology", studentsCount: 420, subjectsCount: 36, isActive: true },
  { id: "course-msc-bt", name: "M.Sc Biotechnology", code: "MSC-BT", duration: "2 Years", credits: 80, departmentId: "dept-bt", departmentName: "Biotechnology", studentsCount: 90, subjectsCount: 20, isActive: true },
  { id: "course-bba", name: "BBA", code: "BBA", duration: "3 Years", credits: 120, departmentId: "dept-mba", departmentName: "Management Studies", studentsCount: 650, subjectsCount: 36, isActive: true },
  { id: "course-mba", name: "MBA", code: "MBA", duration: "2 Years", credits: 80, departmentId: "dept-mba", departmentName: "Management Studies", studentsCount: 600, subjectsCount: 24, isActive: true },
];

export function getCourses(departmentId?: string): Promise<Course[]> {
  const filtered = departmentId
    ? MOCK_COURSES.filter((c) => c.departmentId === departmentId)
    : MOCK_COURSES;
  return Promise.resolve(filtered);
}

export function getCourseById(id: string): Promise<Course | undefined> {
  return Promise.resolve(MOCK_COURSES.find((c) => c.id === id));
}
