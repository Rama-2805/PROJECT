// ─── SmartCampus AI — Push Notification Service ──────────

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CHANNELS } from '../constants';
import { api } from './api';

class NotificationService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Configure notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.attendance.id,
        {
          name: NOTIFICATION_CHANNELS.attendance.name,
          description: NOTIFICATION_CHANNELS.attendance.description,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 100, 50, 100],
          lightColor: '#22D3EE',
        },
      );

      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.alerts.id,
        {
          name: NOTIFICATION_CHANNELS.alerts.name,
          description: NOTIFICATION_CHANNELS.alerts.description,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 100, 200],
          lightColor: '#F87171',
        },
      );

      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.system.id,
        {
          name: NOTIFICATION_CHANNELS.system.name,
          description: NOTIFICATION_CHANNELS.system.description,
          importance: Notifications.AndroidImportance.DEFAULT,
        },
      );

      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CHANNELS.announcements.id,
        {
          name: NOTIFICATION_CHANNELS.announcements.name,
          description: NOTIFICATION_CHANNELS.announcements.description,
          importance: Notifications.AndroidImportance.DEFAULT,
        },
      );
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Register for push notifications
    await this.registerForPushNotifications();
  }

  private async registerForPushNotifications() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Register token with backend
    try {
      await api.registerDeviceToken(pushToken);
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  addNotificationListener(callback: (notification: Notifications.Notification) => void) {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  }

  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  }

  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  async scheduleLocalNotification(title: string, body: string, data?: Record<string, string>) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Immediate
    });
  }
}

export const notificationService = new NotificationService();
