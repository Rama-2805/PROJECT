"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Restore session on initial application load / refresh
    useAuthStore.getState().fetchProfile();
  }, []);

  return <>{children}</>;
}
