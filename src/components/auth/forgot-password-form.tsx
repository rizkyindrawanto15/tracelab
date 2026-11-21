"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { forgotPasswordSchema, type ForgotPasswordValues } from "./schemas";
import { AuthFooterLink, AuthHeader, FormAlert, FormField, fieldA11y } from "./auth-shared";

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isSupabaseConfigured) return;
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
    } catch {
      // Intentionally ignored: we always show the same neutral message to avoid account enumeration.
    }
    setSent(true);
  });

  return (
    <div>
      <AuthHeader title="Reset your password" description="Enter the email for your account and we'll send you a reset link." />
      {sent ? (
        <FormAlert tone="success">
          If an account exists for that email, we sent a link to reset your password. Check your inbox (and spam folder).
        </FormAlert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              {...fieldA11y("email", errors.email?.message)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-9"
              autoFocus
              {...register("email")}
            />
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}
      <AuthFooterLink prompt="Remembered it?" href="/login" label="Back to sign in" />
    </div>
  );
}
