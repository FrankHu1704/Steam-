"use client";

import { Suspense } from "react";
import { AuthToggleCard } from "@/components/auth/auth-toggle-card";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthToggleCard initialTab="signup" />
    </Suspense>
  );
}
