"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resetPasswordSchema, type ResetPasswordValues } from "./schemas";
import { AuthHeader, FormAlert, FormField, PasswordInput, fieldA11y } from "./auth-shared";

type SessionState = "checking" | "ready" | "invalid";

const HINT = "At least 8 characters, including a letter and a number.";

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = React.useState<SessionState>("checking");
  const [serverError, setServerError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSessionState((prev) => (prev === "ready" ? prev : data.session ? "ready" : "invalid"));
      })
      .catch(() => {
        if (active) setSessionState("invalid");
      });

    // Covers links that establish the recovery session client-side.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setSessionState("ready");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!isSupabaseConfigured) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        setServerError(error.message);
        return;
      }
      toast.success("Password updated");
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  });

  if (sessionState === "checking") {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Verifying reset link">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-60" />
        <Skeleton className="mt-6 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (sessionState === "invalid") {
    return (
      <div className="text-center" role="alert">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full border border-warning/25 bg-warning/10 text-warning">
          <LinkIcon className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Reset link invalid or expired</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          This password reset link is no longer valid. Request a new one to continue.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <p className="mt-4 text-[13px] text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader title="Choose a new password" description="Enter a new password for your TraceLab account." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <FormField id="password" label="New password" error={errors.password?.message} hint={HINT}>
          <PasswordInput
            {...fieldA11y("password", errors.password?.message, HINT)}
            autoComplete="new-password"
            autoFocus
            {...register("password")}
          />
        </FormField>
        <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
          <PasswordInput
            {...fieldA11y("confirmPassword", errors.confirmPassword?.message)}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Updating password…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
