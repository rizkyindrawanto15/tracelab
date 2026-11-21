"use client";

import * as React from "react";
import { AlertTriangle, Clock, HardDrive, Loader2, Play, RotateCcw, Square } from "lucide-react";
import { MethodBadge, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { JsonHighlight } from "./json-highlight";

interface DemoEndpoint {
  id: string;
  label: string;
  method: "GET" | "POST";
  url: string;
  body?: string;
}

const ENDPOINTS: DemoEndpoint[] = [
  { id: "post", label: "Get a post", method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1" },
  { id: "users", label: "List users", method: "GET", url: "https://jsonplaceholder.typicode.com/users?_limit=2" },
  {
    id: "create",
    label: "Create a post",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    body: JSON.stringify({ title: "Hello from TraceLab", body: "Build. Test. Debug. Ship.", userId: 1 }, null, 2),
  },
];

const TIMEOUT_MS = 10_000;

type Result =
  | {
      kind: "success";
      status: number;
      statusText: string;
      durationMs: number;
      sizeBytes: number;
      body: string;
      isJson: boolean;
      headers: [string, string][];
    }
  | { kind: "error"; title: string; message: string; durationMs: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function RequestPreview({ className }: { className?: string }) {
  const [endpointId, setEndpointId] = React.useState(ENDPOINTS[0].id);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [tab, setTab] = React.useState<"body" | "headers">("body");
  const controllerRef = React.useRef<AbortController | null>(null);
  const timedOutRef = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const endpoint = ENDPOINTS.find((e) => e.id === endpointId) ?? ENDPOINTS[0];

  const clearTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  React.useEffect(
    () => () => {
      clearTimer();
      controllerRef.current?.abort();
    },
    [],
  );

  const cancel = React.useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const send = React.useCallback(async () => {
    controllerRef.current?.abort();
    clearTimer();
    const controller = new AbortController();
    controllerRef.current = controller;
    timedOutRef.current = false;
    timeoutRef.current = setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, TIMEOUT_MS);

    setLoading(true);
    setResult(null);
    const start = performance.now();
    try {
      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.body ? { "Content-Type": "application/json; charset=UTF-8", Accept: "application/json" } : { Accept: "application/json" },
        body: endpoint.body,
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await res.text();
      const durationMs = performance.now() - start;
      let body = text;
      let isJson = false;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
        isJson = true;
      } catch {
        // Not JSON — show raw text.
      }
      const headers: [string, string][] = [];
      res.headers.forEach((value, key) => headers.push([key, value]));
      headers.sort((a, b) => a[0].localeCompare(b[0]));
      if (controllerRef.current !== controller) return;
      setResult({
        kind: "success",
        status: res.status,
        statusText: res.statusText,
        durationMs,
        sizeBytes: new TextEncoder().encode(text).length,
        body,
        isJson,
        headers,
      });
    } catch (err) {
      if (controllerRef.current !== controller) return;
      const durationMs = performance.now() - start;
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (aborted && timedOutRef.current) {
        setResult({ kind: "error", title: "Request timed out", message: `No response within ${TIMEOUT_MS / 1000} seconds. The request was aborted.`, durationMs });
      } else if (aborted) {
        setResult({ kind: "error", title: "Request cancelled", message: "You cancelled the request before a response arrived.", durationMs });
      } else {
        setResult({
          kind: "error",
          title: "Network error",
          message: "Could not reach the server. Check your connection, VPN, or content blockers and try again.",
          durationMs,
        });
      }
    } finally {
      if (controllerRef.current === controller) {
        clearTimer();
        setLoading(false);
      }
    }
  }, [endpoint]);

  const selectEndpoint = (id: string) => {
    if (id === endpointId) return;
    controllerRef.current?.abort();
    controllerRef.current = null;
    clearTimer();
    setLoading(false);
    setEndpointId(id);
    setResult(null);
    setTab("body");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-black/20", className)}
      onKeyDown={onKeyDown}
    >
      {/* Window chrome */}
      <div className="flex h-9 items-center gap-3 border-b border-border bg-panel-2 px-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Live request</span>
        <span className="ml-auto hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>Enter</Kbd>
          <span className="ml-1">to send</span>
        </span>
      </div>

      {/* Endpoint picker */}
      <div role="group" aria-label="Example endpoints" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {ENDPOINTS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={e.id === endpointId}
            onClick={() => selectEndpoint(e.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              e.id === endpointId ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <MethodBadge method={e.method} />
            {e.label}
          </button>
        ))}
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 p-2.5">
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-input bg-background px-3">
          <MethodBadge method={endpoint.method} className="text-[11px]" />
          <span className="h-4 w-px bg-border" aria-hidden />
          <span className="truncate font-mono text-[12.5px]" title={endpoint.url}>
            {endpoint.url}
          </span>
        </div>
        {loading ? (
          <Button variant="secondary" className="h-9 px-3.5" onClick={cancel}>
            <Square className="!size-3.5" aria-hidden />
            Cancel
          </Button>
        ) : (
          <Button className="h-9 px-4" onClick={() => void send()}>
            <Play className="!size-3.5" aria-hidden />
            Send
          </Button>
        )}
      </div>

      {endpoint.body ? (
        <div className="border-t border-border px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            Body
            <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px]">application/json</span>
          </div>
          <JsonHighlight code={endpoint.body} className="rounded-md bg-panel-2 px-2 py-1.5" />
        </div>
      ) : null}

      {/* Response */}
      <div className="border-t border-border">
        <div className="flex h-10 items-center gap-3 border-b border-border px-3">
          <div role="tablist" aria-label="Response view" className="flex gap-1">
            {(["body", "headers"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded px-2 py-1 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
                {t === "headers" && result?.kind === "success" ? (
                  <span className="ml-1 text-muted-foreground">{result.headers.length}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground" aria-live="polite">
            {result?.kind === "success" ? (
              <>
                <StatusBadge status={result.status} statusText={result.statusText || undefined} />
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="size-3" aria-hidden />
                  <span className="sr-only">Duration</span>
                  {formatDuration(result.durationMs)}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="size-3" aria-hidden />
                  <span className="sr-only">Size</span>
                  {formatBytes(result.sizeBytes)}
                </span>
              </>
            ) : result?.kind === "error" ? (
              <StatusBadge status={null} />
            ) : null}
          </div>
        </div>

        <div className="scrollbar-thin h-[260px] overflow-auto px-2 py-2" role="tabpanel" aria-busy={loading}>
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending request…
            </div>
          ) : result?.kind === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
              <div className="flex size-9 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-[13px] font-medium">{result.title}</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{result.message}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void send()}>
                <RotateCcw aria-hidden />
                Retry
              </Button>
            </div>
          ) : result?.kind === "success" ? (
            tab === "body" ? (
              result.isJson ? (
                <JsonHighlight code={result.body} />
              ) : (
                <pre className="whitespace-pre-wrap break-all px-1 font-mono text-[12px] leading-[1.6]">{result.body || "(empty body)"}</pre>
              )
            ) : (
              <table className="w-full text-left font-mono text-[12px]">
                <caption className="sr-only">Response headers</caption>
                <tbody>
                  {result.headers.map(([k, v]) => (
                    <tr key={k} className="border-b border-border/60 last:border-0">
                      <th scope="row" className="py-1.5 pl-1 pr-4 align-top font-medium text-method-patch">
                        {k}
                      </th>
                      <td className="break-all py-1.5 text-muted-foreground">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Play className="size-4" aria-hidden />
              <p>
                Press <span className="font-medium text-foreground">Send</span> to run a real request from your browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
