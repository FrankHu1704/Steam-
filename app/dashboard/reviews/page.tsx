import { Star, MessageSquareText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/reviews/star-rating";
import { getCurrentUserAndProfile } from "@/lib/data/profile";
import { getProducerReviews } from "@/lib/data/reviews";
import { cn } from "@/lib/utils";

export default async function DashboardReviewsPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) return null;

  const reviews = await getProducerReviews(user.id);
  const average =
    reviews.length > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  const tiles = [
    { label: "Média geral", value: average > 0 ? average : "—", icon: Star, style: "bg-amber-500/10 text-amber-600" },
    { label: "Total de avaliações", value: reviews.length, icon: MessageSquareText, style: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <p className="text-sm text-muted-foreground">O que os compradores dizem sobre os seus produtos.</p>
      </div>

      {reviews.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
            {tiles.map((tile) => (
              <Card key={tile.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tile.style)}>
                      <tile.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold">{tile.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold">Distribuição</p>
              <div className="space-y-2">
                {distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-sm">
                    <span className="flex w-10 shrink-0 items-center gap-0.5 text-muted-foreground">
                      {d.star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${(d.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <MessageSquareText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ainda não recebeu nenhuma avaliação.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <div key={review.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{review.buyer_name}</p>
                      <p className="text-xs text-muted-foreground">{review.product_title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StarRating value={review.rating} size="h-3.5 w-3.5" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("pt-MZ")}
                      </span>
                    </div>
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
