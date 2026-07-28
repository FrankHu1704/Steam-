"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleEmployeeActive } from "@/lib/actions/employees";

export function EmployeeActiveToggle({ employeeId, active }: { employeeId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await toggleEmployeeActive(employeeId, !active);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? "Desativar" : "Ativar"}
    </Button>
  );
}
