// ─── SmartCampus AI — Profile Card Component ─────────────

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface ProfileCardProps {
  fullName: string;
  role: string;
  department?: string;
  semester?: number;
  studentId?: string;
  employeeId?: string;
  email?: string;
  profileImage?: string | null;
  stats?: { label: string; value: string }[];
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  fullName, role, department, semester, studentId, employeeId,
  email, profileImage, stats,
}) => {
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        {department && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{department}</Text>
          </View>
        )}
        {semester && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Semester</Text>
            <Text style={styles.detailValue}>{semester}</Text>
          </View>
        )}
        {studentId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Student ID</Text>
            <Text style={styles.detailValue}>{studentId}</Text>
          </View>
        )}
        {employeeId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Employee ID</Text>
            <Text style={styles.detailValue}>{employeeId}</Text>
          </View>
        )}
        {email && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{email}</Text>
          </View>
        )}
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.lg,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  initials: {
    color: colors.aiBlue,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  info: { flex: 1 },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  roleText: {
    color: colors.aiPurple,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
