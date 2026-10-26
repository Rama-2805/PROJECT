import { create } from "zustand";
import { api, setAccessToken, getAccessToken, refreshAccessToken } from "@/lib/api/client";
import type { UserProfile } from "@/_shared/types/api";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    institutionName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        user: any;
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/login", { email, password });

      if (!res.success || !res.data) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        throw new Error(res.error || "Invalid credentials");
      }

      const { user, tokens } = res.data;
      setAccessToken(tokens.accessToken);

      // Sync role & user metadata for legacy UI components
      if (typeof window !== "undefined") {
        const primaryRole = (user.roles?.[0] || "user").toLowerCase();
        localStorage.setItem("user-role", primaryRole);
        localStorage.setItem("currentUserEmail", user.email);
        if (user.fullName) localStorage.setItem("currentUserName", user.fullName);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{
        user: any;
        tokens: { accessToken: string; refreshToken: string };
      }>("/auth/register", data);

      if (!res.success || !res.data) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        throw new Error(res.error || "Registration failed");
      }

      const { user, tokens } = res.data;
      setAccessToken(tokens.accessToken);

      if (typeof window !== "undefined") {
        const primaryRole = (user.roles?.[0] || "user").toLowerCase();
        localStorage.setItem("user-role", primaryRole);
        localStorage.setItem("currentUserEmail", user.email);
        if (user.fullName) localStorage.setItem("currentUserName", user.fullName);
      }

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Non-blocking on network failure
    }
    setAccessToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUserEmail");
      localStorage.removeItem("currentUserName");
      localStorage.removeItem("currentUserUSN");
      localStorage.removeItem("user-role");
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      let token = getAccessToken();
      if (!token) {
        token = await refreshAccessToken();
      }
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const res = await api.get<UserProfile>("/auth/profile");
      if (res.success && res.data) {
        const user = res.data as any;
        if (typeof window !== "undefined") {
          const primaryRole = (user.roles?.[0] || "user").toLowerCase();
          localStorage.setItem("user-role", primaryRole);
          localStorage.setItem("currentUserEmail", user.email);
          if (user.fullName) localStorage.setItem("currentUserName", user.fullName);
        }
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        setAccessToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),
}));
