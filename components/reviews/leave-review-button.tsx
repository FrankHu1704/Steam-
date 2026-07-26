"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/reviews/review-form";

export function LeaveReviewButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <ReviewForm orderId={orderId} onDone={() => setOpen(false)} />;
  }

  return (
    <Button type="button" size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setOpen(true)}>
      <Star className="h-3.5 w-3.5" /> Deixar avaliação
    </Button>
  );
}
