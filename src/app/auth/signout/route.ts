import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Signs the user out server-side (clears auth cookies) and returns to the landing page. */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore — we still redirect; the session cookie is cleared when possible.
    }
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
