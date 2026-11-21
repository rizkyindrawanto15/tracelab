import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LocalModeNotice } from "@/components/auth/auth-shared";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured) return <LocalModeNotice title="Reset your password" />;
  return <ForgotPasswordForm />;
}
