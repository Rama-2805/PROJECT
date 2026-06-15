export interface AttendanceSession {
  sessionId: string;
  classroomId: string;
  classroomName: string;
  subjectName: string;
  teacherName: string;
  status: "ACTIVE" | "ENDED";
  totalPresent: number;
  totalStudents: number;
  startedAt: string;
  endedAt?: string;
  recognitionAccuracy: number;
  unknownFaces: number;
}

export interface LiveAttendanceEvent {
  type: "ATTENDANCE_DETECTED" | "STUDENT_ENTERED" | "STUDENT_LEFT" | "UNKNOWN_PERSON" | "CAMERA_OFFLINE";
  studentId?: string;
  studentName?: string;
  confidence?: number;
  time: string;
  classroomId?: string;
  cameraId?: string;
}

export interface LiveMonitoringData {
  session: AttendanceSession;
  events: LiveAttendanceEvent[];
  presentStudents: { id: string; name: string; confidence: number }[];
  cameraStatus: "ONLINE" | "OFFLINE" | "DEGRADED";
  fps: number;
}

const STUDENTS = [
  { id: "CSE2026001", name: "Arjun Sharma" },
  { id: "CSE2026002", name: "Priya Patel" },
  { id: "CSE2026003", name: "Rohan Verma" },
  { id: "CSE2026004", name: "Ananya Gupta" },
  { id: "CSE2026005", name: "Vikram Singh" },
  { id: "CSE2026006", name: "Sneha Reddy" },
  { id: "CSE2026007", name: "Karan Nair" },
  { id: "CSE2026008", name: "Isha Desai" },
  { id: "CSE2026009", name: "Rahul Mehta" },
  { id: "CSE2026010", name: "Neha Joshi" },
  { id: "CSE2026011", name: "Amit Kumar" },
  { id: "CSE2026012", name: "Pooja Iyer" },
  { id: "CSE2026013", name: "Siddharth Saxena" },
  { id: "CSE2026014", name: "Shreya Agarwal" },
  { id: "CSE2026015", name: "Manish Bose" },
];

const EVENT_TYPES: ("ATTENDANCE_DETECTED" | "STUDENT_ENTERED" | "STUDENT_LEFT" | "UNKNOWN_PERSON")[] = [
  "ATTENDANCE_DETECTED", "STUDENT_ENTERED", "STUDENT_LEFT", "UNKNOWN_PERSON",
];

const mockSession: AttendanceSession = {
  sessionId: "SESS_CSE301_12JUNE",
  classroomId: "room-023",
  classroomName: "CSE LAB 301",
  subjectName: "Data Structures & Algorithms",
  teacherName: "Dr. Rajesh Kumar",
  status: "ACTIVE",
  totalPresent: 42,
  totalStudents: 50,
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  recognitionAccuracy: 99.1,
  unknownFaces: 2,
};

function generateInitialEvents(): LiveAttendanceEvent[] {
  const events: LiveAttendanceEvent[] = [];
  const baseTime = Date.now() - 3600000;
  const enteredStudents = new Set<string>();

  for (let i = 0; i < 15; i++) {
    const student = STUDENTS[i];
    const enterTime = new Date(baseTime + i * 180000);
    events.push({
      type: "ATTENDANCE_DETECTED",
      studentId: student.id,
      studentName: student.name,
      confidence: parseFloat((0.92 + Math.random() * 0.07).toFixed(2)),
      time: enterTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
    enteredStudents.add(student.id);
  }

  events.sort((a, b) => {
    const timeA = new Date(`1970/01/01 ${a.time}`).getTime();
    const timeB = new Date(`1970/01/01 ${b.time}`).getTime();
    return timeA - timeB;
  });

  return events;
}

export function getLiveMonitoringData(): Promise<LiveMonitoringData> {
  return Promise.resolve({
    session: mockSession,
    events: generateInitialEvents(),
    presentStudents: STUDENTS.slice(0, 42).map((s) => ({
      id: s.id,
      name: s.name,
      confidence: parseFloat((0.88 + Math.random() * 0.11).toFixed(2)),
    })),
    cameraStatus: "ONLINE",
    fps: 28,
  });
}

export function generateLiveEvent(): LiveAttendanceEvent {
  const student = STUDENTS[Math.floor(Math.random() * STUDENTS.length)];
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  return {
    type,
    studentId: type !== "UNKNOWN_PERSON" ? student.id : undefined,
    studentName: type !== "UNKNOWN_PERSON" ? student.name : undefined,
    confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)),
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function getAttendanceAnalytics() {
  return Promise.resolve({
    weeklyTrend: [
      { day: "Mon", rate: 94.2 },
      { day: "Tue", rate: 96.8 },
      { day: "Wed", rate: 95.1 },
      { day: "Thu", rate: 97.3 },
      { day: "Fri", rate: 93.5 },
      { day: "Sat", rate: 89.2 },
    ],
    departmentComparison: [
      { name: "CSE", rate: 96.8 },
      { name: "ECE", rate: 94.5 },
      { name: "ME", rate: 92.1 },
      { name: "CE", rate: 93.4 },
      { name: "EEE", rate: 91.8 },
      { name: "BT", rate: 95.7 },
    ],
    distribution: [
      { label: "Above 90%", value: 65, color: "#10B981" },
      { label: "75-90%", value: 22, color: "#F59E0B" },
      { label: "60-75%", value: 8, color: "#F97316" },
      { label: "Below 60%", value: 5, color: "#EF4444" },
    ],
    monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
      rate: parseFloat((87 + Math.random() * 10).toFixed(1)),
    })),
    lateArrivals: 4,
    absenceRate: 3.2,
  });
}
