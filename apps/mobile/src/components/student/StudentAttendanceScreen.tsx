// ─── SmartCampus AI — Student Attendance Screen ─────────

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';
import { AttendanceCard } from '../shared/AttendanceCard';

const MOCK_ATTENDANCE = {
  overall: 92.5,
  subjects: [
    { name: 'Data Structures', percentage: 96, totalClasses: 30, attended: 29 },
    { name: 'Machine Learning', percentage: 88, totalClasses: 25, attended: 22 },
    { name: 'Database Systems', percentage: 85, totalClasses: 20, attended: 17 },
    { name: 'Algorithms', percentage: 91, totalClasses: 22, attended: 20 },
    { name: 'Computer Networks', percentage: 94, totalClasses: 18, attended: 17 },
    { name: 'Software Engineering', percentage: 100, totalClasses: 15, attended: 15 },
  ],
  monthly: [
    { month: 'Jan', percentage: 88 }, { month: 'Feb', percentage: 92 },
    { month: 'Mar', percentage: 90 }, { month: 'Apr', percentage: 95 },
    { month: 'May', percentage: 93 }, { month: 'Jun', percentage: 96 },
  ],
};

export const StudentAttendanceScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Attendance</Text>

      <View style={styles.overallCard}>
        <Text style={styles.overallPercentage}>{MOCK_ATTENDANCE.overall.toFixed(1)}%</Text>
        <Text style={styles.overallLabel}>Overall Attendance</Text>
        <View style={styles.overallBar}>
          <View style={[styles.overallFill, { width: `${MOCK_ATTENDANCE.overall}%` as any }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Monthly Trend</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartContainer}>
        {MOCK_ATTENDANCE.monthly.map((m, i) => (
          <View key={i} style={styles.barItem}>
            <Text style={styles.barValue}>{m.percentage}%</Text>
            <View style={[styles.bar, { height: (m.percentage / 100) * 80, backgroundColor: m.percentage >= 90 ? colors.success : m.percentage >= 80 ? colors.warning : colors.error }]} />
            <Text style={styles.barLabel}>{m.month}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>
      {MOCK_ATTENDANCE.subjects.map((s, i) => (
        <View key={i} style={styles.subjectCard}>
          <View style={styles.subjectHeader}>
            <Text style={styles.subjectName}>{s.name}</Text>
            <Text style={[styles.subjectPercent, { color: s.percentage >= 90 ? colors.success : s.percentage >= 80 ? colors.warning : colors.error }]}>
              {s.percentage}%
            </Text>
          </View>
          <Text style={styles.subjectDetail}>{s.attended}/{s.totalClasses} classes attended</Text>
          <View style={styles.subjectBar}>
            <View style={[styles.subjectFill, { width: `${s.percentage}%` as any, backgroundColor: s.percentage >= 90 ? colors.success : s.percentage >= 80 ? colors.warning : colors.error }]} />
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  title: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  overallCard: { marginHorizontal: spacing.xl, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: spacing.xl },
  overallPercentage: { color: colors.aiBlue, fontSize: fontSize.display, fontWeight: fontWeight.bold },
  overallLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
  overallBar: { width: '100%', height: 6, backgroundColor: colors.bgGlass, borderRadius: borderRadius.full, overflow: 'hidden', marginTop: spacing.md },
  overallFill: { height: '100%', backgroundColor: colors.aiBlue, borderRadius: borderRadius.full },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semiBold, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  chartContainer: { paddingHorizontal: spacing.xl, gap: spacing.md, marginBottom: spacing.xl },
  barItem: { alignItems: 'center', width: 44 },
  barValue: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.xs },
  bar: { width: 24, borderRadius: borderRadius.sm, marginBottom: spacing.xs },
  barLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  subjectCard: { marginHorizontal: spacing.xl, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semiBold },
  subjectPercent: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  subjectDetail: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },
  subjectBar: { height: 3, backgroundColor: colors.bgGlass, borderRadius: borderRadius.full, overflow: 'hidden', marginTop: spacing.sm },
  subjectFill: { height: '100%', borderRadius: borderRadius.full },
});
