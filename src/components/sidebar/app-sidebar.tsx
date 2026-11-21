"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  History,
  Layers,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  Copy,
  Wand2,
  Filter,
} from "lucide-react";
import {
  useActiveWorkspace,
  useCollections,
  useCollectionMutations,
  useHistory,
  useHistoryMutations,
  useRequests,
  useRequestMutations,
  useWorkspaceId,
  useWorkspaces,
  useWorkspaceMutations,
} from "@/lib/data/hooks";
import { useData } from "@/components/app/data-provider";
import { useAppStore } from "@/lib/state/app-store";
import { useTabsStore } from "@/lib/state/tabs-store";
import { type Collection, type HttpMethod, type SavedRequest } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { Logo, MethodBadge, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menus";
import { toast } from "sonner";

interface AppSidebarProps {
  onOpenEnvModal: () => void;
  onOpenJsonTools: () => void;
  onOpenDocs: () => void;
}

export function AppSidebar({ onOpenEnvModal, onOpenJsonTools, onOpenDocs }: AppSidebarProps) {
  const ws = useWorkspaceId();
  const { workspace } = useActiveWorkspace();
  const { data: workspaces = [] } = useWorkspaces();
  const wsMutations = useWorkspaceMutations();
  const setWorkspaceId = useAppStore((s) => s.setWorkspaceId);

  const { user, signOut, mode } = useData();

  const [activeNav, setActiveNav] = React.useState<"collections" | "history">("collections");
  const [search, setSearch] = React.useState("");
  const [historyMethodFilter, setHistoryMethodFilter] = React.useState<string>("ALL");

  // Collections & Requests
  const { data: collections = [] } = useCollections(ws);
  const { data: requests = [] } = useRequests(ws);
  const collectionMutations = useCollectionMutations(ws);
  const requestMutations = useRequestMutations(ws);

  // History
  const { data: history = [] } = useHistory(ws);
  const historyMutations = useHistoryMutations(ws);

  // Tab Store
  const openNew = useTabsStore((s) => s.openNew);
  const openSaved = useTabsStore((s) => s.openSaved);
  const openFromHistory = useTabsStore((s) => s.openFromHistory);

  // Collapsed collections tracking
  const [collapsedCols, setCollapsedCols] = React.useState<Record<string, boolean>>({});

  const toggleCol = (id: string) => {
    setCollapsedCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCollection = async () => {
    const name = prompt("Enter collection name:", "New Collection");
    if (name && name.trim()) {
      await collectionMutations.create.mutateAsync({ name: name.trim() });
    }
  };

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter workspace name:", "New Workspace");
    if (name && name.trim()) {
      await wsMutations.create.mutateAsync(name.trim());
    }
  };

  const handleRenameCollection = async (c: Collection) => {
    const name = prompt("Rename collection:", c.name);
    if (name && name.trim() && name !== c.name) {
      await collectionMutations.update.mutateAsync({ id: c.id, patch: { name: name.trim() } });
    }
  };

  const handleDeleteCollection = async (c: Collection) => {
    if (confirm(`Delete collection "${c.name}" and all its requests?`)) {
      await collectionMutations.remove.mutateAsync(c);
    }
  };

  const handleNewRequestInCol = (colId: string) => {
    if (!ws) return;
    openNew(ws, undefined, "Untitled request");
  };

  const handleClearHistory = async () => {
    if (confirm("Clear all request history?")) {
      await historyMutations.clear.mutateAsync();
    }
  };

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.config.url.toLowerCase().includes(q),
    );
  }, [requests, search]);

  // Filter history
  const filteredHistory = React.useMemo(() => {
    return history.filter((h) => {
      const matchMethod = historyMethodFilter === "ALL" || h.method === historyMethodFilter;
      const matchSearch =
        !search.trim() ||
        h.url.toLowerCase().includes(search.toLowerCase()) ||
        (h.request_name && h.request_name.toLowerCase().includes(search.toLowerCase()));
      return matchMethod && matchSearch;
    });
  }, [history, historyMethodFilter, search]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-panel text-foreground select-none">
      {/* Workspace Selector Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs font-semibold hover:bg-accent/60 max-w-[190px]">
              <Logo compact />
              <span className="truncate">{workspace?.name || "Workspace"}</span>
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </div>
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.id} onSelect={() => setWorkspaceId(w.id)}>
                <span className="truncate">{w.name}</span>
                {w.id === workspace?.id && <span className="ml-auto text-[10px] text-primary">Active</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleCreateWorkspace}>
              <Plus /> Create Workspace…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={() => { if (ws) openNew(ws); }}
          className="h-7 px-2 text-xs gap-1"
          title="New Request (⌘N)"
        >
          <Plus className="size-3.5" />
          <span>New</span>
        </Button>
      </div>

      {/* Main Mode Tabs */}
      <div className="grid grid-cols-2 border-b border-border bg-panel-2 p-1 text-xs font-medium">
        <button
          onClick={() => setActiveNav("collections")}
          className={`flex items-center justify-center gap-1.5 py-1 rounded transition-colors ${
            activeNav === "collections"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Folder className="size-3.5" /> Collections
        </button>
        <button
          onClick={() => setActiveNav("history")}
          className={`flex items-center justify-center gap-1.5 py-1 rounded transition-colors ${
            activeNav === "history"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-3.5" /> History
        </button>
      </div>

      {/* Search Input & Action strip */}
      <div className="border-b border-border p-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeNav === "collections" ? "Filter requests…" : "Search history…"}
            className="h-7 pl-8 text-xs bg-panel-2"
          />
        </div>

        {activeNav === "history" && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Filter className="size-3" />
              <select
                value={historyMethodFilter}
                onChange={(e) => setHistoryMethodFilter(e.target.value)}
                className="bg-transparent text-xs font-mono outline-none"
              >
                <option value="ALL">ALL</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            {history.length > 0 && (
              <button onClick={handleClearHistory} className="hover:text-destructive">
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeNav === "collections" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Collections</span>
              <button
                onClick={handleCreateCollection}
                title="Create Collection"
                className="hover:text-foreground p-0.5"
              >
                <FolderPlus className="size-3.5" />
              </button>
            </div>

            {collections.map((col) => {
              const isCollapsed = collapsedCols[col.id];
              const colRequests = filteredRequests.filter((r) => r.collection_id === col.id);

              return (
                <div key={col.id} className="group/col">
                  {/* Collection header */}
                  <div className="flex items-center justify-between rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground">
                    <button
                      onClick={() => toggleCol(col.id)}
                      className="flex flex-1 items-center gap-1.5 truncate text-left font-medium"
                    >
                      {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      <span className="truncate">{col.name}</span>
                      <span className="text-[10px] opacity-60 font-mono">({colRequests.length})</span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover/col:opacity-100 p-0.5 rounded hover:bg-accent">
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleNewRequestInCol(col.id)}>
                          <Plus /> Add request
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRenameCollection(col)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDeleteCollection(col)} destructive>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Requests inside collection */}
                  {!isCollapsed && (
                    <div className="ml-3 pl-2 border-l border-border/60 space-y-0.5 my-0.5">
                      {colRequests.map((req) => (
                        <div
                          key={req.id}
                          className="group/req flex items-center justify-between rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer"
                          onClick={() => { if (ws) openSaved(ws, req); }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <MethodBadge method={req.config.method} short />
                            <span className="truncate">{req.name}</span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="opacity-0 group-hover/req:opacity-100 p-0.5 rounded hover:bg-accent">
                                <MoreVertical className="size-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => requestMutations.duplicate.mutate(req)}>
                                <Copy /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => requestMutations.remove.mutate(req)} destructive>
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}

                      {colRequests.length === 0 && (
                        <div className="py-1 px-2 text-[11px] text-muted-foreground/60 italic">
                          No requests in this collection
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {collections.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No collections yet. Click &quot;+&quot; to create your first collection.
              </div>
            )}
          </div>
        ) : (
          /* History list */
          <div className="space-y-1">
            {filteredHistory.map((h) => (
              <div
                key={h.id}
                onClick={() => { if (ws) openFromHistory(ws, h); }}
                className="group flex flex-col gap-0.5 rounded-md p-2 text-xs hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <MethodBadge method={h.method} short />
                    <span className="truncate font-medium text-foreground">
                      {h.request_name || h.url}
                    </span>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="truncate max-w-[140px]">{h.url}</span>
                  <span>{formatRelativeTime(h.created_at)}</span>
                </div>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No history entries recorded yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Utilities Footer Navigation */}
      <div className="border-t border-border bg-panel-2 p-2 space-y-1">
        <button
          onClick={onOpenEnvModal}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Layers className="size-3.5 text-primary" />
          <span>Environments</span>
        </button>

        <button
          onClick={onOpenDocs}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <BookOpen className="size-3.5 text-primary" />
          <span>API Documentation</span>
        </button>

        <button
          onClick={onOpenJsonTools}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Wand2 className="size-3.5 text-primary" />
          <span>JSON Utilities</span>
        </button>
      </div>

      {/* User Profile Bar at bottom */}
      <div className="flex h-12 items-center justify-between border-t border-border bg-panel px-3">
        <div className="flex items-center gap-2 truncate">
          <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold truncate leading-tight">{user?.name || "User"}</span>
            <span className="text-[10px] text-muted-foreground font-mono leading-tight">
              {mode === "local" ? "Local Mode" : user?.email || "Signed in"}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          title="Sign Out"
          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
