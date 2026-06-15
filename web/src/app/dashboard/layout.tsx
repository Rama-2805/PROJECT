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
    <div className="relative min-h-screen bg-[#0A0F1E] text-white overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* The main interactive dashboard shell */}
      <DashboardClientWrapper>
        {children}
      </DashboardClientWrapper>
    </div>
  );
}
