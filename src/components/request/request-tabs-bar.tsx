"use client";

import * as React from "react";
import { Plus, X, Copy } from "lucide-react";
import { useTabsStore, isTabDirty, EMPTY_TABS, type RequestTab } from "@/lib/state/tabs-store";
import { useWorkspaceId } from "@/lib/data/hooks";
import { MethodBadge } from "@/components/brand";
import { cn } from "@/lib/utils";

export function RequestTabsBar() {
  const ws = useWorkspaceId();
  const tabs = useTabsStore((s) => (ws ? s.byWorkspace[ws]?.tabs ?? EMPTY_TABS : EMPTY_TABS));
  const activeId = useTabsStore((s) => (ws ? s.byWorkspace[ws]?.activeId ?? null : null));

  const openNew = useTabsStore((s) => s.openNew);
  const setActive = useTabsStore((s) => s.setActive);
  const close = useTabsStore((s) => s.close);
  const duplicateTab = useTabsStore((s) => s.duplicateTab);

  if (!ws) return null;

  return (
    <div className="flex h-9 items-stretch border-b border-border bg-panel overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const dirty = isTabDirty(tab);

        return (
          <div
            key={tab.id}
            onClick={() => setActive(ws, tab.id)}
            className={cn(
              "group relative flex max-w-[200px] shrink-0 items-center gap-2 border-r border-border px-3 text-xs cursor-pointer select-none transition-colors",
              isActive
                ? "bg-background text-foreground font-medium border-t-2 border-t-primary"
                : "bg-panel text-muted-foreground hover:bg-panel-2 hover:text-foreground",
            )}
          >
            <MethodBadge method={tab.config.method} short />
            <span className="truncate">{tab.name}</span>

            {dirty && <span className="size-1.5 shrink-0 rounded-full bg-warning" title="Unsaved changes" />}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close(ws, tab.id);
              }}
              className="ml-auto rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
              aria-label="Close tab"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={() => openNew(ws)}
        className="flex h-full w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground border-r border-border transition-colors shrink-0"
        title="New Request (⌘N)"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
