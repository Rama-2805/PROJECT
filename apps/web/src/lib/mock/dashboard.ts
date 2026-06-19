export interface DashboardStats {
  totalStudents: number;
  attendanceToday: number;
  aiRecognitionAccuracy: number;
  activeClassrooms: number;
  connectedDevices: { online: number; total: number };
  monthlyAttendanceGrowth: number;
  averageEngagement: number;
  pendingAlerts: number;
}

export interface ActivityEvent {
  id: string;
  time: string;
  type: "attendance" | "alert" | "system" | "device";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: Date;
}

export interface AIModelStatus {
  name: string;
  status: "online" | "offline" | "degraded";
  accuracy?: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentEvents: ActivityEvent[];
  aiModels: AIModelStatus[];
  greeting: string;
  aiSummary: string;
}

export const mockDashboardData: DashboardData = {
  stats: {
    totalStudents: 10542,
    attendanceToday: 96.8,
    aiRecognitionAccuracy: 99.2,
    activeClassrooms: 120,
    connectedDevices: { online: 84, total: 86 },
    monthlyAttendanceGrowth: 4.8,
    averageEngagement: 89,
    pendingAlerts: 3,
  },
  recentEvents: [
    {
      id: "evt-001",
      time: "09:05 AM",
      type: "attendance",
      severity: "info",
      title: "42 students recognized",
      description: "Classroom CSE-301",
      timestamp: new Date(new Date().setHours(9, 5)),
    },
    {
      id: "evt-002",
      time: "09:12 AM",
      type: "alert",
      severity: "warning",
      title: "Phone detected",
      description: "Student ID: ST-204",
      timestamp: new Date(new Date().setHours(9, 12)),
    },
    {
      id: "evt-003",
      time: "09:30 AM",
      type: "attendance",
      severity: "info",
      title: "Attendance report generated",
      description: "CSE-301 • 45/50 present",
      timestamp: new Date(new Date().setHours(9, 30)),
    },
    {
      id: "evt-004",
      time: "10:00 AM",
      type: "device",
      severity: "warning",
      title: "Device CAMERA_12 offline",
      description: "Lab 3 • Attempting reconnection",
      timestamp: new Date(new Date().setHours(10, 0)),
    },
    {
      id: "evt-005",
      time: "10:15 AM",
      type: "system",
      severity: "info",
      title: "New AI model available",
      description: "Face Recognition v2.1 ready for deployment",
      timestamp: new Date(new Date().setHours(10, 15)),
    },
    {
      id: "evt-006",
      time: "10:30 AM",
      type: "alert",
      severity: "critical",
      title: "Recognition accuracy dropped",
      description: "Camera_08 • Threshold: 92%",
      timestamp: new Date(new Date().setHours(10, 30)),
    },
  ],
  aiModels: [
    { name: "Face Recognition", status: "online", accuracy: 99.2 },
    { name: "Behavior Analysis", status: "online", accuracy: 94.7 },
    { name: "Edge Processing", status: "online" },
    { name: "Cloud Sync", status: "online" },
  ],
  greeting: "Welcome back, Professor Alex",
  aiSummary: "Your SmartCampus AI system is operating normally.",
};

export function getDashboardData(): Promise<DashboardData> {
  return Promise.resolve(mockDashboardData);
}

export function getRecentEvents(): Promise<ActivityEvent[]> {
  return Promise.resolve(mockDashboardData.recentEvents);
}
