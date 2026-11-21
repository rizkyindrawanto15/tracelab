import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LocalModeNotice } from "@/components/auth/auth-shared";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  if (!isSupabaseConfigured) return <LocalModeNotice title="Choose a new password" />;
  return <ResetPasswordForm />;
}
