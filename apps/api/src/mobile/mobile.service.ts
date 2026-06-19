// ─── SmartCampus AI — Mobile API Service ────────────────

import { Injectable } from '@nestjs/common';

@Injectable()
export class MobileService {
  // In-memory store — replace with Prisma in production
  private sessions = new Map<string, any>();
  private notifications = new Map<string, any>();

  // ── Student Endpoints ─────────────────────────────────

  async getStudentDashboard(studentId: string) {
    return {
      id: 'stu-001',
      studentId: 'CSE2026015',
      fullName: 'Rahul Sharma',
      department: 'Computer Science',
      semester: 6,
      attendancePercentage: 92.5,
      engagementScore: 78,
      todayAttendance: { date: new Date().toISOString().split('T')[0], status: 'PRESENT', subjectName: 'Data Structures', time: '09:00 AM' },
      upcomingClasses: [
        { id: '1', name: 'Lecture 12', subjectName: 'Data Structures', teacherName: 'Dr. Verma', roomNumber: 'CSE-101', startTime: '09:00', endTime: '10:30', dayOfWeek: 1, isCurrent: true },
        { id: '2', name: 'Lab 5', subjectName: 'Database Systems', teacherName: 'Prof. Singh', roomNumber: 'LAB-201', startTime: '11:00', endTime: '13:00', dayOfWeek: 1, isCurrent: false },
      ],
      aiInsights: [
        { id: 'i1', title: 'Attendance Improved', description: 'Your attendance improved by 7% this month.', category: 'ATTENDANCE', severity: 'INFO', confidence: 95, generatedAt: new Date().toISOString() },
        { id: 'i2', title: 'Best Engagement Time', description: 'You are most engaged during morning lectures.', category: 'ENGAGEMENT', severity: 'INFO', confidence: 88, generatedAt: new Date().toISOString() },
      ],
      academicStats: { totalClasses: 120, attendedClasses: 111, missedClasses: 9, attendanceTrend: 7, averageEngagement: 78, bestSubject: 'Data Structures', needsImprovement: 'Database Systems' },
    };
  }

  async getStudentAttendance(studentId: string) {
    return {
      overall: 92.5,
      subjects: [
        { name: 'Data Structures', percentage: 96, totalClasses: 30, attended: 29 },
        { name: 'Machine Learning', percentage: 88, totalClasses: 25, attended: 22 },
        { name: 'Database Systems', percentage: 85, totalClasses: 20, attended: 17 },
        { name: 'Algorithms', percentage: 91, totalClasses: 22, attended: 20 },
      ],
      monthly: [
        { month: 'Jan', percentage: 88 }, { month: 'Feb', percentage: 92 },
        { month: 'Mar', percentage: 90 }, { month: 'Apr', percentage: 95 },
        { month: 'May', percentage: 93 }, { month: 'Jun', percentage: 96 },
      ],
    };
  }

  async getStudentInsights(studentId: string) {
    return [
      { id: 'i1', title: 'Attendance Improved 7%', description: 'Your attendance improved significantly this month.', category: 'ATTENDANCE', severity: 'INFO', confidence: 95, generatedAt: new Date().toISOString() },
      { id: 'i2', title: 'Morning Person', description: 'You perform best in morning lectures (9-11 AM).', category: 'ENGAGEMENT', severity: 'INFO', confidence: 88, generatedAt: new Date().toISOString() },
      { id: 'i3', title: 'Database Alert', description: 'Engagement in Database Systems dropped 15%.', category: 'ENGAGEMENT', severity: 'WARNING', confidence: 82, generatedAt: new Date().toISOString() },
    ];
  }

  async getStudentSchedule(studentId: string) {
    return [
      { id: 's1', name: 'Lecture 12', subjectName: 'Data Structures', teacherName: 'Dr. Verma', roomNumber: 'CSE-101', startTime: '09:00', endTime: '10:30', dayOfWeek: 1, isCurrent: true },
      { id: 's2', name: 'Lab 5', subjectName: 'Database Systems', teacherName: 'Prof. Singh', roomNumber: 'LAB-201', startTime: '11:00', endTime: '13:00', dayOfWeek: 1, isCurrent: false },
      { id: 's3', name: 'Tutorial 3', subjectName: 'Machine Learning', teacherName: 'Dr. Patel', roomNumber: 'CSE-103', startTime: '14:00', endTime: '15:30', dayOfWeek: 1, isCurrent: false },
    ];
  }

  async sendChatMessage(message: string) {
    const responses: Record<string, string> = {
      attendance: 'You have attended 111 out of 120 classes (92.5%).',
      missed: "You've missed 9 classes. Database Systems has the most absences.",
      percentage: 'Your overall attendance is 92.5%. Data Structures: 96%, ML: 88%.',
      next: 'Your next class is Data Structures with Dr. Verma in CSE-101 at 9:00 AM.',
    };

    const lower = message.toLowerCase();
    let response = responses.attendance;
    if (lower.includes('missed') || lower.includes('absent')) response = responses.missed;
    if (lower.includes('percentage')) response = responses.percentage;
    if (lower.includes('next') || lower.includes('schedule')) response = responses.next;

    return { response, confidence: 0.95 };
  }

