// ─── SmartCampus AI — Parent Dashboard Screen ───────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';
import { NotificationCard } from '../shared/NotificationCard';

const MOCK_PARENT = {
  studentName: 'Rahul Sharma',
  studentId: 'CSE2026015',
  department: 'Computer Science',
  attendancePercentage: 92.5,
  engagementAverage: 78,
  recentAlerts: [
    { id: 'a1', type: 'ATTENDANCE' as const, title: 'Attendance Update', body: 'Rahul attended Data Structures at 9:00 AM today.', severity: 'INFO' as const, createdAt: 'Today at 9:05 AM', isRead: false },
    { id: 'a2', type: 'ALERT' as const, title: 'Attendance Drop', body: 'Attendance dropped below 75% in Database Systems. Please review.', severity: 'WARNING' as const, createdAt: 'Yesterday at 2:30 PM', isRead: false },
    { id: 'a3', type: 'ALERT' as const, title: 'Unusual Absence', body: 'Rahul was absent for Machine Learning lab without prior notice.', severity: 'WARNING' as const, createdAt: 'Jun 14 at 11:00 AM', isRead: true },
    { id: 'a4', type: 'ATTENDANCE' as const, title: 'Weekly Report', body: 'Weekly attendance: 94% (up 2% from last week). Great improvement!', severity: 'INFO' as const, createdAt: 'Jun 12 at 6:00 PM', isRead: true },
  ],
  weeklyTrend: [88, 90, 87, 92, 94, 91, 96],
};

export const ParentDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState(MOCK_PARENT.recentAlerts);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.aiBlue} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Parent Dashboard 👨‍👩‍👧‍👦</Text>
            <Text style={styles.subtitle}>{MOCK_PARENT.studentName} • {MOCK_PARENT.department}</Text>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Student Overview */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { borderColor: colors.success + '30' }]}>
            <Text style={[styles.overviewValue, { color: colors.success }]}>{MOCK_PARENT.attendancePercentage}%</Text>
            <Text style={styles.overviewLabel}>Attendance</Text>
          </View>
          <View style={[styles.overviewCard, { borderColor: colors.aiPurple + '30' }]}>
            <Text style={[styles.overviewValue, { color: colors.aiPurple }]}>{MOCK_PARENT.engagementAverage}</Text>
            <Text style={styles.overviewLabel}>Engagement</Text>
          </View>
        </View>

        {/* Weekly Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Attendance Trend</Text>
          <View style={styles.trendCard}>
            <View style={styles.trendRow}>
              {MOCK_PARENT.weeklyTrend.map((val, i) => (
                <View key={i} style={styles.trendItem}>
                  <View style={[styles.trendBar, { height: (val / 100) * 60, backgroundColor: val >= 90 ? colors.success : val >= 80 ? colors.warning : colors.error }]} />
                  <Text style={styles.trendLabel}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {alerts.slice(0, 3).map((alert) => (
            <NotificationCard key={alert.id} {...alert} onPress={() => {}} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Analytics')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Contact')}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>Contact</Text>
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
  bellButton: { padding: spacing.xs, position: 'relative' },
  bellIcon: { fontSize: 24 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: colors.error, borderRadius: borderRadius.full, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: fontWeight.bold },
  overviewRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.xl },
  overviewCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, alignItems: 'center' },
  overviewValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  overviewLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semiBold, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  seeAll: { color: colors.aiBlue, fontSize: fontSize.sm },
  trendCard: { marginHorizontal: spacing.xl, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 },
  trendItem: { alignItems: 'center', flex: 1 },
  trendBar: { width: 20, borderRadius: borderRadius.sm, marginBottom: spacing.xs },
  trendLabel: { color: colors.textMuted, fontSize: 9 },
  quickActions: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.md },
  actionButton: { flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: spacing.xs },
  actionLabel: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});
