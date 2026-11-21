import * as React from "react";
import {
  Binary,
  Code2,
  Command,
  FileCode2,
  FolderTree,
  KeyRound,
  Layers,
  Network,
  PlaySquare,
  ShieldCheck,
} from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: Network,
    title: "Real HTTP Request Engine",
    description: "Support for GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS with real Fetch execution, query params, headers, and cancellation via AbortController.",
  },
  {
    icon: Binary,
    title: "Response Inspector",
    description: "Deep response analysis with JSON syntax highlighting, interactive tree navigation, raw output, safe sandboxed HTML rendering, response headers, and cookies.",
  },
  {
    icon: FolderTree,
    title: "Collections & Workspaces",
    description: "Organize endpoints into hierarchical collections, reorder requests, duplicate configs, and collaborate across team workspaces.",
  },
  {
    icon: Layers,
    title: "Dynamic Environments",
    description: "Switch seamlessly between Local, Dev, Staging, and Production. Resolve {{variable}} tokens in URLs, headers, and bodies with automatic secret masking.",
  },
  {
    icon: KeyRound,
    title: "Auth Helpers",
    description: "Built-in support for Bearer Tokens, Basic Auth, and API Keys injected into headers or query params, with full credential masking.",
  },
  {
    icon: Code2,
    title: "Instant Code Generation",
    description: "Generate copy-pasteable snippets in cURL, modern JavaScript Fetch, and Node.js with authentic headers, payload serialization, and error handling.",
  },
  {
    icon: ShieldCheck,
    title: "Declarative Testing & Assertions",
    description: "Verify status codes, response time thresholds, body text, and JSON property paths without executing arbitrary, unsafe user JavaScript.",
  },
  {
    icon: FileCode2,
    title: "Live API Documentation",
    description: "Document endpoints, query parameters, header requirements, and example request/response payloads in a clean, searchable interface.",
  },
  {
    icon: PlaySquare,
    title: "JSON Utilities Suite",
    description: "Format, minify, inspect, and validate JSON payloads with precise syntax error locations and instant clipboard copying.",
  },
  {
    icon: Command,
    title: "Raycast-Style Command Palette",
    description: "Instant keyboard navigation with ⌘K / Ctrl+K to jump across endpoints, environments, history, and actions at full developer velocity.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-border/60 bg-panel/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Engineered for Precision"
          title="Everything you need to test and debug APIs"
          description="Built from the ground up for software engineers who value speed, ergonomics, and rock-solid reliability."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={idx * 0.04}>
                <div className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <div className="mb-3.5 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
