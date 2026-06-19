// ─── SmartCampus AI — Mobile App Entry Point ─────────────

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './navigation/AppNavigator';
import { useAuthStore } from './store/authStore';
import { notificationService } from './services/notifications';
import { offlineService } from './services/offline';
import { colors, fontSize, fontWeight } from './theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
    },
  },
});

const SplashScreen: React.FC = () => (
  <View style={styles.splash}>
    <View style={styles.splashLogo}>
      <Text style={styles.splashIcon}>🚀</Text>
    </View>
    <Text style={styles.splashTitle}>SmartCampus AI</Text>
    <Text style={styles.splashSubtitle}>The Future of Intelligent Education</Text>
    <ActivityIndicator color={colors.aiBlue} style={styles.splashLoader} />
  </View>
);

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize services
        await notificationService.initialize();
        await offlineService.initialize();

        // Check authentication state
        const { useAuthStore: auth } = await import('./store/authStore');
        const state = auth.getState();

        // Simulate initialization delay
        await new Promise(r => setTimeout(r, 1500));
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <AppNavigator
          role={
            isAuthenticated
              ? role
              : 'student'
          }
        />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  splashIcon: { fontSize: 36 },
  splashTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  splashSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: 8,
  },
  splashLoader: {
    marginTop: 48,
  },
});
