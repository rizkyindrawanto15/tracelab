"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { DataStore } from "@/lib/data/store";
import { LocalStore } from "@/lib/data/local-store";
import { SupabaseStore } from "@/lib/data/supabase-store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string;
}

interface DataContextValue {
  store: DataStore;
  user: SessionUser | null;
  mode: "supabase" | "local";
  signOut: () => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [store] = React.useState<DataStore>(() => (isSupabaseConfigured ? new SupabaseStore() : new LocalStore()));
  const [user, setUser] = React.useState<SessionUser | null>(
    isSupabaseConfigured ? null : { id: "local", email: null, name: "Local User" },
  );

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabaseBrowserClient();
    const toUser = (u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): SessionUser | null =>
      u
        ? {
            id: u.id,
            email: u.email ?? null,
            name: (typeof u.user_metadata?.full_name === "string" && u.user_metadata.full_name) || u.email?.split("@")[0] || "User",
          }
        : null;
    sb.auth.getUser().then(({ data }) => setUser(toUser(data.user)));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      setUser(toUser(session?.user ?? null));
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        router.replace("/login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  const signOut = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }
    await getSupabaseBrowserClient().auth.signOut();
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }, [queryClient, router]);

  const value = React.useMemo(() => ({ store, user, mode: store.mode, signOut }), [store, user, signOut]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
