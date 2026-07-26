"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitReview } from "@/lib/actions/reviews";

export function ReviewForm({ orderId, onDone }: { orderId: string; onDone?: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Escolha uma classificação.");
      return;
    }
    setPending(true);
    const res = await submitReview(orderId, rating, comment);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Avaliação enviada — obrigado!");
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                n <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Deixe um comentário (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Enviar avaliação
      </Button>
    </form>
  );
}
