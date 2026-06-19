// ─── SmartCampus AI — Teacher Dashboard Screen ───────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';
import { ScheduleCard } from '../shared/ScheduleCard';
import { NotificationCard } from '../shared/NotificationCard';

const MOCK_TEACHER = {
  name: 'Dr. Arjun Verma',
  employeeId: 'TCH-2024001',
  department: 'Computer Science',
  todayClasses: [
    { id: 'c1', name: 'Lecture 12', subjectName: 'Data Structures', roomNumber: 'CSE-101', startTime: '09:00', endTime: '10:30', studentCount: 60, isActive: true, hasSession: false },
    { id: 'c2', name: 'Lab 5', subjectName: 'Database Systems', roomNumber: 'LAB-201', startTime: '11:00', endTime: '13:00', studentCount: 30, isActive: false, hasSession: false },
  ],
  activeSession: {
    id: 's1', sessionId: 'SES-20250616-001', classroomName: 'CSE-101',
    subjectName: 'Data Structures', totalStudents: 60, totalPresent: 48,
    startedAt: '09:00 AM', duration: 45, recognitionAccuracy: 97.5, unknownFaces: 2,
    liveEvents: [
      { id: 'e1', type: 'ATTENDANCE', studentName: 'Rahul Sharma', studentId: 'CSE2026015', confidence: 0.98, time: '09:02' },
      { id: 'e2', type: 'ATTENDANCE', studentName: 'Priya Singh', studentId: 'CSE2026018', confidence: 0.96, time: '09:02' },
    ],
  },
  recentAlerts: [
    { id: 'al1', type: 'LOW_ENGAGEMENT', title: 'Low Engagement Warning', description: 'Engagement dropped 15% in CSE-101. 12 students showing signs of distraction.', severity: 'WARNING', classroom: 'CSE-101', createdAt: '2 min ago', isRead: false },
    { id: 'al2', type: 'UNKNOWN_PERSON', title: 'Unknown Person Detected', description: 'Unrecognized face detected near entrance of LAB-201.', severity: 'INFO', classroom: 'LAB-201', createdAt: '15 min ago', isRead: false },
  ],
  stats: { totalClassesToday: 2, totalStudentsTracked: 90, averageAttendance: 92, activeAlerts: 2 },
};

export const TeacherDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aiBlue} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dr. Arjun Verma 👨‍🏫</Text>
            <Text style={styles.subtitle}>{MOCK_TEACHER.department} • {MOCK_TEACHER.employeeId}</Text>
          </View>
          <TouchableOpacity style={styles.liveIndicator} onPress={() => navigation.navigate('Alerts')}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{MOCK_TEACHER.stats.activeAlerts} Alerts</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: colors.success + '30' }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{MOCK_TEACHER.stats.averageAttendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.aiBlue + '30' }]}>
            <Text style={[styles.statValue, { color: colors.aiBlue }]}>{MOCK_TEACHER.stats.totalStudentsTracked}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.aiPurple + '30' }]}>
            <Text style={[styles.statValue, { color: colors.aiPurple }]}>{MOCK_TEACHER.stats.totalClassesToday}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
        </View>

        {/* Active Session */}
        {sessionActive && MOCK_TEACHER.activeSession && (
          <View style={styles.activeSessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionLiveBadge}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.sessionLiveText}>LIVE SESSION</Text>
              </View>
              <Text style={styles.sessionDuration}>{MOCK_TEACHER.activeSession.duration} min</Text>
            </View>
            <Text style={styles.sessionTitle}>{MOCK_TEACHER.activeSession.subjectName}</Text>
            <Text style={styles.sessionLocation}>{MOCK_TEACHER.activeSession.classroomName}</Text>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStatItem}>
                <Text style={styles.sessionStatValue}>{MOCK_TEACHER.activeSession.totalPresent}</Text>
                <Text style={styles.sessionStatLabel}>Present</Text>
              </View>
              <View style={styles.sessionStatItem}>
                <Text style={[styles.sessionStatValue, { color: colors.error }]}>{MOCK_TEACHER.activeSession.totalStudents - MOCK_TEACHER.activeSession.totalPresent}</Text>
                <Text style={styles.sessionStatLabel}>Absent</Text>
              </View>
              <View style={styles.sessionStatItem}>
                <Text style={[styles.sessionStatValue, { color: colors.warning }]}>{MOCK_TEACHER.activeSession.unknownFaces}</Text>
                <Text style={styles.sessionStatLabel}>Unknown</Text>
              </View>
              <View style={styles.sessionStatItem}>
                <Text style={[styles.sessionStatValue, { color: colors.aiBlue }]}>{MOCK_TEACHER.activeSession.recognitionAccuracy}%</Text>
                <Text style={styles.sessionStatLabel}>Accuracy</Text>
              </View>
            </View>
            <View style={styles.sessionActions}>
              <TouchableOpacity style={styles.sessionActionBtn} onPress={() => navigation.navigate('LiveMonitoring')}>
                <Text style={styles.sessionActionText}>View Live</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sessionActionBtn, styles.endSessionBtn]}>
                <Text style={[styles.sessionActionText, { color: colors.error }]}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.seeAll}>All Classes</Text>
            </TouchableOpacity>
          </View>
          {MOCK_TEACHER.todayClasses.map((cls) => (
            <ScheduleCard key={cls.id} {...cls} isCurrent={cls.isActive} />
          ))}
        </View>

        {/* Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.seeAll}>All Alerts</Text>
            </TouchableOpacity>
          </View>
          {MOCK_TEACHER.recentAlerts.map((alert) => (
            <NotificationCard
              key={alert.id}
              type={alert.severity === 'WARNING' ? 'ALERT' : 'SYSTEM'}
              title={alert.title}
              body={alert.description}
              createdAt={alert.createdAt}
              isRead={alert.isRead}
              onPress={() => {}}
            />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('LiveMonitoring')}>
            <Text style={styles.actionIcon}>📹</Text>
            <Text style={styles.actionLabel}>Live View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('AttendanceActions')}>
            <Text style={styles.actionIcon}>✅</Text>
            <Text style={styles.actionLabel}>Mark Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionLabel}>QR Code</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  greeting: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error, marginRight: spacing.xs },
  liveText: { color: colors.error, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  activeSessionCard: { marginHorizontal: spacing.xl, backgroundColor: 'rgba(52, 211, 153, 0.08)', borderRadius: borderRadius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.success + '40', marginBottom: spacing.xl },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sessionLiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successBg, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  liveIndicatorDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.success, marginRight: 4 },
  sessionLiveText: { color: colors.success, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  sessionDuration: { color: colors.textMuted, fontSize: fontSize.sm },
  sessionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sessionLocation: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
  sessionStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border },
  sessionStatItem: { alignItems: 'center' },
  sessionStatValue: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  sessionStatLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  sessionActions: { flexDirection: 'row', gap: spacing.sm },
  sessionActionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.bgCard, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  sessionActionText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  endSessionBtn: { borderColor: colors.error + '30' },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semiBold },
  seeAll: { color: colors.aiBlue, fontSize: fontSize.sm },
  quickActions: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.md },
  actionButton: { flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: spacing.xs },
  actionLabel: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
