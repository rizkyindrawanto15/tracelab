import * as React from "react";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GET_STARTED_HREF } from "./links";
import { Reveal } from "./reveal";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-panel/30 py-20 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]"
      />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 font-mono text-[11px] text-muted-foreground">
            <Terminal className="size-3.5 text-primary" />
            <span>Ready for production development</span>
          </div>

          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start testing with speed and confidence.
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Eliminate proxy hurdles, insecure credential storage, and cluttered dashboards. Experience the next generation of API tools today.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={GET_STARTED_HREF}>
                Get Started with TraceLab
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="/login">Sign In to Workspace</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
