"use client";

import { Suspense } from "react";
import { AuthToggleCard } from "@/components/auth/auth-toggle-card";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthToggleCard initialTab="login" />
    </Suspense>
  );
}
