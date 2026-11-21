"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, FileUp, Trash2, Wand2, Minimize2 } from "lucide-react";
import type { BodyConfig, BodyType, FormDataField, HttpMethod, RawLanguage } from "@/lib/types";
import { METHODS_WITHOUT_BODY, emptyFormField } from "@/lib/defaults";
import { tryParseJson } from "@/lib/json-path";
import { cn, formatBytes } from "@/lib/utils";
import { useRuntimeStore } from "@/lib/state/tabs-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/menus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";
import { CodeEditor } from "@/components/editor/code-editor";
import { KeyValueEditor } from "./key-value-editor";
import { VariableInput } from "./variable-input";

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "none" },
  { value: "json", label: "JSON" },
  { value: "raw", label: "raw" },
  { value: "urlencoded", label: "x-www-form-urlencoded" },
  { value: "form-data", label: "form-data" },
];

const RAW_LANGS: { value: RawLanguage; label: string; monaco: string }[] = [
  { value: "text", label: "Text", monaco: "plaintext" },
  { value: "xml", label: "XML", monaco: "xml" },
  { value: "html", label: "HTML", monaco: "html" },
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
];

export function BodyEditor({ body, method, onChange }: { body: BodyConfig; method: HttpMethod; onChange: (b: BodyConfig) => void }) {
  const noBody = METHODS_WITHOUT_BODY.includes(method);
  const jsonState = React.useMemo(() => {
    if (body.type !== "json" || !body.json.trim()) return null;
    // Variables like {{id}} inside JSON make it temporarily invalid; validate with placeholders swapped
    const probe = body.json.replace(/"?\{\{[^}]+\}\}"?/g, (m) => (m.startsWith('"') ? m : "0"));
    return tryParseJson(probe);
  }, [body.type, body.json]);

  const format = (minify = false) => {
    const parsed = tryParseJson(body.json);
    if (!parsed.ok) return;
    onChange({ ...body, json: minify ? JSON.stringify(parsed.value) : JSON.stringify(parsed.value, null, 2) });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Body type" className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {BODY_TYPES.map((t) => (
            <label key={t.value} className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted-foreground has-[:checked]:text-foreground">
              <input
                type="radio"
                name="body-type"
                value={t.value}
                checked={body.type === t.value}
                onChange={() => onChange({ ...body, type: t.value })}
                className="size-3.5 accent-[var(--primary)]"
              />
              {t.label}
            </label>
          ))}
        </div>
        {body.type === "json" && (
          <div className="flex items-center gap-1">
            {jsonState && (
              <span className={cn("mr-1 flex items-center gap-1 text-[11.5px]", jsonState.ok ? "text-success" : "text-destructive")}>
                {jsonState.ok ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                {jsonState.ok ? "Valid JSON" : `Invalid JSON${jsonState.line ? ` (line ${jsonState.line})` : ""}`}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => format(false)} disabled={!tryParseJson(body.json).ok}>
              <Wand2 /> Format
            </Button>
            <Button variant="ghost" size="sm" onClick={() => format(true)} disabled={!tryParseJson(body.json).ok}>
              <Minimize2 /> Minify
            </Button>
          </div>
        )}
        {body.type === "raw" && (
          <Select value={body.rawLanguage} onValueChange={(v) => onChange({ ...body, rawLanguage: v as RawLanguage })}>
            <SelectTrigger className="h-7 w-32 text-xs" aria-label="Raw body language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RAW_LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {noBody && body.type !== "none" && (
        <p className="flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[12px] text-warning">
          <AlertCircle className="size-3.5" /> {method} requests cannot carry a body in browsers. Switch the method to send this body.
        </p>
      )}

      {body.type === "none" && <p className="text-[13px] text-muted-foreground">This request does not have a body.</p>}

      {body.type === "json" && (
        <div className="min-h-[180px] flex-1 overflow-hidden rounded-md border border-border">
          <CodeEditor value={body.json} onChange={(json) => onChange({ ...body, json })} language="json" ariaLabel="JSON body" />
        </div>
      )}

      {body.type === "raw" && (
        <div className="min-h-[180px] flex-1 overflow-hidden rounded-md border border-border">
          <CodeEditor
            value={body.raw}
            onChange={(raw) => onChange({ ...body, raw })}
            language={RAW_LANGS.find((l) => l.value === body.rawLanguage)?.monaco ?? "plaintext"}
            ariaLabel="Raw body"
          />
        </div>
      )}

      {body.type === "urlencoded" && <KeyValueEditor rows={body.urlencoded} onChange={(urlencoded) => onChange({ ...body, urlencoded })} />}

      {body.type === "form-data" && <FormDataEditor rows={body.formData} onChange={(formData) => onChange({ ...body, formData })} />}
    </div>
  );
}

function FormDataEditor({ rows, onChange }: { rows: FormDataField[]; onChange: (rows: FormDataField[]) => void }) {
  const files = useRuntimeStore((s) => s.files);
  const setFile = useRuntimeStore((s) => s.setFile);
  const update = (id: string, patch: Partial<FormDataField>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_84px_minmax(0,1.4fr)_32px] border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground">
          <span />
          <span className="px-2 py-1.5">Key</span>
          <span className="border-l border-border px-2 py-1.5">Type</span>
          <span className="border-l border-border px-2 py-1.5">Value</span>
          <span />
        </div>
        {rows.length === 0 && <p className="px-3 py-3 text-[12.5px] text-muted-foreground">No fields yet.</p>}
        {rows.map((row) => {
          const file = files[row.id];
          return (
            <div key={row.id} className={cn("group grid grid-cols-[28px_minmax(0,1fr)_84px_minmax(0,1.4fr)_32px] items-center border-b border-border last:border-0", !row.enabled && "opacity-55")}>
              <div className="flex justify-center">
                <Checkbox checked={row.enabled} onCheckedChange={(v) => update(row.id, { enabled: v === true })} aria-label="Enable field" />
              </div>
              <input
                value={row.key}
                onChange={(e) => update(row.id, { key: e.target.value })}
                placeholder="Key"
                aria-label="Field key"
                className="h-8 min-w-0 bg-transparent px-2 font-mono text-xs focus:bg-accent/40 focus:outline-none"
              />
              <select
                value={row.type}
                onChange={(e) => update(row.id, { type: e.target.value as "text" | "file" })}
                aria-label="Field type"
                className="h-8 border-l border-border bg-transparent px-1.5 text-xs focus:outline-none"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
              <div className="flex min-w-0 items-center border-l border-border">
                {row.type === "text" ? (
                  <VariableInput value={row.value} onChange={(value) => update(row.id, { value })} placeholder="Value" ariaLabel="Field value" className="h-8 px-2 text-xs" />
                ) : (
                  <label className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
                    <FileUp className="size-3.5 shrink-0" />
                    <span className="truncate">{file ? `${file.name} (${formatBytes(file.size)})` : "Choose file…"}</span>
                    <input type="file" className="sr-only" onChange={(e) => setFile(row.id, e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(row.id, null);
                  onChange(rows.filter((r) => r.id !== row.id));
                }}
                className="mx-auto rounded p-1 text-muted-foreground opacity-0 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                aria-label="Remove field"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onChange([...rows, emptyFormField()])}>
          Add field
        </Button>
        <span className="text-[11px] text-muted-foreground">Selected files are kept for this session only and never saved.</span>
      </div>
    </div>
  );
}
