"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sanitizeNext } from "@/lib/auth/redirect";
import { loginSchema, type LoginValues } from "./schemas";
import { AuthFooterLink, AuthHeader, FormAlert, FormField, PasswordInput, fieldA11y } from "./auth-shared";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));
  const urlError = searchParams.get("error");
  const [serverError, setServerError] = React.useState<string | null>(urlError ? urlError.slice(0, 200) : null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    if (!isSupabaseConfigured) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        setServerError(error.message);
        return;
      }
      toast.success("Signed in");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <div>
      <AuthHeader title="Sign in to TraceLab" description="Welcome back. Enter your credentials to continue." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError ? <FormAlert>{serverError}</FormAlert> : null}
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
        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          action={
            <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            {...fieldA11y("password", errors.password?.message)}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <AuthFooterLink prompt="Don't have an account?" href="/register" label="Create one" />
    </div>
  );
}
