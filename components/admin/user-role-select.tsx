"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { updateUserRole } from "@/lib/actions/admin";
import type { UserRole } from "@/types/database";

export function UserRoleSelect({ userId, role }: { userId: string; role: UserRole }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(newRole: UserRole) {
    setPending(true);
    await updateUserRole(userId, newRole);
    setPending(false);
    router.refresh();
  }

  return (
    <Select
      value={role}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value as UserRole)}
      className="h-9 w-32 text-xs"
    >
      <option value="buyer">Comprador</option>
      <option value="producer">Produtor</option>
      <option value="admin">Admin</option>
    </Select>
  );
}
