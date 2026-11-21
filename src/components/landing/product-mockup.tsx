import * as React from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Code2,
  Copy,
  Folder,
  HardDrive,
  Layers,
  Play,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

export function ProductMockup() {
  return (
    <section className="relative overflow-hidden border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Developer Experience"
          title="Designed like a native desktop instrument"
          description="High density, zero bloat, keyboard-first navigation, and immediate visual feedback on every byte."
        />

        <Reveal className="mt-14" delay={0.1}>
          <div className="relative mx-auto overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
            {/* Window Title Bar */}
            <div className="flex h-10 items-center justify-between border-b border-border bg-panel px-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-destructive/60" />
                <span className="size-3 rounded-full bg-warning/60" />
                <span className="size-3 rounded-full bg-success/60" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">TraceLab · Workspace: Production APIs</span>
              </div>
              <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5">
                  <Layers className="size-3 text-primary" /> Staging Env
                </span>
                <span className="rounded bg-muted/60 px-1.5 py-0.5">⌘K</span>
              </div>
            </div>

            {/* Application Mock Body */}
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
              {/* Mock Sidebar */}
              <div className="hidden border-r border-border bg-panel-2/60 p-3 md:block">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="uppercase tracking-wider">Collections</span>
                  <Folder className="size-3.5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 rounded-md bg-accent/60 px-2 py-1.5 font-medium text-foreground">
                    <ChevronDown className="size-3 text-muted-foreground" />
                    <span>Authentication</span>
                  </div>
                  <div className="ml-4 space-y-0.5">
                    <div className="flex items-center justify-between rounded px-2 py-1 text-muted-foreground hover:bg-accent/40">
                      <span className="font-mono text-[11px] font-semibold text-method-post">POST</span>
                      <span className="truncate">/v1/oauth/token</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-primary/10 px-2 py-1 font-medium text-primary">
                      <span className="font-mono text-[11px] font-semibold text-method-get">GET</span>
                      <span className="truncate">/v1/users/me</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent/40">
                    <ChevronDown className="size-3 -rotate-90 text-muted-foreground" />
                    <span>Billing & Subscriptions</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent/40">
                    <ChevronDown className="size-3 -rotate-90 text-muted-foreground" />
                    <span>Webhooks & Events</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent History
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-method-get">GET</span>
                      <span className="text-success">200 OK</span>
                      <span>38ms</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-method-post">POST</span>
                      <span className="text-success">201 CREATED</span>
                      <span>112ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Workspace Content */}
              <div className="flex flex-col bg-background">
                {/* Tabs bar */}
                <div className="flex h-9 items-center border-b border-border bg-panel px-2 text-xs">
                  <div className="flex items-center gap-2 border-b-2 border-primary bg-background px-3 py-2 font-medium text-foreground">
                    <span className="font-mono font-semibold text-method-get">GET</span>
                    <span>Get Current User Profile</span>
                    <span className="size-1.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground">
                    <span className="font-mono font-semibold text-method-post">POST</span>
                    <span>Issue API Token</span>
                  </div>
                </div>

                {/* URL bar */}
                <div className="border-b border-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-lg border border-input bg-panel-2 font-mono text-xs">
                      <div className="border-r border-input px-3 py-1.5 font-bold text-method-get">GET</div>
                      <div className="flex-1 px-3 text-foreground">
                        <span className="text-primary font-medium">{"{{base_url}}"}</span>/v1/users/me?include=teams,roles
                      </div>
                    </div>
                    <button className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm">
                      <Send className="size-3.5" />
                      Send
                    </button>
                  </div>
                </div>

                {/* Request / Response Split Preview */}
                <div className="grid grid-cols-1 divide-y border-b border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                  {/* Request configuration preview */}
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3 font-medium">
                        <span className="text-foreground border-b border-primary pb-0.5">Headers (3)</span>
                        <span>Auth (Bearer)</span>
                        <span>Tests (2)</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between rounded border border-border bg-panel-2 px-2.5 py-1">
                        <span className="text-muted-foreground">Authorization</span>
                        <span className="text-foreground">Bearer {"{{api_token}}"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-border bg-panel-2 px-2.5 py-1">
                        <span className="text-muted-foreground">Accept</span>
                        <span className="text-foreground">application/json</span>
                      </div>
                      <div className="flex items-center justify-between rounded border border-border bg-panel-2 px-2.5 py-1">
                        <span className="text-muted-foreground">X-Request-ID</span>
                        <span className="text-primary">req_01h9x82z</span>
                      </div>
                    </div>
                  </div>

                  {/* Real Response preview */}
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-success">
                          200 OK
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <Clock className="size-3" /> 42 ms
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">1.18 KB</span>
                      </div>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        JSON
                      </span>
                    </div>

                    <div className="rounded-md border border-border bg-panel-2 p-3 font-mono text-[11px] leading-relaxed">
                      <div className="text-muted-foreground">{"{"}</div>
                      <div className="pl-3">
                        <span className="text-indigo-400">&quot;id&quot;</span>: <span className="text-amber-300">&quot;usr_99182&quot;</span>,
                      </div>
                      <div className="pl-3">
                        <span className="text-indigo-400">&quot;email&quot;</span>: <span className="text-emerald-400">&quot;alex@tracelab.dev&quot;</span>,
                      </div>
                      <div className="pl-3">
                        <span className="text-indigo-400">&quot;tier&quot;</span>: <span className="text-amber-300">&quot;team_enterprise&quot;</span>,
                      </div>
                      <div className="pl-3">
                        <span className="text-indigo-400">&quot;active&quot;</span>: <span className="text-purple-400">true</span>,
                      </div>
                      <div className="pl-3">
                        <span className="text-indigo-400">&quot;teams&quot;</span>: [ <span className="text-amber-300">&quot;eng-core&quot;</span>, <span className="text-amber-300">&quot;infrastructure&quot;</span> ]
                      </div>
                      <div className="text-muted-foreground">{"}"}</div>
                    </div>

                    {/* Test assertions result preview */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <Check className="size-3.5" /> Status equals 200
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <Check className="size-3.5" /> Response time &lt; 200ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
