// ─── SmartCampus AI — App Navigation ─────────────────────

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../theme/colors';

// Student Screens
import { StudentDashboardScreen } from '../components/student/StudentDashboardScreen';
import { StudentAttendanceScreen } from '../components/student/StudentAttendanceScreen';
import { ChatScreen } from '../components/student/ChatScreen';

// Parent Screens
import { ParentDashboardScreen } from '../components/parent/ParentDashboardScreen';

// Teacher Screens
import { TeacherDashboardScreen } from '../components/teacher/TeacherDashboardScreen';

// Auth Screen Placeholder
const LoginScreen: React.FC = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderIcon}>🔐</Text>
    <Text style={styles.placeholderTitle}>SmartCampus AI</Text>
    <Text style={styles.placeholderSub}>Login to continue</Text>
  </View>
);

// Tab Icons
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const icons: Record<string, string> = {
    Home: '🏠', Attendance: '✅', Insights: '💡', Schedule: '📅',
    Profile: '👤', Chat: '💬', Notifications: '🔔', Analytics: '📊',
    Alerts: '⚠️', Live: '📹',
  };
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icons[name] || '📋'}</Text>
    </View>
  );
};

// ── Student Tab Navigator ────────────────────────────────
const StudentTab = createBottomTabNavigator();

const StudentTabs: React.FC = () => (
  <StudentTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: colors.aiBlue,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
    })}
  >
    <StudentTab.Screen name="Home" component={StudentDashboardScreen} />
    <StudentTab.Screen name="Attendance" component={StudentAttendanceScreen} />
    <StudentTab.Screen name="Chat" component={ChatScreen} />
    <StudentTab.Screen name="Profile" component={StudentDashboardScreen} />
  </StudentTab.Navigator>
);

// ── Parent Tab Navigator ─────────────────────────────────
const ParentTab = createBottomTabNavigator();

const ParentTabs: React.FC = () => (
  <ParentTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: colors.aiPurple,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
    })}
  >
    <ParentTab.Screen name="Home" component={ParentDashboardScreen} />
    <ParentTab.Screen name="Analytics" component={ParentDashboardScreen} />
    <ParentTab.Screen name="Notifications" component={ParentDashboardScreen} />
    <ParentTab.Screen name="Profile" component={ParentDashboardScreen} />
  </ParentTab.Navigator>
);

// ── Teacher Tab Navigator ────────────────────────────────
const TeacherTab = createBottomTabNavigator();

const TeacherTabs: React.FC = () => (
  <TeacherTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: colors.success,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
    })}
  >
    <TeacherTab.Screen name="Home" component={TeacherDashboardScreen} />
    <TeacherTab.Screen name="Live" component={TeacherDashboardScreen} />
    <TeacherTab.Screen name="Alerts" component={TeacherDashboardScreen} />
    <TeacherTab.Screen name="Profile" component={TeacherDashboardScreen} />
  </TeacherTab.Navigator>
);

// ── Root Stack Navigator ─────────────────────────────────
const RootStack = createNativeStackNavigator();

export const AppNavigator: React.FC<{ role?: 'student' | 'parent' | 'teacher' }> = ({ role = 'student' }) => {
  const getNavigator = () => {
    switch (role) {
      case 'student': return <StudentTabs />;
      case 'parent': return <ParentTabs />;
      case 'teacher': return <TeacherTabs />;
      default: return <StudentTabs />;
    }
  };

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.aiBlue,
          background: colors.bgPrimary,
          card: colors.bgSecondary,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.error,
        },
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" children={getNavigator} />
        <RootStack.Screen name="Auth" component={LoginScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgSecondary,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 4,
    height: 60,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  tabIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 64, marginBottom: spacing.xl },
  placeholderTitle: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  placeholderSub: { color: colors.textMuted, fontSize: fontSize.md },
});

// Fix missing spacing import
const spacing = { xl: 20, sm: 8, xs: 4, md: 12, lg: 16 };
