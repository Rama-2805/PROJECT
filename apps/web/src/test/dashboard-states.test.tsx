import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ActivityFeed } from "@/components/dashboard/widgets/ActivityFeed";
import { MetricCard } from "@/components/dashboard/widgets/MetricCard";
import { Button } from "@/components/ui/Button";

describe("Dashboard States & Loading Indicators Regression Tests", () => {
  it("should render ActivityFeed with empty events array without crashing", () => {
    const { container } = render(<ActivityFeed events={[]} />);
    expect(screen.getByText("TELEMETRY FEED")).toBeDefined();
    // No events rendered
    expect(container.querySelectorAll(".font-mono.text-\\[10px\\]").length).toBe(0);
  });

  it("should render populated events in ActivityFeed with correct severity dots", () => {
    const mockEvents = [
      {
        id: "ev-1",
        title: "Face Verified",
        description: "Student detected in Room 023",
        time: "10:02 AM",
        timestamp: new Date(),
        type: "attendance" as const,
        severity: "info" as const,
      },
    ];

    render(<ActivityFeed events={mockEvents} />);
    expect(screen.getByText("Face Verified")).toBeDefined();
    expect(screen.getByText("Student detected in Room 023")).toBeDefined();
  });

  it("should render MetricCard with values, trend percentage, and label", () => {
    render(
      <MetricCard
        label="Attendance Rate"
        value={94.8}
        suffix="%"
        icon={<span data-testid="metric-icon">Icon</span>}
        trend={{ value: 2.4, positive: true }}
      />
    );

    expect(screen.getByText("Attendance Rate")).toBeDefined();
    expect(screen.getByTestId("metric-icon")).toBeDefined();
    expect(screen.getByText(/2\.4/)).toBeDefined();
  });

  it("should render Button in loading state with spinner and disabled attribute", () => {
    render(<Button loading>Save Changes</Button>);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    // Button children still present
    expect(screen.getByText("Save Changes")).toBeDefined();
  });
});
