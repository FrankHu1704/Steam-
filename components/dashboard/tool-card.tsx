import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ToolCard({
  icon: Icon,
  title,
  description,
  cta,
  href,
  disabled,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: string;
  href?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="font-semibold">{title}</p>
        </div>
        <p className="flex-1 text-sm text-muted-foreground">{description}</p>
        {children ??
          (href && cta && (
            <Button asChild size="sm" variant="outline" disabled={disabled} className="w-full">
              <Link href={href}>{cta}</Link>
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
