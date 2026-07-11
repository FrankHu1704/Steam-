import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      destructive: "bg-red-500/10 text-red-600 dark:text-red-400",
      secondary: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  approved: "success",
  paid: "success",
  confirmed: "success",
  success: "success",
  active: "success",
  pending: "warning",
  draft: "secondary",
  rejected: "destructive",
  failed: "destructive",
  expired: "destructive",
  refunded: "secondary",
  paused: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status.replace(/_/g, " ")}</Badge>
  );
}
