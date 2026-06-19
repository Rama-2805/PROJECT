export type BehaviorType =
  | "ATTENTIVE"
  | "SLEEPING"
  | "PHONE_USAGE"
  | "DISTRACTED"
  | "ABSENT_FROM_SEAT"
  | "UNKNOWN";

export interface BehaviorEvent {
  id: string;
  studentId: string;
  studentName: string;
  behaviorType: BehaviorType;
  confidence: number;
  duration: number; // seconds
  timestamp: string;
  classroomId: string;
}

export interface EngagementRecord {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  attentionScore: number;
  postureScore: number;
  phonePenalty: number;
  activityScore: number;
  timestamp: string;
}

export interface BehaviorAlert {
  id: string;
  studentId: string;
  studentName: string;
  behaviorType: BehaviorType;
  severity: "INFO" | "WARNING" | "CRITICAL";
  confidence: number;
  status: "ACTIVE" | "ACKNOWLEDGED" | "DISMISSED";
  acknowledgedBy?: string;
  createdAt: string;
}

export interface BehaviorAnalytics {
  overview: {
    averageEngagement: number;
    phoneEvents: number;
    attentionLevel: number;
    highRiskStudents: number;
  };
  engagementTrend: { time: string; score: number }[];
  behaviorDistribution: { type: BehaviorType; count: number }[];
  classroomComparison: { name: string; engagement: number }[];
  studentRanking: { studentId: string; studentName: string; score: number }[];
  attentionHeatmap: { period: string; monday: number; tuesday: number; wednesday: number; thursday: number; friday: number }[];
  recentAlerts: BehaviorAlert[];
  topEvents: BehaviorEvent[];
  studentTimeline: BehaviorEvent[];
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

const BEHAVIOR_TYPES: BehaviorType[] = [
  "ATTENTIVE", "ATTENTIVE", "ATTENTIVE", // weighted
  "DISTRACTED",
  "PHONE_USAGE",
  "SLEEPING",
  "ABSENT_FROM_SEAT",
  "UNKNOWN",
];

function randomBehaviorType(): BehaviorType {
  return BEHAVIOR_TYPES[Math.floor(Math.random() * BEHAVIOR_TYPES.length)];
}

function generateTimeline(): BehaviorEvent[] {
  const events: BehaviorEvent[] = [];
  const baseTime = Date.now() - 7200000; // 2 hours ago
  for (let i = 0; i < 30; i++) {
    const student = STUDENTS[Math.floor(Math.random() * STUDENTS.length)];
    const type = randomBehaviorType();
    events.push({
      id: `BEH_${String(i + 1).padStart(3, "0")}`,
      studentId: student.id,
      studentName: student.name,
      behaviorType: type,
      confidence: parseFloat((0.75 + Math.random() * 0.24).toFixed(2)),
      duration: Math.floor(Math.random() * 300 + 10),
      timestamp: new Date(baseTime + i * 240000).toISOString(),
      classroomId: "room-023",
    });
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateEngagementRecords(): EngagementRecord[] {
  return STUDENTS.map((s, i) => {
    const baseScore = 65 + Math.floor(Math.random() * 35);
    const phonePenalty = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0;
    const score = Math.max(0, Math.min(100, baseScore - phonePenalty));
    return {
      id: `ENG_${String(i + 1).padStart(3, "0")}`,
      studentId: s.id,
      studentName: s.name,
      score,
      level: score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW",
      attentionScore: Math.floor(Math.random() * 40 + 60),
      postureScore: Math.floor(Math.random() * 30 + 55),
      phonePenalty,
      activityScore: Math.floor(Math.random() * 35 + 50),
      timestamp: new Date().toISOString(),
    };
  });
}

export function getBehaviorAnalytics(): Promise<BehaviorAnalytics> {
  const timeline = generateTimeline();
  const engagementRecords = generateEngagementRecords();

  const behaviorCounts = {} as Record<BehaviorType, number>;
  timeline.forEach((e) => {
    behaviorCounts[e.behaviorType] = (behaviorCounts[e.behaviorType] || 0) + 1;
  });

  const phoneEvents = timeline.filter((e) => e.behaviorType === "PHONE_USAGE").length;
  const highRiskStudents = engagementRecords.filter((r) => r.level === "LOW").length;
  const avgEngagement = Math.round(engagementRecords.reduce((s, r) => s + r.score, 0) / engagementRecords.length);
  const avgAttention = Math.round(engagementRecords.reduce((s, r) => s + r.attentionScore, 0) / engagementRecords.length);

  return Promise.resolve({
    overview: {
      averageEngagement: avgEngagement,
      phoneEvents,
      attentionLevel: avgAttention,
      highRiskStudents,
    },
    engagementTrend: Array.from({ length: 12 }, (_, i) => ({
      time: `${(i * 5).toString().padStart(2, "0")}:00`,
      score: Math.round(70 + Math.sin(i * 0.5) * 12 + Math.random() * 10),
    })),
    behaviorDistribution: Object.entries(behaviorCounts).map(([type, count]) => ({
      type: type as BehaviorType,
      count,
    })),
    classroomComparison: [
      { name: "CSE Lab 301", engagement: avgEngagement + 3 },
      { name: "ECE Lab 202", engagement: avgEngagement - 5 },
      { name: "ME Workshop", engagement: avgEngagement + 1 },
      { name: "Physics Lab", engagement: avgEngagement - 2 },
      { name: "Math Lecture", engagement: avgEngagement + 7 },
    ],
    studentRanking: [...engagementRecords]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        score: r.score,
      })),
    attentionHeatmap: [
      { period: "08:00-09:00", monday: 78, tuesday: 82, wednesday: 75, thursday: 80, friday: 72 },
      { period: "09:00-10:00", monday: 88, tuesday: 91, wednesday: 85, thursday: 90, friday: 84 },
      { period: "10:00-11:00", monday: 92, tuesday: 88, wednesday: 94, thursday: 91, friday: 86 },
      { period: "11:00-12:00", monday: 85, tuesday: 79, wednesday: 82, thursday: 76, friday: 73 },
      { period: "12:00-13:00", monday: 65, tuesday: 62, wednesday: 58, thursday: 61, friday: 55 },
      { period: "13:00-14:00", monday: 72, tuesday: 75, wednesday: 70, thursday: 74, friday: 68 },
    ],
    recentAlerts: [
      { id: "ALERT_001", studentId: "CSE2026005", studentName: "Vikram Singh", behaviorType: "PHONE_USAGE", severity: "WARNING", confidence: 0.94, status: "ACTIVE", createdAt: new Date(Date.now() - 300000).toISOString() },
      { id: "ALERT_002", studentId: "CSE2026011", studentName: "Amit Kumar", behaviorType: "SLEEPING", severity: "WARNING", confidence: 0.88, status: "ACTIVE", createdAt: new Date(Date.now() - 600000).toISOString() },
      { id: "ALERT_003", studentId: "CSE2026009", studentName: "Rahul Mehta", behaviorType: "DISTRACTED", severity: "INFO", confidence: 0.79, status: "ACTIVE", createdAt: new Date(Date.now() - 900000).toISOString() },
      { id: "ALERT_004", studentId: "CSE2026015", studentName: "Manish Bose", behaviorType: "PHONE_USAGE", severity: "CRITICAL", confidence: 0.96, status: "ACTIVE", createdAt: new Date(Date.now() - 1200000).toISOString() },
      { id: "ALERT_005", studentId: "CSE2026007", studentName: "Karan Nair", behaviorType: "DISTRACTED", severity: "INFO", confidence: 0.72, status: "ACKNOWLEDGED", createdAt: new Date(Date.now() - 1800000).toISOString() },
    ],
    topEvents: timeline.slice(0, 10),
    studentTimeline: timeline,
  });
}
