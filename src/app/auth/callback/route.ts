import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth/redirect";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

function loginWithError(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message.slice(0, 200));
  return NextResponse.redirect(url);
}

/**
 * Handles Supabase auth redirects (email confirmation, password recovery,
 * magic links, OAuth). Supports both PKCE (`code`) and token-hash flows.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = sanitizeNext(searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Supabase forwards provider / verification errors as query params.
  const upstreamError = searchParams.get("error_description") ?? searchParams.get("error");
  if (upstreamError) return loginWithError(request, upstreamError);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return loginWithError(request, error.message);
      return NextResponse.redirect(new URL(next, request.url));
    }

    if (tokenHash && isEmailOtpType(type)) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) return loginWithError(request, error.message);
      return NextResponse.redirect(new URL(next, request.url));
    }
  } catch (err) {
    return loginWithError(request, err instanceof Error ? err.message : "Authentication failed.");
  }

  return loginWithError(request, "The authentication link is invalid or has expired.");
}
