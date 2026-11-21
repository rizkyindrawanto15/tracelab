"use client";

import * as React from "react";
import { Eye, EyeOff, ListPlus, Text, Trash2 } from "lucide-react";
import type { KeyValue } from "@/lib/types";
import { emptyKV } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Tooltip } from "@/components/ui/menus";
import { VariableInput } from "./variable-input";

interface KeyValueEditorProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keySuggestions?: string[];
  showDescription?: boolean;
  readOnly?: boolean;
  /** Keys whose values should be masked (e.g. Authorization) */
  sensitive?: (key: string) => boolean;
  emptyHint?: string;
}

function toBulk(rows: KeyValue[]): string {
  return rows
    .filter((r) => r.key || r.value)
    .map((r) => `${r.enabled ? "" : "// "}${r.key}: ${r.value}`)
    .join("\n");
}

function fromBulk(text: string, previous: KeyValue[]): KeyValue[] {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .map((line, i) => {
      let enabled = true;
      let l = line.trim();
      if (l.startsWith("//")) {
        enabled = false;
        l = l.slice(2).trim();
      }
      const idx = l.indexOf(":");
      const key = idx >= 0 ? l.slice(0, idx).trim() : l;
      const value = idx >= 0 ? l.slice(idx + 1).trim() : "";
      return { ...emptyKV(), id: previous[i]?.id ?? emptyKV().id, key, value, enabled, description: previous[i]?.description ?? "" };
    });
}

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  keySuggestions,
  showDescription = true,
  readOnly,
  sensitive,
  emptyHint,
}: KeyValueEditorProps) {
  const [bulk, setBulk] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const listId = React.useId();

  // Always keep one trailing empty row for quick entry
  const display = React.useMemo(() => {
    const last = rows[rows.length - 1];
    if (readOnly || (last && !last.key && !last.value && !last.description)) return rows;
    return [...rows, { ...emptyKV(), id: `__new__${rows.length}` }];
  }, [rows, readOnly]);

  const update = (id: string, patch: Partial<KeyValue>) => {
    if (id.startsWith("__new__")) {
      onChange([...rows, { ...emptyKV(), ...patch }]);
      return;
    }
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const enabledCount = rows.filter((r) => r.enabled && r.key).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {enabledCount > 0 ? `${enabledCount} active` : emptyHint ?? "No entries"}
        </span>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!bulk) setBulkText(toBulk(rows));
              else onChange(fromBulk(bulkText, rows));
              setBulk(!bulk);
            }}
          >
            {bulk ? <ListPlus /> : <Text />}
            {bulk ? "Key-value edit" : "Bulk edit"}
          </Button>
        )}
      </div>

      {bulk ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            onBlur={() => onChange(fromBulk(bulkText, rows))}
            spellCheck={false}
            aria-label="Bulk edit entries"
            className="min-h-40 w-full rounded-md border border-input bg-transparent p-2.5 font-mono text-xs leading-5 focus-visible:border-ring focus-visible:outline-none"
            placeholder={"Content-Type: application/json\n// Disabled-Header: value"}
          />
          <p className="text-[11px] text-muted-foreground">One entry per line as <code className="font-mono">key: value</code>. Prefix with <code className="font-mono">//</code> to disable.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div
            className={cn(
              "grid items-center border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground",
              showDescription ? "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_32px]" : "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.5fr)_32px]",
            )}
          >
            <span />
            <span className="px-2 py-1.5">{keyPlaceholder}</span>
            <span className="border-l border-border px-2 py-1.5">{valuePlaceholder}</span>
            {showDescription && <span className="hidden border-l border-border px-2 py-1.5 sm:block">Description</span>}
            <span />
          </div>
          {keySuggestions && (
            <datalist id={listId}>
              {keySuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          {display.map((row) => {
            const isNew = row.id.startsWith("__new__");
            const masked = sensitive?.(row.key) && !revealed[row.id];
            return (
              <div
                key={row.id}
                className={cn(
                  "group grid items-center border-b border-border last:border-b-0",
                  showDescription ? "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_32px]" : "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.5fr)_32px]",
                  !row.enabled && !isNew && "opacity-55",
                )}
              >
                <div className="flex justify-center">
                  {!isNew && (
                    <Checkbox
                      checked={row.enabled}
                      disabled={readOnly}
                      onCheckedChange={(v) => update(row.id, { enabled: v === true })}
                      aria-label={`Enable ${row.key || "row"}`}
                    />
                  )}
                </div>
                <input
                  value={row.key}
                  list={keySuggestions ? listId : undefined}
                  readOnly={readOnly}
                  onChange={(e) => update(row.id, { key: e.target.value })}
                  placeholder={isNew ? `Add ${keyPlaceholder.toLowerCase()}` : keyPlaceholder}
                  aria-label={keyPlaceholder}
                  spellCheck={false}
                  className="h-8 min-w-0 bg-transparent px-2 font-mono text-xs placeholder:font-sans placeholder:text-muted-foreground/60 focus:bg-accent/40 focus:outline-none"
                />
                <div className="relative flex min-w-0 items-center border-l border-border">
                  <VariableInput
                    value={row.value}
                    readOnly={readOnly}
                    masked={masked}
                    onChange={(v) => update(row.id, { value: v })}
                    placeholder={valuePlaceholder}
                    ariaLabel={`${valuePlaceholder} for ${row.key || "new row"}`}
                    className="h-8 border-0 bg-transparent px-2 text-xs focus-within:bg-accent/40"
                  />
                  {sensitive?.(row.key) && row.value && (
                    <button
                      type="button"
                      onClick={() => setRevealed((s) => ({ ...s, [row.id]: !s[row.id] }))}
                      className="mr-1 rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label={masked ? "Show value" : "Hide value"}
                    >
                      {masked ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                  )}
                </div>
                {showDescription && (
                  <input
                    value={row.description ?? ""}
                    readOnly={readOnly}
                    onChange={(e) => update(row.id, { description: e.target.value })}
                    placeholder="Description"
                    aria-label="Description"
                    className="hidden h-8 min-w-0 border-l border-border bg-transparent px-2 text-xs placeholder:text-muted-foreground/60 focus:bg-accent/40 focus:outline-none sm:block"
                  />
                )}
                <div className="flex justify-center">
                  {!isNew && !readOnly && (
                    <Tooltip content="Remove">
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Remove ${row.key || "row"}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
