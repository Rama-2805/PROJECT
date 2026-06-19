import { Metadata } from "next";
import { DashboardClientWrapper } from "@/components/dashboard/layout/DashboardClientWrapper";

export const metadata: Metadata = {
  title: "Dashboard | SmartCampus AI",
  description: "Futuristic AI Operating System for Modern Universities",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardClientWrapper>
      {children}
    </DashboardClientWrapper>
  );
}
