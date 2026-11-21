import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Where "Get Started" CTAs point: registration when accounts exist, otherwise straight into Local mode. */
export const GET_STARTED_HREF = isSupabaseConfigured ? "/register" : "/app";

export const SECTION_LINKS = [
  { id: "features", label: "Features" },
  { id: "workflow", label: "Workflow" },
  { id: "security", label: "Security" },
] as const;
