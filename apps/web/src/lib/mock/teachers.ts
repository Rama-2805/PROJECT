export interface Teacher {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  departmentName: string;
  specialization: string;
  subjectsCount: number;
  classSessionsCount: number;
  isActive: boolean;
  profilePhoto?: string;
}

const SPECIALIZATIONS = [
  "Artificial Intelligence", "Machine Learning", "Computer Vision", "Data Science",
  "VLSI Design", "Embedded Systems", "Communication Networks", "Power Systems",
  "Structural Engineering", "Geotechnical Engineering", "Thermal Engineering",
  "Design Engineering", "Control Systems", "Signal Processing", "Bioinformatics",
  "Genetic Engineering", "Finance", "Marketing", "Human Resources",
];

const TEACHER_NAMES = [
  "Dr. Rajesh Kumar", "Dr. Priya Sharma", "Dr. Suresh Patel", "Dr. Anjali Verma",
  "Dr. Vikram Singh", "Dr. Meera Nair", "Dr. Amit Choudhary", "Dr. Deepa Gupta",
  "Dr. Sanjay Joshi", "Dr. Kavita Reddy", "Dr. Arun Nair", "Dr. Neha Desai",
  "Dr. Manoj Mehta", "Dr. Pooja Iyer", "Dr. Rakesh Saxena", "Dr. Shweta Agarwal",
  "Dr. Alok Bose", "Dr. Rashmi Kapoor", "Dr. Vijay Mishra", "Dr. Tanvi Pandey",
];

function generateMockTeachers(): Teacher[] {
  return TEACHER_NAMES.map((name, i) => {
    const deptNames = ["Computer Science & Engineering", "Electronics & Communication", "Mechanical Engineering",
      "Civil Engineering", "Electrical Engineering", "Biotechnology", "Management Studies"];
    const dept = deptNames[i % deptNames.length];
    const spec = SPECIALIZATIONS[i % SPECIALIZATIONS.length];
    return {
      id: `teacher-${String(i + 1).padStart(3, "0")}`,
      employeeId: `EMP${String(1000 + i)}`,
      fullName: name,
      email: name.toLowerCase().replace(/\s+/g, ".").replace("dr.", "") + "@university.edu",
      phone: `+91-98765${String(30000 + i).slice(1)}`,
      departmentId: `dept-${dept.split(" ")[0].toLowerCase().slice(0, 3)}`,
      departmentName: dept,
      specialization: spec,
      subjectsCount: 2 + Math.floor(Math.random() * 4),
      classSessionsCount: 4 + Math.floor(Math.random() * 8),
      isActive: i % 15 !== 0,
    };
  });
}

const mockTeachers = generateMockTeachers();

export function getTeachers(departmentId?: string): Promise<Teacher[]> {
  const filtered = departmentId
    ? mockTeachers.filter((t) => t.departmentId === departmentId)
    : mockTeachers;
  return Promise.resolve(filtered);
}

export function getTeacherById(id: string): Promise<Teacher | undefined> {
  return Promise.resolve(mockTeachers.find((t) => t.id === id));
}
