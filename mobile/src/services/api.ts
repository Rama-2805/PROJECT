// ─── SmartCampus AI — Mobile API Service ─────────────────

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, STORAGE_KEYS } from '../constants';

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.authToken);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            const config = error.config!;
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.authToken);
            config.headers.Authorization = `Bearer ${token}`;
            return this.client(config);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
        if (!refreshToken) return null;

        const { data } = await axios.post(`${API_CONFIG.baseUrl}/auth/refresh`, {
          refreshToken,
        });

        await SecureStore.setItemAsync(STORAGE_KEYS.authToken, data.accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, data.refreshToken);
        return data.accessToken;
      } catch {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.authToken);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.userData);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ── Auth ─────────────────────────────────────────────────
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    await SecureStore.setItemAsync(STORAGE_KEYS.authToken, data.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, data.refreshToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.userData, JSON.stringify(data.user));
    return data;
  }

  async logout() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.authToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.userData);
  }

  // ── Student APIs ─────────────────────────────────────────
  async getStudentDashboard() {
    const { data } = await this.client.get('/mobile/student/dashboard');
    return data;
  }

  async getStudentAttendance() {
    const { data } = await this.client.get('/mobile/student/attendance');
    return data;
  }

  async getStudentInsights() {
    const { data } = await this.client.get('/mobile/student/insights');
    return data;
  }

  async getStudentSchedule() {
    const { data } = await this.client.get('/mobile/student/schedule');
    return data;
  }

  // ── Parent APIs ──────────────────────────────────────────
  async getParentDashboard() {
    const { data } = await this.client.get('/mobile/parent/dashboard');
    return data;
  }

  async getParentAnalytics() {
    const { data } = await this.client.get('/mobile/parent/analytics');
    return data;
  }

  async getParentNotifications() {
    const { data } = await this.client.get('/mobile/parent/notifications');
    return data;
  }

  // ── Teacher APIs ─────────────────────────────────────────
  async getTeacherClasses() {
    const { data } = await this.client.get('/mobile/teacher/classes');
    return data;
  }

  async startSession(classroomId: string, subjectName: string) {
    const { data } = await this.client.post('/mobile/teacher/session/start', {
      classroomId, subjectName,
    });
    return data;
  }

  async endSession(sessionId: string) {
    const { data } = await this.client.post('/mobile/teacher/session/end', {
      sessionId,
    });
    return data;
  }

  async getTeacherAlerts() {
    const { data } = await this.client.get('/mobile/teacher/alerts');
    return data;
  }

  // ── Notifications ────────────────────────────────────────
  async getNotifications() {
    const { data } = await this.client.get('/notifications');
    return data;
  }

  async markNotificationRead(notificationId: string) {
    const { data } = await this.client.patch(`/notifications/${notificationId}/read`);
    return data;
  }

  async registerDeviceToken(token: string) {
    const { data } = await this.client.post('/notifications/device', { token });
    return data;
  }

  // ── QR Attendance ────────────────────────────────────────
  async scanQRCode(qrData: string) {
    const { data } = await this.client.post('/mobile/attendance/qr', { qrData });
    return data;
  }

  async generateQRCode(sessionId: string) {
    const { data } = await this.client.get(`/mobile/teacher/session/${sessionId}/qr`);
    return data;
  }

  // ── AI Chat ──────────────────────────────────────────────
  async sendChatMessage(message: string) {
    const { data } = await this.client.post('/mobile/chat', { message });
    return data;
  }

  // ── Biometric Auth ───────────────────────────────────────
  async registerBiometric() {
    const { data } = await this.client.post('/auth/biometric/register');
    return data;
  }

  async verifyBiometric() {
    const { data } = await this.client.post('/auth/biometric/verify');
    return data;
  }
}

export const api = new ApiService();
