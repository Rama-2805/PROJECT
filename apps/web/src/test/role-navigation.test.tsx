import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TeacherSidebar } from "@/components/teacher/layout/TeacherSidebar";
import { GlassSidebar } from "@/components/dashboard/layout/GlassSidebar";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/lib/store/auth";
import type { UserProfile } from "@/_shared/types/api";

describe("Role-Based Navigation Visibility Regression Tests", () => {
  beforeEach(() => {
    useUIStore.setState({ sidebarOpen: true });
    useAuthStore.setState({
      user: {
        id: "t-1",
        email: "teacher@smartcampus.edu.in",
        fullName: "Dr. Sarah Connor",
        roles: ["TEACHER"],
      } as unknown as UserProfile,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("should render teacher-specific navigation links in TeacherSidebar", () => {
    render(<TeacherSidebar />);

    // Verify key teacher workflow routes are present
    expect(screen.getByText("Learning Queue")).toBeDefined();
    expect(screen.getByText("Unknown Faces")).toBeDefined();
    expect(screen.getByText("Live Monitoring")).toBeDefined();
    expect(screen.getByText("Attendance")).toBeDefined();
    expect(screen.getByText("Students")).toBeDefined();
    expect(screen.getByText("Reports")).toBeDefined();
  });

  it("should have correct href targets for teacher routes", () => {
    const { container } = render(<TeacherSidebar />);
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(links).toContain("/teacher/dashboard");
    expect(links).toContain("/teacher/candidates");
    expect(links).toContain("/teacher/unknown-faces");
    expect(links).toContain("/teacher/live-monitoring");
  });

  it("should display the faculty portal banner and sign out action", () => {
    render(<TeacherSidebar />);
    expect(screen.getByText("SMARTCAMPUS")).toBeDefined();
    expect(screen.getByText("Faculty Portal")).toBeDefined();
    expect(screen.getByText("Sign Out")).toBeDefined();
  });

  it("should render comprehensive admin links in GlassSidebar for SUPER_ADMIN", () => {
    useAuthStore.setState({
      user: {
        id: "admin-1",
        email: "admin@smartcampus.edu",
        roles: ["SUPER_ADMIN"],
      } as unknown as UserProfile,
    });

    const { container } = render(<GlassSidebar />);
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(links).toContain("/dashboard");
    expect(links).toContain("/dashboard/students");
    expect(links).toContain("/dashboard/teachers");
    expect(links).toContain("/dashboard/departments");
    expect(links).toContain("/dashboard/courses");
    expect(links).toContain("/dashboard/classrooms");
    expect(links).toContain("/dashboard/reports");
    expect(links).toContain("/dashboard/devices");
    expect(links).toContain("/dashboard/digital-twin");
    expect(links).toContain("/dashboard/system");
  });

  it("should filter out infrastructure links in GlassSidebar for HOD", () => {
    useAuthStore.setState({
      user: {
        id: "hod-1",
        email: "hod.cse@smartcampus.edu",
        roles: ["HOD"],
      } as unknown as UserProfile,
    });

    const { container } = render(<GlassSidebar />);
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(links).toContain("/dashboard");
    expect(links).toContain("/dashboard/hod");
    expect(links).toContain("/dashboard/teachers");
    expect(links).toContain("/dashboard/attendance");
    expect(links).toContain("/dashboard/reports");

    // HODs should not see deep infrastructure management links
    expect(links).not.toContain("/dashboard/system");
    expect(links).not.toContain("/dashboard/devices");
  });
});
