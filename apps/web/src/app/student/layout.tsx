import { Metadata } from "next";
import { StudentClientWrapper } from "@/components/student/layout/StudentClientWrapper";

export const metadata: Metadata = {
  title: "Student Dashboard | SmartCampus AI",
  description: "Futuristic AI Operating System for Smart Campus Students",
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentClientWrapper>
      {children}
    </StudentClientWrapper>
  );
}
