import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-muted transition-colors checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:before:translate-x-5",
        className
      )}
      {...props}
    />
  )
);
Switch.displayName = "Switch";