  // ── Parent Endpoints ──────────────────────────────────

  async getParentDashboard(parentId: string) {
    return {
      studentName: 'Rahul Sharma',
      studentId: 'CSE2026015',
      department: 'Computer Science',
      attendancePercentage: 92.5,
      engagementAverage: 78,
      weeklyTrend: [88, 90, 87, 92, 94, 91, 96],
      recentAlerts: [
        { id: 'a1', type: 'ATTENDANCE', title: 'Attendance Update', description: 'Rahul attended Data Structures at 9:00 AM.', severity: 'INFO', createdAt: new Date().toISOString(), isRead: false },
        { id: 'a2', type: 'ALERT', title: 'Attendance Drop', description: 'Attendance dropped below 75% in Database Systems.', severity: 'WARNING', createdAt: new Date().toISOString(), isRead: false },
      ],
    };
  }

  async getParentAnalytics(parentId: string) {
    return {
      monthlyReports: [
        { month: 'January', attendance: 88, engagement: 72 },
        { month: 'February', attendance: 92, engagement: 75 },
        { month: 'March', attendance: 90, engagement: 78 },
        { month: 'April', attendance: 95, engagement: 80 },
        { month: 'May', attendance: 93, engagement: 76 },
        { month: 'June', attendance: 96, engagement: 82 },
      ],
      subjectPerformance: [
        { subject: 'Data Structures', grade: 'A', attendance: 96 },
        { subject: 'Machine Learning', grade: 'B+', attendance: 88 },
        { subject: 'Database Systems', grade: 'B', attendance: 85 },
        { subject: 'Algorithms', grade: 'A-', attendance: 91 },
      ],
    };
  }

  async getParentNotifications(parentId: string) {
    return [
      { id: 'n1', type: 'ATTENDANCE', title: 'Class Attended', body: 'Rahul attended Data Structures at 9:00 AM', createdAt: new Date().toISOString(), isRead: false },
      { id: 'n2', type: 'ALERT', title: 'Low Attendance Warning', body: 'Attendance in Database Systems is below 75%', createdAt: new Date().toISOString(), isRead: false },
      { id: 'n3', type: 'ANNOUNCEMENT', title: 'Schedule Update', body: 'Tomorrow\'s classes have been rescheduled due to faculty meeting.', createdAt: new Date().toISOString(), isRead: true },
    ];
  }

  // ── Teacher Endpoints ─────────────────────────────────

  async getTeacherClasses(teacherId: string) {
    return [
      { id: 'c1', name: 'Lecture 12', subjectName: 'Data Structures', roomNumber: 'CSE-101', startTime: '09:00', endTime: '10:30', studentCount: 60, isActive: true },
      { id: 'c2', name: 'Lab 5', subjectName: 'Database Systems', roomNumber: 'LAB-201', startTime: '11:00', endTime: '13:00', studentCount: 30, isActive: false },
      { id: 'c3', name: 'Tutorial', subjectName: 'Algorithms', roomNumber: 'CSE-103', startTime: '14:00', endTime: '15:30', studentCount: 45, isActive: false },
    ];
  }

  async startSession(classroomId: string, subjectName: string) {
    const sessionId = `SES-${Date.now()}`;
    const session = {
      sessionId,
      classroomId,
      subjectName,
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      totalStudents: 60,
      totalPresent: 0,
    };
    this.sessions.set(sessionId, session);
    return { success: true, sessionId, message: 'Session started successfully' };
  }

  async endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, message: 'Session not found' };
    session.status = 'ENDED';
    return { success: true, message: 'Session ended', summary: { totalPresent: session.totalPresent } };
  }

  async getTeacherAlerts(teacherId: string) {
    return [
      { id: 'al1', type: 'LOW_ENGAGEMENT', title: 'Low Engagement in CSE-101', description: '12 students showing distraction signs.', severity: 'WARNING', classroom: 'CSE-101', createdAt: new Date().toISOString(), isRead: false },
      { id: 'al2', type: 'UNKNOWN_PERSON', title: 'Unknown Person', description: 'Unrecognized face near LAB-201 entrance.', severity: 'INFO', classroom: 'LAB-201', createdAt: new Date().toISOString(), isRead: false },
    ];
  }

  async generateQRCode(sessionId: string) {
    return {
      qrData: JSON.stringify({ sessionId, generatedAt: Date.now(), expiresAt: Date.now() + 300000 }),
      expiresInSeconds: 300,
    };
  }

  async scanQRCode(qrData: string) {
    try {
      const data = JSON.parse(qrData);
      if (Date.now() > data.expiresAt) {
        return { success: false, message: 'QR code has expired' };
      }
      return { success: true, message: 'Attendance recorded', confidence: 1.0 };
    } catch {
      return { success: false, message: 'Invalid QR code' };
    }
  }

  // ── Notifications ─────────────────────────────────────

  async getNotifications(userId: string) {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  async markNotificationRead(notificationId: string) {
    const notification = this.notifications.get(notificationId);
    if (notification) notification.isRead = true;
    return { success: true };
  }

  async registerDeviceToken(userId: string, token: string) {
    // Store device token for push notifications
    return { success: true, message: 'Device registered' };
  }
}
