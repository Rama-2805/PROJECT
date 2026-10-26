import rawStudents from "./realStudents.json";

export interface RealStudent {
  id: string;
  studentId: string;
  usn: string;
  rollNumber: string;
  fullName: string;
  name: string;
  semester: number;
  section: "A" | "B";
  department: string;
  departmentCode: string;
  gender: "Male" | "Female";
  attendancePercentage: number;
  attendance: number;
  faceEnrolled: boolean;
  status: string;
  collegeEmail: string;
}

export const REAL_STUDENTS: RealStudent[] = rawStudents as RealStudent[];

export const SECTION_A_STUDENTS = REAL_STUDENTS.filter((s) => s.section === "A");
export const SECTION_B_STUDENTS = REAL_STUDENTS.filter((s) => s.section === "B");

/**
 * Find student by USN, studentId, or rollNumber (case-insensitive, trimmed)
 */
export function getStudentByUsn(query: string): RealStudent | undefined {
  if (!query) return undefined;
  const clean = query.trim().toUpperCase();
  return REAL_STUDENTS.find(
    (s) =>
      s.usn.toUpperCase() === clean ||
      s.studentId.toUpperCase() === clean ||
      s.rollNumber.toUpperCase() === clean ||
      s.fullName.toUpperCase() === clean
  );
}

/**
 * Search students matching query in name or USN
 */
export function searchStudents(query: string, maxResults = 10): RealStudent[] {
  if (!query || !query.trim()) return REAL_STUDENTS.slice(0, maxResults);
  const clean = query.trim().toUpperCase();
  return REAL_STUDENTS.filter(
    (s) =>
      s.usn.toUpperCase().includes(clean) ||
      s.studentId.toUpperCase().includes(clean) ||
      s.fullName.toUpperCase().includes(clean)
  ).slice(0, maxResults);
}
