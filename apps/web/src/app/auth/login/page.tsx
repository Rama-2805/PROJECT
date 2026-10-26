"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuthStore } from "@/lib/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | undefined>();

  const handleLogin = async (data: { email: string; password: string }) => {
    setError(undefined);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your SmartCampus AI account"
    >
      <LoginForm onSubmit={handleLogin} error={error} />
      <p className="mt-6 text-center text-xs text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-ai-blue hover:underline font-medium">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
