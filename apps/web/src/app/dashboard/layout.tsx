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
    <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[80vw] h-[80vw] border border-white/5 rounded-full absolute" />
        <div className="w-[60vw] h-[60vw] border border-white/5 rounded-full absolute" />
        <div className="w-[40vw] h-[40vw] border border-white/5 rounded-full absolute" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>
      
      {/* The main interactive dashboard shell */}
      <DashboardClientWrapper>
        {children}
      </DashboardClientWrapper>
    </div>
  );
}
