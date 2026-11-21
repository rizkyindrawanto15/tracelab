"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function AuthHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function FormField({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Accessible props for an input wired to a FormField. */
export function fieldA11y(id: string, error?: string, hint?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("h-9 pr-9", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
        tone === "error"
          ? "border-destructive/25 bg-destructive/10 text-destructive"
          : "border-success/25 bg-success/10 text-success",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuthFooterLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="mt-6 text-center text-[13px] text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}

/** Shown on every auth page when Supabase env vars are not set. */
export function LocalModeNotice({ title }: { title: string }) {
  return (
    <div>
      <AuthHeader title={title} />
      <div className="rounded-lg border border-border bg-panel-2 p-4">
        <div className="mb-2 flex items-center gap-2 text-[13px] font-medium">
          <HardDrive className="size-4 text-primary" aria-hidden />
          Local mode
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Accounts are not configured on this deployment. TraceLab is running in Local mode — your data stays in this browser.
        </p>
      </div>
      <Button asChild size="lg" className="mt-5 w-full">
        <Link href="/app">Continue in Local mode</Link>
      </Button>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        To enable accounts and cloud sync, set <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment and redeploy.
      </p>
    </div>
  );
}
