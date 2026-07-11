"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toggleCouponActive, deleteCoupon } from "@/lib/actions/coupons";

export function CouponRowActions({ couponId, active }: { couponId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await toggleCouponActive(couponId, !active);
    setPending(false);
    router.refresh();
  }

  async function handleDelete() {
    setPending(true);
    await deleteCoupon(couponId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Switch checked={active} onChange={handleToggle} disabled={pending} />
      <Button type="button" size="sm" variant="ghost" onClick={handleDelete} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
