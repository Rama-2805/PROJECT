export interface Department {
  id: string;
  name: string;
  code: string;
  hodName: string;
  description: string;
  studentCount: number;
  teacherCount: number;
  classroomCount: number;
  courseCount: number;
  isActive: boolean;
}

const MOCK_DEPARTMENTS: Department[] = [
  {
    id: "dept-cse",
    name: "Computer Science & Engineering",
    code: "CSE",
    hodName: "Dr. Rajesh Kumar",
    description: "Department of Computer Science and Engineering focusing on software, AI, and computing systems.",
    studentCount: 3240,
    teacherCount: 85,
    classroomCount: 28,
    courseCount: 6,
    isActive: true,
  },
  {
    id: "dept-ece",
    name: "Electronics & Communication",
    code: "ECE",
    hodName: "Dr. Priya Sharma",
    description: "Department of Electronics and Communication Engineering covering VLSI, embedded systems, and communications.",
    studentCount: 2150,
    teacherCount: 62,
    classroomCount: 20,
    courseCount: 5,
    isActive: true,
  },
  {
    id: "dept-mech",
    name: "Mechanical Engineering",
    code: "ME",
    hodName: "Dr. Suresh Patel",
    description: "Department of Mechanical Engineering covering design, manufacturing, and thermal sciences.",
    studentCount: 1890,
    teacherCount: 54,
    classroomCount: 18,
    courseCount: 4,
    isActive: true,
  },
  {
    id: "dept-civil",
    name: "Civil Engineering",
    code: "CE",
    hodName: "Dr. Anjali Verma",
    description: "Department of Civil Engineering focusing on structures, geotechnical, and environmental engineering.",
    studentCount: 1450,
    teacherCount: 42,
    classroomCount: 15,
    courseCount: 4,
    isActive: true,
  },
  {
    id: "dept-ele",
    name: "Electrical Engineering",
    code: "EEE",
    hodName: "Dr. Vikram Singh",
    description: "Department of Electrical Engineering covering power systems, controls, and renewable energy.",
    studentCount: 1670,
    teacherCount: 48,
    classroomCount: 16,
    courseCount: 4,
    isActive: true,
  },
  {
    id: "dept-bt",
    name: "Biotechnology",
    code: "BT",
    hodName: "Dr. Meera Nair",
    description: "Department of Biotechnology focusing on genetic engineering, bioinformatics, and bioprocess technology.",
    studentCount: 890,
    teacherCount: 28,
    classroomCount: 10,
    courseCount: 3,
    isActive: true,
  },
  {
    id: "dept-mba",
    name: "Management Studies",
    code: "MBA",
    hodName: "Dr. Amit Choudhary",
    description: "Department of Management Studies covering finance, marketing, HR, and operations.",
    studentCount: 1250,
    teacherCount: 35,
    classroomCount: 12,
    courseCount: 2,
    isActive: true,
  },
];

export function getDepartments(): Promise<Department[]> {
  return Promise.resolve(MOCK_DEPARTMENTS);
}

export function getDepartmentById(id: string): Promise<Department | undefined> {
  return Promise.resolve(MOCK_DEPARTMENTS.find((d) => d.id === id));
}
