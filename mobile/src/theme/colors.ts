// ─── SmartCampus AI — Mobile Design System Colors ──────────

export const colors = {
  // Primary
  aiBlue: '#22D3EE',
  aiPurple: '#A78BFA',
  aiGradient: ['#22D3EE', '#A78BFA'] as const,

  // Background
  bgPrimary: '#0A0A0F',
  bgSecondary: '#12121A',
  bgTertiary: '#1A1A26',
  bgCard: '#1E1E2F',
  bgGlass: 'rgba(255, 255, 255, 0.04)',
  bgGlassHeavy: 'rgba(255, 255, 255, 0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textMuted: '#6B6B80',
  textDim: '#4A4A5A',

  // Status
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.1)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.1)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.1)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',

  // Gradients
  cardGradient: ['#1A1A26', '#12121A'] as const,
  headerGradient: ['rgba(34, 211, 238, 0.1)', 'rgba(167, 139, 250, 0.05)'] as const,
  tabInactive: '#4A4A5A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};
