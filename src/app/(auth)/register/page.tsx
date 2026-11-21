import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LocalModeNotice } from "@/components/auth/auth-shared";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  if (!isSupabaseConfigured) return <LocalModeNotice title="Create your account" />;
  return <RegisterForm />;
}
