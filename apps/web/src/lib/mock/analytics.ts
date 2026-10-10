export interface AnalyticsOverview {
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  aiRecognitionAccuracy: number;
  activeDevicesPercent: number;
  presentToday: number;
  averageEngagement: number;
  totalAlerts: number;
  studentsAtRisk: number;
}

export interface DepartmentRanking {
  name: string;
  attendance: number;
  engagement: number;
  performanceScore: number;
  totalStudents: number;
  alerts: number;
  trend: "up" | "down" | "stable";
}

export interface ClassroomIntelligence {
  name: string;
  deviceStatus: string;
  engagement: number;
  alerts: number;
  attendance: number;
}

export interface RiskStudent {
  id: string;
  studentId: string;
  name: string;
  department: string;
  attendanceRisk: number;
  engagementRisk: number;
  behaviorRisk: number;
  overallRisk: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  confidence: number;
  timestamp: string;
  isRead: boolean;
}

export interface AIModelPerformance {
  modelName: string;
  version: string;
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  latencyMs: number;
  studentsEnrolled: number;
  lastUpdated: string;
}

export interface DailyTrend {
  date: string;
  attendance: number;
  present: number;
  total: number;
  engagement: number;
  devices: number;
}

const now = Date.now();

export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return Promise.resolve({
    totalStudents: 130,
    totalTeachers: 5,
    averageAttendance: 93.8,
    aiRecognitionAccuracy: 99.2,
    activeDevicesPercent: 100,
    presentToday: 122,
    averageEngagement: 88.5,
    totalAlerts: 0,
    studentsAtRisk: 2,
  });
}

export function getDepartmentRankings(): Promise<DepartmentRanking[]> {
  return Promise.resolve([
    { name: "Computer Science & Engineering", attendance: 93.8, engagement: 88.5, performanceScore: 93.8, totalStudents: 130, alerts: 0, trend: "up" },
  ]);
}

export function getClassroomIntelligence(): Promise<ClassroomIntelligence[]> {
  return Promise.resolve([
    { name: "CSE Room 023", deviceStatus: "OPTIMAL", engagement: 92, alerts: 0, attendance: 94 },
    { name: "CSE Room 402", deviceStatus: "OPTIMAL", engagement: 90, alerts: 0, attendance: 93 },
    { name: "CSE IoT Lab 3", deviceStatus: "OPTIMAL", engagement: 88, alerts: 0, attendance: 95 },
    { name: "CSE Seminar Hall 1", deviceStatus: "OPTIMAL", engagement: 85, alerts: 0, attendance: 92 },
  ]);
}

export function getRiskStudents(): Promise<RiskStudent[]> {
  return Promise.resolve(Array.from({ length: 15 }, (_, i) => {
    const levels: RiskStudent["riskLevel"][] = ["HIGH", "HIGH", "CRITICAL", "MEDIUM", "HIGH", "MEDIUM", "HIGH", "CRITICAL", "MEDIUM", "HIGH", "MEDIUM", "LOW", "HIGH", "MEDIUM", "CRITICAL"];
    const names = [
      "Manish Bose", "Siddharth Saxena", "Karan Nair", "Rahul Mehta",
      "Amit Kumar", "Vikram Singh", "Rohan Verma", "Shreya Agarwal",
      "Pooja Iyer", "Neha Joshi", "Sneha Reddy", "Arjun Sharma",
      "Priya Patel", "Ananya Gupta", "Isha Desai",
    ];
    const depts = ["CSE", "ECE", "ME", "CE", "CSE", "ECE", "ME", "BT", "CSE", "ECE", "ME", "CSE", "ECE", "BT", "CSE"];
    const risk = levels[i];
    const overall = risk === "CRITICAL" ? 85 + Math.random() * 12 : risk === "HIGH" ? 65 + Math.random() * 15 : risk === "MEDIUM" ? 40 + Math.random() * 20 : 15 + Math.random() * 20;
    return {
      id: `risk-${i + 1}`,
      studentId: `CSE2026${String(i + 1).padStart(3, "0")}`,
      name: names[i],
      department: depts[i],
      attendanceRisk: Math.round(20 + Math.random() * 70),
      engagementRisk: Math.round(25 + Math.random() * 65),
      behaviorRisk: Math.round(10 + Math.random() * 80),
      overallRisk: Math.round(overall),
      riskLevel: risk,
      recommendation: risk === "CRITICAL" ? "Immediate teacher intervention required. Schedule parent meeting." :
                      risk === "HIGH" ? "Schedule teacher intervention and counseling session." :
                      risk === "MEDIUM" ? "Monitor closely and assign mentor." :
                      "Continue current approach. Low risk.",
    };
  }));
}

