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
    totalStudents: 130,
    attendanceToday: 93.8,
    aiRecognitionAccuracy: 99.2,
    activeClassrooms: 4,
    connectedDevices: { online: 6, total: 6 },
    monthlyAttendanceGrowth: 4.8,
    averageEngagement: 89,
    pendingAlerts: 0,
  },
  recentEvents: [
    {
      id: "evt-001",
      time: "10:04 AM",
      type: "attendance",
      severity: "info",
      title: "1VI23CS058 Manjunatha R verified",
      description: "Advanced Data Structures • 99.4% match (CAM-023-A)",
      timestamp: new Date(),
    },
    {
      id: "evt-002",
      time: "10:02 AM",
      type: "attendance",
      severity: "info",
      title: "1VI23CS027 EKTA PRIYA V verified",
      description: "Advanced Data Structures • 99.1% match (CAM-023-A)",
      timestamp: new Date(),
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
