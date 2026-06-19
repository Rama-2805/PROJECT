import { Metadata } from "next";
import { TeacherClientWrapper } from "@/components/teacher/layout/TeacherClientWrapper";

export const metadata: Metadata = {
  title: "Faculty Dashboard | SmartCampus AI",
  description: "Futuristic AI Operating System for Modern Faculty",
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeacherClientWrapper>
      {children}
    </TeacherClientWrapper>
  );
}
