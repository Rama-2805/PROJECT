"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/lib/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const handleLogin = async (data: { email: string; password: string }) => {
    await login(data.email, data.password);
    router.push("/dashboard");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your SmartCampus AI account"
    >
      <LoginForm onSubmit={handleLogin} />
      <p className="mt-6 text-center text-xs text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-ai-blue hover:underline font-medium">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
