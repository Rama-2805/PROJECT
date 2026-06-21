import { api } from "./client";

export interface ActivityEvent {
  id: string;
  time: string;
  type: "attendance" | "alert" | "system" | "device";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
}

export interface AIModelStatus {
  name: string;
  status: "online" | "offline" | "degraded";
  accuracy?: number;
}

export interface AdminSummaryResponse {
  success: boolean;
  data?: {
    total_students: number;
    attendance_today: number;
    ai_recognition_accuracy: number;
    active_classrooms: number;
    connected_devices_online: number;
    connected_devices_total: number;
    monthly_attendance_growth: number;
    average_engagement: number;
    pending_alerts: number;
    greeting: string;
    ai_summary: string;
    recent_events: ActivityEvent[];
    ai_models: AIModelStatus[];
    timestamp: string;
  };
  error?: string;
}

export interface TeacherClassroom {
  id: string;
  name: string;
  subject: string;
  time: string;
  status: "ACTIVE" | "IDLE" | "OFFLINE";
  attendance_rate: number;
}

export interface ScheduleItem {
  id: string;
  subject: string;
  classroom: string;
  time: string;
  status: string;
}

export interface TeacherStats {
  avg_attendance: number;
  total_classes_conducted: number;
  active_alerts_count: number;
  avg_engagement_rate: number;
}

export interface TeacherSummaryResponse {
  success: boolean;
  data?: {
    teacher_name: string;
    classrooms: TeacherClassroom[];
    today_schedule: ScheduleItem[];
    stats: TeacherStats;
    recent_events: ActivityEvent[];
    timestamp: string;
  };
  error?: string;
}

export interface BehaviorAlert {
  id: string;
  student_id: string;
  student_name: string;
  behavior_type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  confidence: number;
  status: "ACTIVE" | "ACKNOWLEDGED" | "DISMISSED";
  acknowledged_by?: string;
  created_at: string;
}

export interface LiveAlertsResponse {
  success: boolean;
  data?: {
    total: number;
    alerts: BehaviorAlert[];
    timestamp: string;
  };
  error?: string;
}

export interface AttendanceOverviewResponse {
  success: boolean;
  data?: {
    weekly_trend: { day: string; rate: number }[];
    department_comparison: { name: string; rate: number }[];
    distribution: { label: string; value: number; color: string }[];
    monthly_trend: { month: string; rate: number }[];
    late_arrivals: number;
    absence_rate: number;
    timestamp: string;
  };
  error?: string;
}

export interface ClassroomStatus {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  status: "ACTIVE" | "IDLE" | "OFFLINE";
  current_attendance: number;
  total_students: number;
  average_engagement: number;
  camera_status: "ONLINE" | "OFFLINE" | "DEGRADED";
  fps: number;
}

export interface ClassroomStatusResponse {
  success: boolean;
  data?: {
    total_active: number;
    total_idle: number;
    total_offline: number;
    classrooms: ClassroomStatus[];
    timestamp: string;
  };
  error?: string;
}

export interface StudentRisk {
  student_id: string;
  student_name: string;
  engagement_score: number;
  attendance_rate: number;
  phone_events_count: number;
  sleeping_events_count: number;
  risk_level: "HIGH" | "MODERATE";
  warning_trigger: string;
}

export interface StudentRiskResponse {
  success: boolean;
  data?: {
    high_risk_students: StudentRisk[];
    moderate_risk_students: StudentRisk[];
    total_high_risk: number;
    total_moderate_risk: number;
    timestamp: string;
  };
  error?: string;
}

export interface BehaviorAnalyticsResponse {
  success: boolean;
  data?: {
    overview: {
      averageEngagement: number;
      phoneEvents: number;
      attentionLevel: number;
      highRiskStudents: number;
    };
    engagement_trend: { time: string; score: number }[];
    behavior_distribution: { type: string; count: number }[];
    classroom_comparison: { name: string; engagement: number }[];
    student_ranking: { studentId: string; studentName: string; score: number }[];
    attention_heatmap: {
      period: string;
      monday: number;
      tuesday: number;
      wednesday: number;
      thursday: number;
      friday: number;
    }[];
    recent_alerts: BehaviorAlert[];
    top_events: any[];
    student_timeline: any[];
    timestamp: string;
  };
  error?: string;
}

export const dashboardApi = {
  getAdminSummary: () =>
    api.get<AdminSummaryResponse["data"]>("/dashboard/admin"),

  getTeacherSummary: (teacherId: string) =>
    api.get<TeacherSummaryResponse["data"]>(`/dashboard/teacher/${teacherId}`),

  getLiveAlerts: (activeOnly = false) =>
    api.get<LiveAlertsResponse["data"]>(`/dashboard/alerts?active_only=${activeOnly}`),

  getAttendanceOverview: () =>
    api.get<AttendanceOverviewResponse["data"]>("/dashboard/attendance-overview"),

  getClassroomStatus: () =>
    api.get<ClassroomStatusResponse["data"]>("/dashboard/classroom-status"),

  getStudentRisk: () =>
    api.get<StudentRiskResponse["data"]>("/dashboard/student-risk"),

  getBehaviorAnalytics: () =>
    api.get<BehaviorAnalyticsResponse["data"]>("/dashboard/behavior-analytics"),
};
