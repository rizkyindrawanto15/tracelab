"use client";

import * as React from "react";
import { ChevronDown, Code2, Copy, Loader2, Save, SaveAll, Send, Square } from "lucide-react";
import { HTTP_METHODS, type HttpMethod, type RequestConfig } from "@/lib/types";
import { cn, isMac } from "@/lib/utils";
import { paramsFromUrl } from "@/lib/url";
import { findUndefinedVariables } from "@/lib/variables";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Tooltip,
} from "@/components/ui/menus";
import { methodColor } from "@/components/brand";
import { VariableInput, useVariables } from "./variable-input";

interface UrlBarProps {
  config: RequestConfig;
  loading: boolean;
  dirty: boolean;
  canSave: boolean;
  onChange: (updater: (c: RequestConfig) => RequestConfig) => void;
  onSend: () => void;
  onCancel: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDuplicate: () => void;
  onShowCode: () => void;
}

export function UrlBar({ config, loading, dirty, canSave, onChange, onSend, onCancel, onSave, onSaveAs, onDuplicate, onShowCode }: UrlBarProps) {
  const vars = useVariables();
  const mod = isMac() ? "⌘" : "Ctrl";
  const missing = React.useMemo(() => findUndefinedVariables([config.url], vars), [config.url, vars]);

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-2 pt-3">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-input bg-panel-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-full w-[92px] shrink-0 items-center justify-between gap-1 rounded-l-lg border-r border-input pl-3 pr-2 font-mono text-xs font-semibold hover:bg-accent/60",
                  methodColor(config.method),
                )}
                aria-label={`HTTP method: ${config.method}`}
              >
                {config.method}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {HTTP_METHODS.map((m) => (
                <DropdownMenuItem key={m} onSelect={() => onChange((c) => ({ ...c, method: m as HttpMethod }))} className={cn("font-mono text-xs font-semibold", methodColor(m))}>
                  {m}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <VariableInput
            value={config.url}
            onChange={(url) => onChange((c) => ({ ...c, url, params: paramsFromUrl(url, c.params) }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Enter a URL, e.g. {{base_url}}/users or https://api.example.com/v1/users"
            ariaLabel="Request URL"
            className="h-full px-3 text-[13px]"
          />
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <Button onClick={onCancel} variant="secondary" className="h-9 w-[92px]" aria-label="Cancel request">
              <Square className="fill-current" />
              Cancel
            </Button>
          ) : (
            <Tooltip content="Send request" shortcut={`${mod} ↵`}>
              <Button onClick={onSend} className="h-9 w-[92px]" aria-label="Send request">
                <Send />
                Send
              </Button>
            </Tooltip>
          )}

          <div className="flex h-9 items-center rounded-md border border-border">
            <Tooltip content={canSave ? "Save request" : "Viewers cannot save"} shortcut={`${mod} S`}>
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="flex h-full items-center gap-1.5 rounded-l-md px-3 text-[13px] font-medium hover:bg-accent disabled:opacity-50"
                aria-label="Save request"
              >
                <Save className="size-4" />
                <span className="hidden md:inline">Save</span>
                {dirty && <span className="size-1.5 rounded-full bg-warning" aria-label="Unsaved changes" />}
              </button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-full items-center border-l border-border px-1.5 hover:bg-accent" aria-label="More save options">
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={onSaveAs} disabled={!canSave}>
                  <SaveAll /> Save as…
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy /> Duplicate tab
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onShowCode}>
                  <Code2 /> Generate code
                  <DropdownMenuShortcut>{mod} ⇧ C</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tooltip content="Generate code snippet">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onShowCode} aria-label="Generate code">
              <Code2 />
            </Button>
          </Tooltip>
        </div>
      </div>
      {missing.length > 0 && (
        <p className="flex items-center gap-1.5 pl-1 text-[11.5px] text-destructive">
          Undefined variable{missing.length > 1 ? "s" : ""}: {missing.map((m) => `{{${m}}}`).join(", ")} — select or edit an environment.
        </p>
      )}
      {loading && (
        <div className="flex items-center gap-1.5 pl-1 text-[11.5px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Sending request… press Cancel to abort.
        </div>
      )}
    </div>
  );
}
