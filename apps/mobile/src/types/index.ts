// ─── SmartCampus AI — Mobile App Types ────────────────────

// ── Student ──────────────────────────────────────────────
export interface StudentDashboard {
  id: string;
  studentId: string;
  fullName: string;
  department: string;
  semester: number;
  profileImage: string | null;
  todayAttendance: AttendanceStatus;
  attendancePercentage: number;
  engagementScore: number;
  upcomingClasses: ClassSession[];
  aiInsights: AIInsight[];
  academicStats: AcademicStats;
}

export interface AttendanceStatus {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';
  subjectName: string;
  time: string;
}

export interface ClassSession {
  id: string;
  name: string;
  subjectName: string;
  teacherName: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isCurrent: boolean;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  confidence: number;
  generatedAt: string;
}

export interface AcademicStats {
  totalClasses: number;
  attendedClasses: number;
  missedClasses: number;
  attendanceTrend: number;
  averageEngagement: number;
  bestSubject: string;
  needsImprovement: string;
}

// ── Parent ───────────────────────────────────────────────
export interface ParentDashboard {
  studentName: string;
  studentId: string;
  department: string;
  todayAttendance: AttendanceStatus;
  attendanceTrend: WeeklyTrend[];
  monthlyReport: MonthlyReport;
  recentAlerts: ParentAlert[];
  announcements: Announcement[];
}

export interface WeeklyTrend {
  date: string;
  value: number;
  label: string;
}

export interface MonthlyReport {
  month: string;
  totalClasses: number;
  attended: number;
  missed: number;
  percentage: number;
  engagementAverage: number;
}

export interface ParentAlert {
  id: string;
  type: 'ATTENDANCE' | 'BEHAVIOR' | 'ACADEMIC';
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: string;
  isRead: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  from: string;
  createdAt: string;
  isImportant: boolean;
}

// ── Teacher ──────────────────────────────────────────────
export interface TeacherDashboard {
  name: string;
  employeeId: string;
  department: string;
  todayClasses: TeacherClass[];
  activeSession: TeacherSession | null;
  recentAlerts: TeacherAlert[];
  stats: TeacherStats;
}

export interface TeacherClass {
  id: string;
  name: string;
  subjectName: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  isActive: boolean;
  hasSession: boolean;
}

export interface TeacherSession {
  id: string;
  sessionId: string;
  classroomName: string;
  subjectName: string;
  totalStudents: number;
  totalPresent: number;
  startedAt: string;
  duration: number;
  recognitionAccuracy: number;
  unknownFaces: number;
  liveEvents: LiveEvent[];
}

export interface LiveEvent {
  id: string;
  type: string;
  studentName: string;
  studentId: string;
  confidence: number;
  time: string;
}

export interface TeacherAlert {
  id: string;
  type: 'LOW_ENGAGEMENT' | 'DEVICE_FAILURE' | 'UNKNOWN_PERSON' | 'BEHAVIOR';
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  classroom: string;
  createdAt: string;
  isRead: boolean;
}

export interface TeacherStats {
  totalClassesToday: number;
  totalStudentsTracked: number;
  averageAttendance: number;
  activeAlerts: number;
}

// ── Auth ─────────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  role: 'student' | 'parent' | 'teacher' | 'admin';
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  profileImage: string | null;
  role: string;
  institutionId: string;
  institutionName: string;
}

// ── Notifications ────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: 'ATTENDANCE' | 'ALERT' | 'SYSTEM' | 'ANNOUNCEMENT';
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

// ── QR Attendance ────────────────────────────────────────
export interface QRCodeData {
  sessionId: string;
  classroomId: string;
  institutionId: string;
  teacherId: string;
  generatedAt: string;
  expiresAt: string;
}

export interface QRScanResult {
  success: boolean;
  message: string;
  confidence?: number;
}

// ── Chat ─────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  isLoading?: boolean;
}

export interface ChatSuggestion {
  id: string;
  text: string;
  icon: string;
}
