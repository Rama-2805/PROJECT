"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useAuthStore } from "@/lib/store/auth";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const handleRegister = async (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    institutionName: string;
  }) => {
    await register({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      institutionName: data.institutionName,
    });
    router.push("/dashboard");
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with SmartCampus AI for your institution"
    >
      <RegisterForm onSubmit={handleRegister} />
      <p className="mt-6 text-center text-xs text-text-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-ai-blue hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
