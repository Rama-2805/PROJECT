// ─── SmartCampus AI — Attendance Card Component ──────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface AttendanceCardProps {
  subjectName?: string;
  date?: string;
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';
  percentage?: number;
  type?: 'daily' | 'subject' | 'summary';
}

const statusConfig = {
  PRESENT: { color: colors.success, bg: colors.successBg, label: 'Present' },
  ABSENT: { color: colors.error, bg: colors.errorBg, label: 'Absent' },
  LATE: { color: colors.warning, bg: colors.warningBg, label: 'Late' },
  NOT_MARKED: { color: colors.textMuted, bg: colors.bgGlass, label: 'Not Marked' },
};

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  subjectName,
  date,
  status,
  percentage = 0,
  type = 'daily',
}) => {
  const config = status ? statusConfig[status] : null;
  const percentColor = percentage >= 85 ? colors.success : percentage >= 70 ? colors.warning : colors.error;

  if (type === 'summary') {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.percentageContainer}>
          <Text style={[styles.percentageText, { color: percentColor }]}>
            {percentage.toFixed(1)}%
          </Text>
          <Text style={styles.percentageLabel}>Attendance</Text>
        </View>
        <View style={styles.ring}>
          <View style={[styles.ringFill, { width: `${Math.min(percentage, 100)}%` as any }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.subjectName}>{subjectName || 'Unknown Subject'}</Text>
        {config && (
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <View style={[styles.dot, { backgroundColor: config.color }]} />
            <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        )}
      </View>
      {date && <Text style={styles.date}>{date}</Text>}
      {percentage > 0 && (
        <View style={styles.miniProgress}>
          <View style={[styles.miniProgressFill, { backgroundColor: percentColor, width: `${Math.min(percentage, 100)}%` as any }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  miniProgress: {
    height: 3,
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  percentageText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  percentageLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  ring: {
    width: '100%',
    height: 6,
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  ringFill: {
    height: '100%',
    backgroundColor: colors.aiBlue,
    borderRadius: borderRadius.full,
  },
});
