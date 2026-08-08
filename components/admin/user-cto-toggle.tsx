"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setCtoStatus } from "@/lib/actions/admin";

export function UserCtoToggle({ userId, isCto }: { userId: string; isCto: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await setCtoStatus(userId, !isCto);
    setPending(false);
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={isCto ? "destructive" : "outline"}
      disabled={pending}
      onClick={handleToggle}
    >
      {isCto ? "Remover CTO" : "Tornar CTO"}
    </Button>
  );
}
