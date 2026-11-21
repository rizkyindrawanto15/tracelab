import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/70 transition-colors",
      "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
      "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive file:border-0 file:bg-transparent file:text-xs file:font-medium",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-[13px] placeholder:text-muted-foreground/70",
      "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-xs font-medium text-muted-foreground leading-none", className)} {...props} />
));
Label.displayName = "Label";

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-muted", className)} />;
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" className={cn("shrink-0 bg-border", vertical ? "h-full w-px" : "h-px w-full", className)} />;
}

export function Badge({ className, variant = "default", children }: { className?: string; variant?: "default" | "outline" | "success" | "warning" | "destructive" | "muted"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    default: "bg-primary/15 text-primary border-primary/25",
    outline: "border-border text-muted-foreground",
    success: "bg-success/12 text-success border-success/25",
    warning: "bg-warning/12 text-warning border-warning/25",
    destructive: "bg-destructive/12 text-destructive border-destructive/25",
    muted: "bg-muted text-muted-foreground border-transparent",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium", styles[variant], className)}>{children}</span>;
}
