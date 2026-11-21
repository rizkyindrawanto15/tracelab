import { Suspense } from "react";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LocalModeNotice } from "@/components/auth/auth-shared";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in" };

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-6 h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default function LoginPage() {
  if (!isSupabaseConfigured) return <LocalModeNotice title="Sign in to TraceLab" />;
  return (
    <Suspense fallback={<FormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