export function getInsights(): Promise<Insight[]> {
  return Promise.resolve([
    { id: "ins-1", title: "CSE Department Attendance Surge", description: "CSE Department attendance has increased by 8% compared to last month, reaching 97.8%. This is the highest among all departments.", category: "ATTENDANCE", severity: "INFO", confidence: 0.95, timestamp: new Date(now - 600000).toISOString(), isRead: false },
    { id: "ins-2", title: "15 Students at Critical Risk", description: "15 students are at risk due to low attendance and repeated low engagement. Immediate intervention recommended for 5 critical cases.", category: "RISK", severity: "CRITICAL", confidence: 0.92, timestamp: new Date(now - 1800000).toISOString(), isRead: false },
    { id: "ins-3", title: "Classroom LAB-301 Device Interruptions", description: "Classroom LAB-301 has reported frequent device interruptions affecting 3 class sessions this week. Edge node maintenance recommended.", category: "DEVICE", severity: "WARNING", confidence: 0.88, timestamp: new Date(now - 3600000).toISOString(), isRead: false },
    { id: "ins-4", title: "Phone Usage Spiking in ME Department", description: "Phone usage detection has increased by 25% in Mechanical Engineering classes this week. Consider classroom policy reminder.", category: "BEHAVIOR", severity: "WARNING", confidence: 0.85, timestamp: new Date(now - 7200000).toISOString(), isRead: false },
    { id: "ins-5", title: "AI Recognition Accuracy Improves", description: "Face recognition accuracy has reached 99.2%, up from 98.7% last week. New enrollment data is improving model performance.", category: "AI_PERFORMANCE", severity: "INFO", confidence: 0.97, timestamp: new Date(now - 14400000).toISOString(), isRead: false },
    { id: "ins-6", title: "Biotechnology Department Engagement High", description: "Biotechnology Department shows 85.2% average engagement, 8% above institution average. Best practices could be shared.", category: "ENGAGEMENT", severity: "INFO", confidence: 0.91, timestamp: new Date(now - 28800000).toISOString(), isRead: false },
    { id: "ins-7", title: "Evening Classes Show Lower Attendance", description: "Attendance in post-4PM classes averages 8% lower than morning sessions. Consider scheduling adjustments.", category: "ATTENDANCE", severity: "WARNING", confidence: 0.83, timestamp: new Date(now - 43200000).toISOString(), isRead: false },
    { id: "ins-8", title: "ME Workshop Temperature Alert", description: "ME Workshop edge node consistently running 15°C above normal. Hardware maintenance check recommended.", category: "DEVICE", severity: "WARNING", confidence: 0.76, timestamp: new Date(now - 86400000).toISOString(), isRead: true },
  ]);
}

export function getAIModelPerformance(): Promise<AIModelPerformance> {
  return Promise.resolve({
    modelName: "SmartCampus Face Recognition",
    version: "v2.1",
    accuracy: 99.1,
    falsePositives: 0.08,
    falseNegatives: 0.82,
    latencyMs: 14,
    studentsEnrolled: 130,
    lastUpdated: new Date(now - 604800000).toISOString(),
  });
}

export function getDailyTrends(): Promise<DailyTrend[]> {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Promise.resolve(Array.from({ length: 7 }, (_, i) => {
    const total = 130;
    const rate = i === 5 ? 91.2 : i === 6 ? 89.6 : 93.1 + (i * 0.3);
    const present = Math.round(total * rate / 100);
    return {
      date: days[i],
      attendance: Math.round(rate * 10) / 10,
      present,
      total,
      engagement: 88,
      devices: 6,
    };
  }));
}

export function getWeeklyComparison(): Promise<{ week: string; rate: number }[]> {
  return Promise.resolve([
    { week: "Week 1", rate: 93.2 },
    { week: "Week 2", rate: 94.8 },
    { week: "Week 3", rate: 94.1 },
    { week: "Week 4", rate: 95.6 },
    { week: "Week 5", rate: 96.3 },
    { week: "Week 6", rate: 95.8 },
    { week: "Week 7", rate: 97.1 },
    { week: "Week 8", rate: 96.5 },
  ]);
}
