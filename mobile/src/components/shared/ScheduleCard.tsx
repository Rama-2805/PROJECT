// ─── SmartCampus AI — Schedule Card Component ────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface ScheduleCardProps {
  name: string;
  subjectName: string;
  teacherName?: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  isCurrent?: boolean;
  studentCount?: number;
  onPress?: () => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  name, subjectName, teacherName, roomNumber,
  startTime, endTime, isCurrent, studentCount, onPress,
}) => {
  return (
    <View style={[styles.card, isCurrent && styles.currentCard]}>
      {isCurrent && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{startTime}</Text>
        <View style={styles.timeLine} />
        <Text style={styles.timeText}>{endTime}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.subjectName}>{subjectName}</Text>
        <Text style={styles.className}>{name}</Text>
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{roomNumber}</Text>
          </View>
          {teacherName && (
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>👨‍🏫</Text>
              <Text style={styles.detailText}>{teacherName}</Text>
            </View>
          )}
          {studentCount !== undefined && (
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>👥</Text>
              <Text style={styles.detailText}>{studentCount} students</Text>
            </View>
          )}
        </View>
      </View>
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
    flexDirection: 'row',
    marginBottom: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  currentCard: {
    borderColor: colors.aiBlue,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  liveText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  timeColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
    paddingTop: 2,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  timeLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  subjectName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
  className: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
});
