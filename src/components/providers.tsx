"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/menus";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={350} skipDelayDuration={100}>
          {children}
          <Toaster
            position="bottom-right"
            theme="system"
            closeButton
            toastOptions={{
              classNames: {
                toast: "!bg-popover !text-popover-foreground !border-border !rounded-lg !text-[13px] !shadow-xl",
                description: "!text-muted-foreground",
              },
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
