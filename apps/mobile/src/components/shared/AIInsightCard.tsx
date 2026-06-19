// ─── SmartCampus AI — AI Insight Card Component ──────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface AIInsightCardProps {
  title: string;
  description: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  confidence?: number;
  category?: string;
}

const severityConfig = {
  INFO: { color: colors.aiBlue, bg: 'rgba(34, 211, 238, 0.1)', icon: '💡' },
  WARNING: { color: colors.warning, bg: colors.warningBg, icon: '⚠️' },
  CRITICAL: { color: colors.error, bg: colors.errorBg, icon: '🚨' },
};

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title, description, severity = 'INFO', confidence, category,
}) => {
  const config = severityConfig[severity];

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{title}</Text>
          {category && <Text style={styles.category}>{category}</Text>}
        </View>
      </View>
      <Text style={styles.description}>{description}</Text>
      {confidence !== undefined && (
        <View style={styles.footer}>
          <View style={styles.confidenceBar}>
            <View style={[styles.confidenceFill, { width: `${confidence}%` as any, backgroundColor: config.color }]} />
          </View>
          <Text style={[styles.confidenceText, { color: config.color }]}>
            {confidence.toFixed(0)}% confidence
          </Text>
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
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
  },
  category: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  confidenceBar: {
    flex: 1,
    height: 3,
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
