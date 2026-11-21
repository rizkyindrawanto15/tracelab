"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface JsonTreeViewerProps {
  data: unknown;
  className?: string;
  initialExpandedDepth?: number;
}

export function JsonTreeViewer({ data, className, initialExpandedDepth = 2 }: JsonTreeViewerProps) {
  return (
    <div className={cn("overflow-auto p-3 font-mono text-xs leading-relaxed select-text", className)}>
      <JsonNode name={null} value={data} depth={0} path="$" initialExpandedDepth={initialExpandedDepth} />
    </div>
  );
}

function JsonNode({
  name,
  value,
  depth,
  path,
  initialExpandedDepth,
}: {
  name: string | number | null;
  value: unknown;
  depth: number;
  path: string;
  initialExpandedDepth: number;
}) {
  const [expanded, setExpanded] = React.useState(depth < initialExpandedDepth);
  const [copied, setCopied] = React.useState(false);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    const ok = await copyToClipboard(str);
    if (ok) {
      setCopied(true);
      toast.success("Copied value to clipboard");
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(path);
    if (ok) {
      toast.success(`Copied path: ${path}`);
    }
  };

  if (!isObject) {
    return (
      <div className="group flex items-center gap-1.5 py-0.5 hover:bg-accent/40 rounded px-1 -mx-1">
        {name !== null && (
          <span className="text-muted-foreground">
            {typeof name === "number" ? <span className="text-amber-500/80">{name}</span> : <span className="text-primary/90">&quot;{name}&quot;</span>}:
          </span>
        )}
        <ValueDisplay value={value} />
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={handleCopyPath}
            title={`Copy JSON path: ${path}`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <span className="text-[10px] font-mono px-1">path</span>
          </button>
          <button
            onClick={handleCopy}
            title="Copy value"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          </button>
        </div>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);

  const count = entries.length;
  const bracketOpen = isArray ? "[" : "{";
  const bracketClose = isArray ? "]" : "}";

  return (
    <div className="py-0.5">
      <div
        onClick={() => setExpanded(!expanded)}
        className="group flex cursor-pointer items-center gap-1 rounded px-1 -mx-1 hover:bg-accent/40"
      >
        <button
          type="button"
          className="size-4 shrink-0 flex items-center justify-center text-muted-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>

        {name !== null && (
          <span className="text-muted-foreground">
            {typeof name === "number" ? <span className="text-amber-500/80">{name}</span> : <span className="text-primary/90">&quot;{name}&quot;</span>}:
          </span>
        )}

        <span className="text-foreground/80 font-bold">{bracketOpen}</span>

        {!expanded && (
          <span className="text-muted-foreground text-[11px]">
            {count} {count === 1 ? (isArray ? "item" : "property") : isArray ? "items" : "properties"}
          </span>
        )}

        {!expanded && <span className="text-foreground/80 font-bold">{bracketClose}</span>}

        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={handleCopyPath}
            title={`Copy path: ${path}`}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <span className="text-[10px] font-mono px-1">path</span>
          </button>
          <button
            onClick={handleCopy}
            title="Copy subtree"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-l border-border/60 ml-2 pl-3 my-0.5 space-y-0.5">
          {entries.map(([k, v]) => {
            const childPath = isArray ? `${path}[${k}]` : `${path}.${k}`;
            return (
              <JsonNode
                key={k}
                name={k}
                value={v}
                depth={depth + 1}
                path={childPath}
                initialExpandedDepth={initialExpandedDepth}
              />
            );
          })}
        </div>
      )}

      {expanded && (
        <div className="pl-5 text-foreground/80 font-bold">
          {bracketClose}
        </div>
      )}
    </div>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-destructive font-semibold">null</span>;
  }
  if (value === undefined) {
    return <span className="text-muted-foreground italic">undefined</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-purple-400 font-semibold">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-amber-400 font-semibold">{value}</span>;
  }
  if (typeof value === "string") {
    return (
      <span className="text-emerald-400 break-all">
        &quot;{value}&quot;
      </span>
    );
  }
  return <span>{String(value)}</span>;
}
