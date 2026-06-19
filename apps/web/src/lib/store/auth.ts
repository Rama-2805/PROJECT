import { create } from "zustand";
import { api, setAccessToken } from "@/lib/api/client";
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    // MOCK LOGIN FOR DEMONSTRATION PURPOSES
    document.cookie = "refreshToken=mock-token-123; path=/";
    setAccessToken("mock-token-123");
    set({ 
      user: { 
        id: "1", 
        email, 
        fullName: "Admin User", 
        roles: ["ADMIN"], 
        institutionId: "inst-1",
        profileImage: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        institution: { id: "inst-1", name: "SmartCampus University", domain: "smartcampus.edu", type: "UNIVERSITY", status: "ACTIVE", subscriptionTier: "ENTERPRISE", createdAt: new Date(), updatedAt: new Date() } as any
      }, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },

  register: async (data) => {
    // MOCK FOR DEMONSTRATION
    document.cookie = "refreshToken=mock-token-123; path=/";
    setAccessToken("mock-token-123");
    set({ 
      user: { 
        id: "1", 
        email: data.email, 
        fullName: data.fullName, 
        roles: ["ADMIN"], 
        institutionId: "inst-1",
        profileImage: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        institution: { id: "inst-1", name: "SmartCampus University", domain: "smartcampus.edu", type: "UNIVERSITY", status: "ACTIVE", subscriptionTier: "ENTERPRISE", createdAt: new Date(), updatedAt: new Date() } as any
      }, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },

  logout: async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchProfile: async () => {
    // MOCK FOR DEMONSTRATION
    set({ 
      user: { 
        id: "1", 
        email: "admin@smartcampus.ai", 
        fullName: "Admin User", 
        roles: ["ADMIN"], 
        institutionId: "inst-1",
        profileImage: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        institution: { id: "inst-1", name: "SmartCampus University", domain: "smartcampus.edu", type: "UNIVERSITY", status: "ACTIVE", subscriptionTier: "ENTERPRISE", createdAt: new Date(), updatedAt: new Date() } as any
      }, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),
}));
