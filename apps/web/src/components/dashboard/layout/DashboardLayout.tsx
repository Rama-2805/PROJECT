"use client";

import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  return (
    <div className="relative min-h-screen bg-bg-primary overflow-x-hidden">
      {/* Ambient Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gray-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <Sidebar />
      <div className="relative z-10 pl-16 md:pl-64 transition-all duration-300 ease-smooth">
        <Header title={title} breadcrumbs={breadcrumbs} />
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
