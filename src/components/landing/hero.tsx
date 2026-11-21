import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnchorLink } from "./anchor-link";
import { GET_STARTED_HREF } from "./links";
import { Reveal } from "./reveal";
import { RequestPreview } from "./request-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[360px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/70 px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Build. Test. Debug. Ship.
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            API Development, <span className="text-muted-foreground">Without the Friction.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Test, debug, and manage your APIs in one beautifully crafted developer workspace.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={GET_STARTED_HREF}>
                Get Started
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <AnchorLink targetId="features">Explore Features</AnchorLink>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function DemoSection() {
  return (
    <section id="demo" aria-labelledby="demo-heading" className="relative scroll-mt-16 px-4 pb-20 sm:px-6">
      <Reveal className="mx-auto max-w-3xl" delay={0.1}>
        <h2 id="demo-heading" className="sr-only">
          Try a live request
        </h2>
        <RequestPreview />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Requests are sent directly from your browser to the public JSONPlaceholder API.
        </p>
      </Reveal>
    </section>
  );
}
