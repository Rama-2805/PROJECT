// ─── SmartCampus AI — Notification Card Component ────────

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface NotificationCardProps {
  type: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  onPress?: () => void;
}

const typeConfig: Record<string, { color: string; icon: string }> = {
  ATTENDANCE: { color: colors.aiBlue, icon: '✅' },
  ALERT: { color: colors.error, icon: '⚠️' },
  SYSTEM: { color: colors.textMuted, icon: '⚙️' },
  ANNOUNCEMENT: { color: colors.aiPurple, icon: '📢' },
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  type, title, body, createdAt, isRead, onPress,
}) => {
  const config = typeConfig[type] || { color: colors.textMuted, icon: '📋' };

  return (
    <TouchableOpacity
      style={[styles.card, !isRead && styles.unreadCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` as string }]}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, !isRead && styles.unreadTitle]}>{title}</Text>
          {!isRead && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>{body}</Text>
        <Text style={styles.time}>{createdAt}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderColor: colors.aiBlue + '30',
    backgroundColor: 'rgba(34, 211, 238, 0.03)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  unreadTitle: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semiBold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  body: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  time: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
