import * as React from "react";
import { Bug, CheckCircle2, Code2, Rocket, Terminal, Wrench } from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

const STEPS = [
  {
    step: "01",
    tag: "Build",
    title: "Compose & Configure Requests",
    description:
      "Quickly draft endpoints with automated query syncing, typed header suggestions, and flexible payload builders for JSON, form-data, and urlencoded streams.",
    icon: Wrench,
    detail: "Supports all standard HTTP verbs with parameter templating and automatic URL encoding.",
  },
  {
    step: "02",
    tag: "Test",
    title: "Validate with Declarative Assertions",
    description:
      "Define expectations against status codes, latency budgets, header presence, and deeply nested JSON properties. Get instant pass/fail feedback per run.",
    icon: CheckCircle2,
    detail: "Zero arbitrary execution risk: tests run in an isolated declarative engine without browser exploit vectors.",
  },
  {
    step: "03",
    tag: "Debug",
    title: "Inspect Deep Network Metadata",
    description:
      "Break down exact response durations, payload sizes, decompressed payloads, cookie jars, and formatted JSON hierarchies with search filtering.",
    icon: Bug,
    detail: "Diagnose CORS errors, redirect loops, and server-side timeouts with transparent diagnostics.",
  },
  {
    step: "04",
    tag: "Ship",
    title: "Generate Code & Share Docs",
    description:
      "Export ready-to-use snippets in cURL, native Fetch, or Node.js. Publish endpoint documentation directly from your verified collection.",
    icon: Rocket,
    detail: "Export to team workspaces with Row Level Security and masked credential isolation.",
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-16 border-t border-border/60 bg-panel/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Workflow"
          title="From first prototype to production-ready shipping"
          description="A continuous cycle that eliminates context switching and keeps your engineering team aligned."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.step} delay={idx * 0.08}>
                <div className="relative flex h-full flex-col rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="font-mono text-xs font-semibold text-primary">{item.step}</span>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
                      {item.tag}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">{item.title}</h3>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>

                  <div className="mt-auto border-t border-border/40 pt-3">
                    <p className="font-mono text-[11px] leading-relaxed text-muted-foreground/80">{item.detail}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
