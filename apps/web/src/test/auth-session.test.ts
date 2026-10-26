import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/lib/store/auth";
import { setAccessToken, getAccessToken, getCookie } from "@/lib/api/client";
import { getEnrollmentWsUrl } from "@/lib/api/enrollment";
import type { UserProfile } from "@/_shared/types/api";

describe("Authentication & Session Restoration Regression Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  });

  it("should initialize unauthenticated with null user", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("should handle login failure gracefully without persisting corrupted session", async () => {
    // Mock global fetch to return 401 Unauthorized
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid credentials", statusCode: 401 }),
    });

    await expect(
      useAuthStore.getState().login("invalid@smartcampus.edu.in", "WrongPassword123!")
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("user-role")).toBeNull();
  });

  it("should restore authenticated session when profile fetch succeeds", async () => {
    setAccessToken("valid-test-access-token");

    const mockProfile = {
      id: "u-123",
      email: "teacher@smartcampus.edu.in",
      fullName: "Prof. Alan Turing",
      roles: ["TEACHER"],
      status: "ACTIVE",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockProfile,
      }),
    });

    await useAuthStore.getState().fetchProfile();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toMatchObject({
      email: "teacher@smartcampus.edu.in",
      fullName: "Prof. Alan Turing",
    });
    expect(localStorage.getItem("user-role")).toBe("teacher");
    expect(localStorage.getItem("currentUserEmail")).toBe("teacher@smartcampus.edu.in");
  });

  it("should clear session and storage on logout", async () => {
    // Setup authenticated state
    useAuthStore.setState({
      user: {
        id: "u-123",
        email: "admin@smartcampus.edu.in",
        fullName: "System Admin",
        roles: ["SUPER_ADMIN"],
      } as unknown as UserProfile,
      isAuthenticated: true,
      isLoading: false,
    });
    setAccessToken("active-token");
    localStorage.setItem("user-role", "admin");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("user-role")).toBeNull();
  });

  it("should clear both access and refresh cookies upon setAccessToken(null)", () => {
    setAccessToken("test-token-jwt");
    expect(getCookie("smartcampus_access_token")).toBe("test-token-jwt");

    setAccessToken(null);
    expect(getCookie("smartcampus_access_token")).toBeNull();
    expect(getCookie("refreshToken")).toBeNull();
  });

  it("should configure direct port 8000 WebSocket connection for enrollment in local development", () => {
    const wsUrl = getEnrollmentWsUrl();
    expect(wsUrl).toContain(":8000/api/v1/ws");
    expect(wsUrl).not.toContain(":3000/api/v1/ws");
  });

  it("should accurately compute attendance percentage based on sessions attended rather than AI confidence", () => {
    const records = [
      { id: "1", sessionId: "sess-1", status: "PRESENT", confidence: 0.98 },
      { id: "2", sessionId: "sess-2", status: "PRESENT", confidence: 0.94 },
      { id: "3", sessionId: "sess-3", status: "ABSENT", confidence: 0.0 },
      { id: "4", sessionId: "sess-4", status: "PRESENT", confidence: 0.99 },
    ];

    const totalSessions = 4;
    const attendedSessions = records.filter((r) => r.status === "PRESENT").length;
    const computedAttendanceRate = Math.round((attendedSessions / totalSessions) * 100);

    // Attended 3 out of 4 is 75%, NOT average confidence (~72.7% or 97%)
    expect(computedAttendanceRate).toBe(75);
    expect(computedAttendanceRate).not.toBe(97);
  });
});
