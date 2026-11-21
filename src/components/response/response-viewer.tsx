"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  HardDrive,
  Info,
  Layers,
  Minimize2,
  RefreshCw,
  Search,
  ShieldAlert,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  type AssertionResult,
  type ExecutedResponse,
  type RequestError,
} from "@/lib/types";
import { formatBytes, formatDuration, formatTimestamp, copyToClipboard, downloadText, cn } from "@/lib/utils";
import { looksLikeJson, tryParseJson } from "@/lib/json-path";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Segmented, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/select-tabs";
import { Tooltip } from "@/components/ui/menus";
import { CodeEditor } from "@/components/editor/code-editor";
import { JsonTreeViewer } from "./json-tree-viewer";
import { SandboxedPreview } from "./sandboxed-preview";
import { toast } from "sonner";

interface ResponseViewerProps {
  status: "idle" | "loading" | "done" | "error";
  response?: ExecutedResponse;
  error?: RequestError;
  results?: AssertionResult[];
  onCancel?: () => void;
  onSwitchToProxy?: () => void;
}

type BodyViewMode = "pretty" | "raw" | "tree" | "preview";

export function ResponseViewer({
  status,
  response,
  error,
  results,
  onCancel,
  onSwitchToProxy,
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = React.useState<"body" | "headers" | "cookies" | "tests">("body");
  const [bodyMode, setBodyMode] = React.useState<BodyViewMode>("pretty");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Live timer for loading state
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (status !== "loading") {
      setElapsed(0);
      return;
    }
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsed(Math.round(performance.now() - start));
    }, 50);
    return () => clearInterval(interval);
  }, [status]);

  const isJson = React.useMemo(() => {
    if (!response) return false;
    return looksLikeJson(response.contentType, response.bodyText);
  }, [response]);

  const parsedJson = React.useMemo(() => {
    if (!response || !isJson) return null;
    const res = tryParseJson(response.bodyText);
    return res.ok ? res.value : null;
  }, [response, isJson]);

  const isHtml = React.useMemo(() => {
    if (!response) return false;
    return /text\/html/i.test(response.contentType) || response.bodyText.trim().startsWith("<!DOCTYPE") || response.bodyText.trim().startsWith("<html");
  }, [response]);

  const handleCopy = async () => {
    if (!response) return;
    const ok = await copyToClipboard(response.bodyText);
    if (ok) {
      setCopied(true);
      toast.success("Response copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!response) return;
    const ext = isJson ? "json" : isHtml ? "html" : "txt";
    downloadText(`response-${Date.now()}.${ext}`, response.bodyText, response.contentType || "text/plain");
    toast.success("Downloaded response");
  };

  // Idle state
  if (status === "idle" && !response && !error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 rounded-xl border border-border/80 bg-panel-2 p-4 text-muted-foreground/60 shadow-inner">
          <FileCode className="size-8 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">No response yet</h3>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Enter a URL and click <span className="font-semibold text-foreground">Send</span> to inspect status codes, latency, headers, and payloads.
        </p>
      </div>
    );
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-4 flex size-12 items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-primary" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Sending request…</h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{elapsed} ms</p>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} className="mt-4">
            Cancel Request
          </Button>
        )}
      </div>
    );
  }

  // Error state
  if (status === "error" && error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 rounded-full border border-destructive/25 bg-destructive/10 p-3 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{error.title}</h3>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">{error.message}</p>
        {error.hint && (
          <div className="mt-4 max-w-md rounded-lg border border-border bg-panel-2 p-3 text-left text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Suggestion: </span>
            {error.hint}
          </div>
        )}
        {error.kind === "network" && onSwitchToProxy && (
          <Button onClick={onSwitchToProxy} size="sm" className="mt-4 gap-1.5">
            <Layers className="size-3.5" />
            Switch to TraceLab Proxy
          </Button>
        )}
      </div>
    );
  }

  if (!response) return null;

  const failedTests = results?.filter((r) => !r.passed).length ?? 0;
  const passedTests = results?.filter((r) => r.passed).length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Response Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={response.status} statusText={response.statusText} />

          <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            <span>{formatDuration(response.durationMs)}</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <HardDrive className="size-3" />
            <span>{formatBytes(response.sizeBytes)}</span>
          </div>

          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold",
              response.transport === "proxy"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground",
            )}
          >
            {response.transport}
          </span>

          {response.redirected && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              redirected
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <Tooltip content="Search response">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearchVisible(!searchVisible)}
              className={cn(searchVisible && "bg-accent text-foreground")}
              aria-label="Search response"
            >
              <Search />
            </Button>
          </Tooltip>

          <Tooltip content="Copy body">
            <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy body">
              {copied ? <Check className="text-success" /> : <Copy />}
            </Button>
          </Tooltip>

          <Tooltip content="Download body">
            <Button variant="ghost" size="icon-sm" onClick={handleDownload} aria-label="Download body">
              <ArrowDownToLine />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* In-response search input */}
      {searchVisible && (
        <div className="flex items-center gap-2 border-b border-border bg-panel-2 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search text in response…"
            className="h-6 flex-1 bg-transparent font-mono text-xs outline-none placeholder:font-sans placeholder:text-muted-foreground/60"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Response Tabs Header */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-panel px-3">
          <TabsList className="border-0 bg-transparent">
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="headers">
              Headers <span className="ml-1 text-[10px] text-muted-foreground">({response.headers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cookies">
              Cookies{" "}
              {response.cookies.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">({response.cookies.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tests">
              Test Results{" "}
              {results && results.length > 0 && (
                <span
                  className={cn(
                    "ml-1 font-mono text-[10px] font-semibold",
                    failedTests > 0 ? "text-destructive" : "text-success",
                  )}
                >
                  ({passedTests}/{results.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === "body" && !response.isBinary && (
            <div className="py-1">
              <Segmented<BodyViewMode>
                value={bodyMode}
                onChange={setBodyMode}
                options={[
                  { value: "pretty", label: "Pretty" },
                  { value: "raw", label: "Raw" },
                  { value: "tree", label: "Tree", disabled: !isJson },
                  { value: "preview", label: "Preview", disabled: !isHtml },
                ]}
              />
            </div>
          )}
        </div>

        {/* Tab 1: Body */}
        <TabsContent value="body" className="h-full min-h-0 flex-1 overflow-hidden p-0 m-0">
          {response.isBinary && response.blobUrl ? (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <img
                src={response.blobUrl}
                alt="Binary response preview"
                className="max-h-[80%] max-w-[80%] rounded-md object-contain shadow"
              />
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {response.contentType} · {formatBytes(response.sizeBytes)}
              </p>
            </div>
          ) : bodyMode === "tree" && parsedJson !== null ? (
            <JsonTreeViewer data={parsedJson} className="h-full" />
          ) : bodyMode === "preview" && isHtml ? (
            <SandboxedPreview html={response.bodyText} />
          ) : bodyMode === "raw" ? (
            <div className="h-full overflow-auto p-3 font-mono text-xs leading-relaxed select-text whitespace-pre-wrap">
              {searchQuery ? (
                <HighlightSearchResults text={response.bodyText} query={searchQuery} />
              ) : (
                response.bodyText || <span className="italic text-muted-foreground">(Empty response body)</span>
              )}
            </div>
          ) : (
            <CodeEditor
              value={response.bodyText}
              language={isJson ? "json" : isHtml ? "html" : "plaintext"}
              readOnly
              className="h-full"
            />
          )}
        </TabsContent>

        {/* Tab 2: Headers */}
        <TabsContent value="headers" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-border bg-panel-2 text-[11px] font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Header</th>
                  <th className="border-l border-border px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {response.headers.map(([key, val], idx) => (
                  <tr key={idx} className="hover:bg-accent/30 group">
                    <td className="px-3 py-1.5 font-medium text-foreground select-text">{key}</td>
                    <td className="border-l border-border px-3 py-1.5 text-muted-foreground select-text break-all">
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 3: Cookies */}
        <TabsContent value="cookies" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          {response.cookiesUnavailable ? (
            <div className="rounded-lg border border-border bg-panel-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                <Info className="size-4 text-primary" />
                Browser Cookie Isolation
              </div>
              Browser security policies restrict JavaScript from reading <code className="font-mono text-foreground">Set-Cookie</code> headers on direct Fetch requests.
              To inspect and manage cookies set by upstream servers, execute this request using the <span className="font-semibold text-foreground">TraceLab proxy</span> transport in Request Settings.
            </div>
          ) : response.cookies.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No cookies received in this response.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-border bg-panel-2 text-[11px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="border-l border-border px-3 py-2">Value</th>
                    <th className="border-l border-border px-3 py-2">Domain</th>
                    <th className="border-l border-border px-3 py-2">Path</th>
                    <th className="border-l border-border px-3 py-2">Expires</th>
                    <th className="border-l border-border px-3 py-2">Secure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {response.cookies.map((c, i) => (
                    <tr key={i} className="hover:bg-accent/30">
                      <td className="px-3 py-1.5 font-medium text-foreground">{c.name}</td>
                      <td className="border-l border-border px-3 py-1.5 text-muted-foreground truncate max-w-xs">{c.value}</td>
                      <td className="border-l border-border px-3 py-1.5 text-muted-foreground">{c.domain || "—"}</td>
                      <td className="border-l border-border px-3 py-1.5 text-muted-foreground">{c.path || "—"}</td>
                      <td className="border-l border-border px-3 py-1.5 text-muted-foreground">{c.expires || "Session"}</td>
                      <td className="border-l border-border px-3 py-1.5 text-muted-foreground">{c.secure ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Tests */}
        <TabsContent value="tests" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          {!results || results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No tests configured for this request. Add assertions in the <span className="font-semibold text-foreground">Scripts</span> tab.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium pb-1">
                <span>
                  {passedTests} passed, {failedTests} failed ({results.length} total)
                </span>
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                {results.map((res, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2.5 border-b border-border/80 p-2.5 text-xs last:border-0",
                      res.passed ? "bg-success/5" : "bg-destructive/5",
                    )}
                  >
                    {res.passed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                    <span className="font-medium text-foreground">{res.message}</span>
                    {res.actual !== undefined && (
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        actual: {res.actual}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HighlightSearchResults({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="tl-hit bg-amber-500/30 text-foreground rounded-xs px-0.5">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}
