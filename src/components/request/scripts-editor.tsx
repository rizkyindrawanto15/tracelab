"use client";

import * as React from "react";
import { FlaskConical, Plus, ShieldCheck, Trash2, Variable } from "lucide-react";
import type { Assertion, AssertionType, RequestSettings, VariableExtraction } from "@/lib/types";
import { ASSERTION_LABELS, ASSERTION_NEEDS_EXPECTED, ASSERTION_NEEDS_TARGET } from "@/lib/assertions";
import { MAX_TIMEOUT_MS, MIN_TIMEOUT_MS, newAssertion, newExtraction } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { Checkbox, Switch } from "@/components/ui/menus";
import { Segmented, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";

const PLACEHOLDERS: Partial<Record<AssertionType, { target?: string; expected?: string }>> = {
  status_equals: { expected: "200" },
  body_contains: { expected: "\"success\":true" },
  json_property_exists: { target: "data.id" },
  json_property_equals: { target: "data.status", expected: "active" },
  response_time_below: { expected: "500" },
  header_exists: { target: "Content-Type" },
};

export function ScriptsEditor({
  assertions,
  extractions,
  onAssertions,
  onExtractions,
}: {
  assertions: Assertion[];
  extractions: VariableExtraction[];
  onAssertions: (a: Assertion[]) => void;
  onExtractions: (e: VariableExtraction[]) => void;
}) {
  const updateA = (id: string, patch: Partial<Assertion>) => onAssertions(assertions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const updateE = (id: string, patch: Partial<VariableExtraction>) => onExtractions(extractions.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
        <span>
          Scripts are declarative and run in a sandbox of rules — TraceLab never executes arbitrary JavaScript, so a shared request can&apos;t access your session, storage or other APIs.
        </span>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
            <FlaskConical className="size-4 text-primary" /> Tests
            <span className="font-normal text-muted-foreground">· run after every response</span>
          </h3>
          <Button variant="outline" size="sm" onClick={() => onAssertions([...assertions, newAssertion()])}>
            <Plus /> Add test
          </Button>
        </div>
        {assertions.length === 0 ? (
          <EmptyRow text="No tests yet. Add assertions such as “status equals 200” or “JSON property exists”." />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            {assertions.map((a) => {
              const needsTarget = ASSERTION_NEEDS_TARGET[a.type];
              const needsExpected = ASSERTION_NEEDS_EXPECTED[a.type];
              return (
                <div key={a.id} className={cn("group flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5 last:border-0", !a.enabled && "opacity-55")}>
                  <Checkbox checked={a.enabled} onCheckedChange={(v) => updateA(a.id, { enabled: v === true })} aria-label="Enable test" />
                  <Select value={a.type} onValueChange={(v) => updateA(a.id, { type: v as AssertionType, ...(v === "status_equals" ? { expected: "200" } : v === "response_time_below" ? { expected: "1000" } : {}) })}>
                    <SelectTrigger className="h-7 w-[210px] text-xs" aria-label="Assertion type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ASSERTION_LABELS) as AssertionType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ASSERTION_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {needsTarget && (
                    <Input
                      value={a.target}
                      onChange={(e) => updateA(a.id, { target: e.target.value })}
                      placeholder={PLACEHOLDERS[a.type]?.target}
                      aria-label={a.type === "header_exists" ? "Header name" : "JSON path"}
                      className="h-7 w-44 flex-1 font-mono text-xs"
                    />
                  )}
                  {needsExpected && (
                    <Input
                      value={a.expected}
                      onChange={(e) => updateA(a.id, { expected: e.target.value })}
                      placeholder={PLACEHOLDERS[a.type]?.expected}
                      aria-label="Expected value"
                      inputMode={a.type === "status_equals" || a.type === "response_time_below" ? "numeric" : undefined}
                      className="h-7 w-40 flex-1 font-mono text-xs"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onAssertions(assertions.filter((x) => x.id !== a.id))}
                    className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove test"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Variable className="size-4 text-primary" /> Extract variables
            <span className="font-normal text-muted-foreground">· saved to the active environment</span>
          </h3>
          <Button variant="outline" size="sm" onClick={() => onExtractions([...extractions, newExtraction()])}>
            <Plus /> Add rule
          </Button>
        </div>
        {extractions.length === 0 ? (
          <EmptyRow text="Capture values like an access token from the response and reuse them as {{variables}} in later requests." />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            {extractions.map((x) => (
              <div key={x.id} className={cn("flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5 last:border-0", !x.enabled && "opacity-55")}>
                <Checkbox checked={x.enabled} onCheckedChange={(v) => updateE(x.id, { enabled: v === true })} aria-label="Enable rule" />
                <Select value={x.source} onValueChange={(v) => updateE(x.id, { source: v as "json" | "header" })}>
                  <SelectTrigger className="h-7 w-32 text-xs" aria-label="Source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON body</SelectItem>
                    <SelectItem value="header">Header</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={x.path}
                  onChange={(e) => updateE(x.id, { path: e.target.value })}
                  placeholder={x.source === "json" ? "data.access_token" : "X-Request-ID"}
                  aria-label="Path"
                  className="h-7 w-44 flex-1 font-mono text-xs"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  value={x.variable}
                  onChange={(e) => updateE(x.id, { variable: e.target.value.replace(/[^A-Za-z0-9_.-]/g, "") })}
                  placeholder="api_token"
                  aria-label="Variable name"
                  className="h-7 w-36 font-mono text-xs"
                />
                <button type="button" onClick={() => onExtractions(extractions.filter((e) => e.id !== x.id))} className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove rule">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-3 text-[12.5px] text-muted-foreground">{text}</p>;
}

export function SettingsEditor({ settings, onChange }: { settings: RequestSettings; onChange: (s: RequestSettings) => void }) {
  const [timeoutText, setTimeoutText] = React.useState(String(settings.timeoutMs));
  React.useEffect(() => setTimeoutText(String(settings.timeoutMs)), [settings.timeoutMs]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Transport</Label>
        <Segmented
          value={settings.transport}
          onChange={(transport) => onChange({ ...settings, transport })}
          options={[
            { value: "direct", label: "Direct (browser)" },
            { value: "proxy", label: "TraceLab proxy" },
          ]}
          className="w-fit"
        />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {settings.transport === "direct" ? (
            <>
              Requests go straight from your browser. The target API must allow cross-origin requests (CORS). Works with <code className="font-mono">localhost</code> and private networks. Browsers hide
              <code className="font-mono"> Set-Cookie</code> and some headers.
            </>
          ) : (
            <>
              Requests are relayed by the TraceLab server — useful for public APIs without CORS. Only public internet hosts are reachable: private, loopback and cloud-metadata addresses are blocked. Bodies are
              limited to 4&nbsp;MB and responses to 3&nbsp;MB.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timeout">Timeout (ms)</Label>
        <Input
          id="timeout"
          inputMode="numeric"
          value={timeoutText}
          onChange={(e) => setTimeoutText(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            const n = Math.min(Math.max(Number(timeoutText) || 30_000, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
            setTimeoutText(String(n));
            onChange({ ...settings, timeoutMs: n });
          }}
          className="w-40 font-mono"
        />
        <p className="text-[12px] text-muted-foreground">
          Between {MIN_TIMEOUT_MS / 1000}s and {MAX_TIMEOUT_MS / 1000}s. The request is aborted when the limit is reached.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Follow redirects</p>
          <p className="text-[12px] text-muted-foreground">Proxy only (max 5 hops). Browsers always follow redirects for direct requests.</p>
        </div>
        <Switch checked={settings.followRedirects} onCheckedChange={(followRedirects) => onChange({ ...settings, followRedirects })} aria-label="Follow redirects" />
      </div>
    </div>
  );
}
