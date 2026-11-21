import * as React from "react";
import { Database, EyeOff, FileLock2, GlobeLock, KeyRound, ShieldAlert } from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

const SECURITY_ITEMS = [
  {
    icon: Database,
    title: "PostgreSQL Row Level Security",
    description: "Every table enforces strict RLS policies in Supabase. Users and teams only ever access records inside their authenticated workspace boundaries.",
  },
  {
    icon: EyeOff,
    title: "Zero-Leak Credential Redaction",
    description: "Sensitive tokens, passwords, and custom API keys are masked in the UI and systematically redacted before any request is written to persistence or history logs.",
  },
  {
    icon: GlobeLock,
    title: "SSRF-Hardened Request Proxy",
    description: "The optional server-side proxy performs real-time DNS resolution checks, strictly prohibiting connection attempts to private subnets, loopbacks (127.0.0.1, localhost), and cloud instance metadata endpoints (169.254.169.254).",
  },
  {
    icon: FileLock2,
    title: "Declarative, Safe Assertions",
    description: "Response testing uses a pure declarative AST parser. TraceLab never evaluates arbitrary, untrusted user JavaScript that could hijack browser state or storage.",
  },
  {
    icon: ShieldAlert,
    title: "Sandboxed Response Renderers",
    description: "Non-JSON HTML and XML responses are isolated in sandboxed iframes with script execution disabled, preventing cross-site scripting from remote payloads.",
  },
  {
    icon: KeyRound,
    title: "No Service-Role Key Deployment",
    description: "The entire application architecture operates with public anonymous client keys and verified session JWTs. High-privilege service-role tokens are never embedded into the web app.",
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="scroll-mt-16 border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Security & Architecture"
          title="Engineered with defense-in-depth principles"
          description="Factual, verifiable safeguards designed to keep development tokens safe and internal networks isolated."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={idx * 0.05}>
                <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
                  <div className="mb-3.5 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
