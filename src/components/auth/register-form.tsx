"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { registerSchema, type RegisterValues } from "./schemas";
import { AuthFooterLink, AuthHeader, FormAlert, FormField, PasswordInput, fieldA11y } from "./auth-shared";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!isSupabaseConfigured) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      if (data.session) {
        toast.success("Account created");
        router.replace("/app");
        router.refresh();
        return;
      }
      setConfirmEmail(values.email);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  });

  if (confirmEmail) {
    return (
      <div className="text-center" role="status">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <MailCheck className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Check your email to confirm your account</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{confirmEmail}</span>. Open it to activate your
          account and sign in.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-6 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader title="Create your account" description="Start building, testing, and debugging APIs in TraceLab." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
        <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            {...fieldA11y("fullName", errors.fullName?.message)}
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="h-9"
            autoFocus
            {...register("fullName")}
          />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            {...fieldA11y("email", errors.email?.message)}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-9"
            {...register("email")}
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          hint="At least 8 characters, including a letter and a number."
        >
          <PasswordInput
            {...fieldA11y("password", errors.password?.message, "At least 8 characters, including a letter and a number.")}
            autoComplete="new-password"
            {...register("password")}
          />
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput
            {...fieldA11y("confirmPassword", errors.confirmPassword?.message)}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <AuthFooterLink prompt="Already have an account?" href="/login" label="Sign in" />
    </div>
  );
}
