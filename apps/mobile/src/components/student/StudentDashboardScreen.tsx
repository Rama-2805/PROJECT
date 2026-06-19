// ─── SmartCampus AI — Student Dashboard Screen ──────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';
import { AttendanceCard } from '../shared/AttendanceCard';
import { ScheduleCard } from '../shared/ScheduleCard';
import { AIInsightCard } from '../shared/AIInsightCard';

// Mock data for demonstration
const MOCK_DASHBOARD = {
  fullName: 'Rahul Sharma',
  studentId: 'CSE2026015',
  department: 'Computer Science',
  semester: 6,
  attendancePercentage: 92.5,
  engagementScore: 78,
  todayAttendance: { date: '2025-06-16', status: 'PRESENT' as const, subjectName: 'Data Structures', time: '09:00 AM' },
  upcomingClasses: [
    { id: '1', name: 'Lecture 12', subjectName: 'Data Structures', teacherName: 'Dr. Verma', roomNumber: 'CSE-101', startTime: '09:00', endTime: '10:30', dayOfWeek: 1, isCurrent: true },
    { id: '2', name: 'Lab 5', subjectName: 'Database Systems', teacherName: 'Prof. Singh', roomNumber: 'LAB-201', startTime: '11:00', endTime: '13:00', dayOfWeek: 1, isCurrent: false },
    { id: '3', name: 'Tutorial 3', subjectName: 'Machine Learning', teacherName: 'Dr. Patel', roomNumber: 'CSE-103', startTime: '14:00', endTime: '15:30', dayOfWeek: 1, isCurrent: false },
  ],
  aiInsights: [
    { id: 'i1', title: 'Attendance Improved', description: 'Your attendance improved by 7% this month. Great consistency!', category: 'ATTENDANCE', severity: 'INFO' as const, confidence: 95, generatedAt: '2025-06-15' },
    { id: 'i2', title: 'Best Engagement Time', description: 'You are most engaged during morning lectures (9-11 AM). Try scheduling important classes early.', category: 'ENGAGEMENT', severity: 'INFO' as const, confidence: 88, generatedAt: '2025-06-14' },
    { id: 'i3', title: 'Low Engagement Alert', description: 'Your engagement in Database Systems lab has dropped 15%. Consider more active participation.', category: 'ENGAGEMENT', severity: 'WARNING' as const, confidence: 82, generatedAt: '2025-06-13' },
  ],
  academicStats: { totalClasses: 120, attendedClasses: 111, missedClasses: 9, attendanceTrend: 7, averageEngagement: 78, bestSubject: 'Data Structures', needsImprovement: 'Database Systems' },
};

export const StudentDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(MOCK_DASHBOARD);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const attendanceColor = dashboard.attendancePercentage >= 85 ? colors.success
    : dashboard.attendancePercentage >= 70 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aiBlue} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {dashboard.fullName.split(' ')[0]} 👋</Text>
            <Text style={styles.subtitle}>{dashboard.department} • Semester {dashboard.semester}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RS</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Attendance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Attendance</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <AttendanceCard
            subjectName={dashboard.todayAttendance.subjectName}
            date={`${dashboard.todayAttendance.date} • ${dashboard.todayAttendance.time}`}
            status={dashboard.todayAttendance.status}
          />
        </View>

        {/* Attendance Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: attendanceColor + '30' }]}>
            <Text style={[styles.statValue, { color: attendanceColor }]}>
              {dashboard.attendancePercentage.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.aiPurple + '30' }]}>
            <Text style={[styles.statValue, { color: colors.aiPurple }]}>
              {dashboard.engagementScore}
            </Text>
            <Text style={styles.statLabel}>Engagement</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.aiBlue + '30' }]}>
            <Text style={[styles.statValue, { color: colors.aiBlue }]}>
              {dashboard.academicStats.attendedClasses}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.error + '30' }]}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {dashboard.academicStats.missedClasses}
            </Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
        </View>

        {/* Upcoming Classes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
              <Text style={styles.seeAll}>Full Schedule</Text>
            </TouchableOpacity>
          </View>
          {dashboard.upcomingClasses.map((cls) => (
            <ScheduleCard key={cls.id} {...cls} />
          ))}
        </View>

        {/* AI Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Insights')}>
              <Text style={styles.seeAll}>All Insights</Text>
            </TouchableOpacity>
          </View>
          {dashboard.aiInsights.map((insight) => (
            <AIInsightCard key={insight.id} {...insight} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.actionIcon}>🤖</Text>
            <Text style={styles.actionLabel}>AI Assistant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('QRScan')}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg,
  },
  greeting: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
  profileButton: { padding: spacing.xs },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.aiBlue, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semiBold },
  seeAll: { color: colors.aiBlue, fontSize: fontSize.sm },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl, gap: spacing.sm,
  },
  statCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, alignItems: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  quickActions: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  actionButton: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 24, marginBottom: spacing.xs },
  actionLabel: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
