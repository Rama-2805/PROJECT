import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { useMediaQuery, useIsMobile } from "@/lib/hooks/useMediaQuery";
import { Header } from "@/components/dashboard/layout/Header";
import { useEnrollmentWebSocket } from "@/hooks/useEnrollmentWebSocket";

describe("Hook Fixes Verification Regression Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("currentUserEmail", "admin@smartcampus.edu.in");
    localStorage.setItem("currentUserName", "System Admin");
    localStorage.setItem("user-role", "admin");
  });

  describe("useMediaQuery & useIsMobile", () => {
    it("should return false when matchMedia matches is false", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useMediaQuery("(max-width: 1023px)"));
      expect(result.current).toBe(false);
    });

    it("should return true when media query matches mobile breakpoint", () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });
  });

  describe("Header Component with Memoized Search", () => {
    it("should render Header title and breadcrumbs correctly", () => {
      const { rerender } = render(<Header title="Attendance Management" />);
      expect(screen.getByText("Attendance Management")).toBeDefined();

      rerender(
        <Header
          title="Attendance Management"
          breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Current Session" }]}
        />
      );
      expect(screen.getByText("Home")).toBeDefined();
      expect(screen.getByText("Current Session")).toBeDefined();
    });

    it("should filter search results based on input query without cascading renders", () => {
      render(<Header title="Dashboard" />);

      const searchInput = screen.getByPlaceholderText(/Search students, teachers, classes.../i);
      expect(searchInput).toBeDefined();

      // Type student name into search
      fireEvent.change(searchInput, { target: { value: "Siddharth" } });

      // Verify search results popup renders matched student
      expect(screen.getByText("Siddharth Saxena")).toBeDefined();
      expect(screen.getByText("CSE2026002")).toBeDefined();
    });

    it("should display no dropdown items when search query matches no records", () => {
      render(<Header title="Dashboard" />);

      const searchInput = screen.getByPlaceholderText(/Search students, teachers, classes.../i);
      fireEvent.change(searchInput, { target: { value: "NonexistentPersonXYZ" } });

      expect(screen.queryByText("Siddharth Saxena")).toBeNull();
    });
  });

  describe("useEnrollmentWebSocket", () => {
    it("should initialize safely without failure when disabled", () => {
      const onEvent = vi.fn();
      const { result } = renderHook(() =>
        useEnrollmentWebSocket({
          onEvent,
          enabled: false,
        })
      );

      expect(typeof result.current.send).toBe("function");
    });
  });
});
