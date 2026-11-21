"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  Code2,
  FileCode,
  FileText,
  History,
  Layers,
  Moon,
  Plus,
  Search,
  Sun,
  Wand2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useActiveEnvironment, useCollections, useHistory, useRequests, useWorkspaceId, useWorkspaces } from "@/lib/data/hooks";
import { useAppStore } from "@/lib/state/app-store";
import { useTabsStore } from "@/lib/state/tabs-store";
import { MethodBadge } from "@/components/brand";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CommandPaletteProps {
  onOpenJsonTools?: () => void;
  onOpenEnvModal?: () => void;
  onOpenDocs?: () => void;
}

export function CommandPalette({ onOpenJsonTools, onOpenEnvModal, onOpenDocs }: CommandPaletteProps) {
  const ws = useWorkspaceId();
  const open = useAppStore((s) => s.commandOpen);
  const setOpen = useAppStore((s) => s.setCommandOpen);
  const { setTheme, resolvedTheme } = useTheme();

  const { data: workspaces = [] } = useWorkspaces();
  const setWorkspaceId = useAppStore((s) => s.setWorkspaceId);

  const { environments, environment, setActive: setEnvironment } = useActiveEnvironment();
  const { data: requests = [] } = useRequests(ws);
  const { data: collections = [] } = useCollections(ws);
  const { data: history = [] } = useHistory(ws);

  const openNew = useTabsStore((s) => s.openNew);
  const openSaved = useTabsStore((s) => s.openSaved);
  const openFromHistory = useTabsStore((s) => s.openFromHistory);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-border bg-popover shadow-2xl [&>button]:hidden">
        <Command className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-transparent">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Type a command or search requests, history, actions…"
              className="flex h-11 w-full rounded-md bg-transparent py-3 font-sans text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-xs">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Command.Item
                onSelect={() => runCommand(() => { if (ws) openNew(ws); })}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
              >
                <Plus className="size-3.5 text-primary" />
                <span>New Request</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">⌘N</span>
              </Command.Item>

              {onOpenJsonTools && (
                <Command.Item
                  onSelect={() => runCommand(onOpenJsonTools)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                >
                  <Wand2 className="size-3.5 text-primary" />
                  <span>JSON Utilities (Format, Minify, Validate)</span>
                </Command.Item>
              )}

              {onOpenEnvModal && (
                <Command.Item
                  onSelect={() => runCommand(onOpenEnvModal)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                >
                  <Layers className="size-3.5 text-primary" />
                  <span>Manage Environment Variables</span>
                </Command.Item>
              )}

              {onOpenDocs && (
                <Command.Item
                  onSelect={() => runCommand(onOpenDocs)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                >
                  <FileText className="size-3.5 text-primary" />
                  <span>Open API Documentation</span>
                </Command.Item>
              )}

              <Command.Item
                onSelect={() => runCommand(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
              >
                {resolvedTheme === "dark" ? <Sun className="size-3.5 text-primary" /> : <Moon className="size-3.5 text-primary" />}
                <span>Toggle Theme ({resolvedTheme === "dark" ? "Light" : "Dark"})</span>
              </Command.Item>
            </Command.Group>

            {/* Environments */}
            {environments.length > 0 && (
              <Command.Group heading="Environments" className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {environments.map((env) => (
                  <Command.Item
                    key={env.id}
                    onSelect={() => runCommand(() => setEnvironment(env.id))}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                  >
                    <Layers className="size-3.5 text-muted-foreground" />
                    <span>Switch to {env.name}</span>
                    {env.id === environment?.id && (
                      <span className="ml-auto text-[10px] text-primary font-medium">Active</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Saved Requests */}
            {requests.length > 0 && (
              <Command.Group heading="Saved Requests" className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {requests.map((r) => {
                  const col = collections.find((c) => c.id === r.collection_id);
                  return (
                    <Command.Item
                      key={r.id}
                      onSelect={() => runCommand(() => { if (ws) openSaved(ws, r); })}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                    >
                      <MethodBadge method={r.config.method} short />
                      <span className="font-medium truncate">{r.name}</span>
                      <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{r.config.url}</span>
                      {col && (
                        <span className="ml-auto text-[10px] text-muted-foreground rounded bg-muted/60 px-1 py-0.5">{col.name}</span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Recent History */}
            {history.length > 0 && (
              <Command.Group heading="Recent History" className="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {history.slice(0, 10).map((h) => (
                  <Command.Item
                    key={h.id}
                    onSelect={() => runCommand(() => { if (ws) openFromHistory(ws, h); })}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-accent aria-selected:bg-accent"
                  >
                    <History className="size-3 text-muted-foreground" />
                    <MethodBadge method={h.method} short />
                    <span className="font-mono text-xs truncate max-w-sm">{h.url}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{h.status || "ERR"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
