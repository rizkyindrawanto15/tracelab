"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssertionResult, ExecutedResponse, HistoryEntry, RequestConfig, RequestError, SavedRequest } from "../types";
import { createRequestConfig, normalizeRequestConfig } from "../defaults";
import { deepClone, uid } from "../utils";
import { REDACTED } from "../security";

export interface RequestTab {
  id: string;
  requestId: string | null;
  name: string;
  config: RequestConfig;
  /** JSON of the config as last saved — used to compute the dirty flag. */
  savedJson: string | null;
}

export const EMPTY_TABS: RequestTab[] = [];

interface WorkspaceTabs {
  tabs: RequestTab[];
  activeId: string | null;
}

interface TabsState {
  byWorkspace: Record<string, WorkspaceTabs>;
  openNew: (ws: string, config?: Partial<RequestConfig>, name?: string) => string;
  openSaved: (ws: string, req: SavedRequest) => string;
  openFromHistory: (ws: string, entry: HistoryEntry) => string;
  close: (ws: string, id: string) => void;
  closeOthers: (ws: string, id: string) => void;
  closeAll: (ws: string) => void;
  setActive: (ws: string, id: string) => void;
  updateConfig: (ws: string, id: string, updater: (c: RequestConfig) => RequestConfig) => void;
  markSaved: (ws: string, id: string, req: SavedRequest) => void;
  /** Keep open tabs consistent when saved requests change elsewhere. */
  syncSaved: (ws: string, req: SavedRequest) => void;
  detachDeleted: (ws: string, requestIds: string[]) => void;
  duplicateTab: (ws: string, id: string) => string | null;
}

const empty: WorkspaceTabs = { tabs: [], activeId: null };

export function isTabDirty(tab: RequestTab): boolean {
  // Unsaved tabs count as dirty once they have any content.
  if (tab.savedJson === null) return tab.config.url.trim() !== "";
  return JSON.stringify(tab.config) !== tab.savedJson;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => {
      const mutate = (ws: string, fn: (w: WorkspaceTabs) => WorkspaceTabs) =>
        set((s) => ({ byWorkspace: { ...s.byWorkspace, [ws]: fn(s.byWorkspace[ws] ?? empty) } }));

      return {
        byWorkspace: {},
        openNew: (ws, config, name = "Untitled request") => {
          const tab: RequestTab = { id: uid(), requestId: null, name, config: createRequestConfig(config), savedJson: null };
          mutate(ws, (w) => ({ tabs: [...w.tabs, tab], activeId: tab.id }));
          return tab.id;
        },
        openSaved: (ws, req) => {
          const existing = (get().byWorkspace[ws] ?? empty).tabs.find((t) => t.requestId === req.id);
          if (existing) {
            mutate(ws, (w) => ({ ...w, activeId: existing.id }));
            return existing.id;
          }
          const config = normalizeRequestConfig(deepClone(req.config));
          const tab: RequestTab = { id: uid(), requestId: req.id, name: req.name, config, savedJson: JSON.stringify(config) };
          mutate(ws, (w) => {
            // Replace an untouched empty tab instead of piling up tabs
            const active = w.tabs.find((t) => t.id === w.activeId);
            if (active && active.requestId === null && !active.config.url.trim()) {
              return { tabs: w.tabs.map((t) => (t.id === active.id ? tab : t)), activeId: tab.id };
            }
            return { tabs: [...w.tabs, tab], activeId: tab.id };
          });
          return tab.id;
        },
        openFromHistory: (ws, entry) => {
          const config = normalizeRequestConfig(deepClone(entry.config));
          // Never re-send redacted placeholders as real credentials
          if (config.auth.bearer?.token === REDACTED) config.auth.bearer.token = "";
          if (config.auth.basic?.password === REDACTED) config.auth.basic.password = "";
          if (config.auth.apikey?.value === REDACTED) config.auth.apikey.value = "";
          config.headers = config.headers.map((h) => (h.value === REDACTED ? { ...h, value: "" } : h));
          const tab: RequestTab = {
            id: uid(),
            requestId: null,
            name: entry.request_name ? `${entry.request_name} (history)` : "History request",
            config,
            savedJson: null,
          };
          mutate(ws, (w) => ({ tabs: [...w.tabs, tab], activeId: tab.id }));
          return tab.id;
        },
        close: (ws, id) =>
          mutate(ws, (w) => {
            const idx = w.tabs.findIndex((t) => t.id === id);
            const tabs = w.tabs.filter((t) => t.id !== id);
            let activeId = w.activeId;
            if (w.activeId === id) activeId = tabs[Math.min(idx, tabs.length - 1)]?.id ?? null;
            return { tabs, activeId };
          }),
        closeOthers: (ws, id) => mutate(ws, (w) => ({ tabs: w.tabs.filter((t) => t.id === id), activeId: id })),
        closeAll: (ws) => mutate(ws, () => ({ tabs: [], activeId: null })),
        setActive: (ws, id) => mutate(ws, (w) => ({ ...w, activeId: id })),
        updateConfig: (ws, id, updater) =>
          mutate(ws, (w) => ({ ...w, tabs: w.tabs.map((t) => (t.id === id ? { ...t, config: updater(t.config) } : t)) })),
        markSaved: (ws, id, req) =>
          mutate(ws, (w) => ({
            ...w,
            tabs: w.tabs.map((t) =>
              t.id === id ? { ...t, requestId: req.id, name: req.name, config: normalizeRequestConfig(req.config), savedJson: JSON.stringify(normalizeRequestConfig(req.config)) } : t,
            ),
          })),
        syncSaved: (ws, req) =>
          mutate(ws, (w) => ({
            ...w,
            tabs: w.tabs.map((t) => {
              if (t.requestId !== req.id) return t;
              const dirty = isTabDirty(t);
              const config = normalizeRequestConfig(req.config);
              return dirty ? { ...t, name: req.name } : { ...t, name: req.name, config, savedJson: JSON.stringify(config) };
            }),
          })),
        detachDeleted: (ws, ids) =>
          mutate(ws, (w) => ({
            ...w,
            tabs: w.tabs.map((t) => (t.requestId && ids.includes(t.requestId) ? { ...t, requestId: null, savedJson: null } : t)),
          })),
        duplicateTab: (ws, id) => {
          const t = (get().byWorkspace[ws] ?? empty).tabs.find((x) => x.id === id);
          if (!t) return null;
          const copy: RequestTab = { id: uid(), requestId: null, name: `${t.name} copy`, config: deepClone(t.config), savedJson: null };
          mutate(ws, (w) => ({ tabs: [...w.tabs, copy], activeId: copy.id }));
          return copy.id;
        },
      };
    },
    { name: "tracelab.tabs", version: 1 },
  ),
);

// ─── Non-persisted runtime state: responses, in-flight controllers, files ───

export interface TabRuntime {
  status: "idle" | "loading" | "done" | "error";
  response?: ExecutedResponse;
  error?: RequestError;
  results?: AssertionResult[];
  startedAt?: number;
}

interface RuntimeState {
  byTab: Record<string, TabRuntime>;
  controllers: Record<string, AbortController>;
  files: Record<string, File>;
  set: (tabId: string, rt: TabRuntime) => void;
  setController: (tabId: string, c: AbortController | null) => void;
  cancel: (tabId: string) => void;
  setFile: (fieldId: string, file: File | null) => void;
  clear: (tabId: string) => void;
}

export const useRuntimeStore = create<RuntimeState>()((set, get) => ({
  byTab: {},
  controllers: {},
  files: {},
  set: (tabId, rt) =>
    set((s) => {
      const prev = s.byTab[tabId]?.response?.blobUrl;
      if (prev && prev !== rt.response?.blobUrl) URL.revokeObjectURL(prev);
      return { byTab: { ...s.byTab, [tabId]: rt } };
    }),
  setController: (tabId, c) =>
    set((s) => {
      const controllers = { ...s.controllers };
      if (c) controllers[tabId] = c;
      else delete controllers[tabId];
      return { controllers };
    }),
  cancel: (tabId) => get().controllers[tabId]?.abort(),
  setFile: (fieldId, file) =>
    set((s) => {
      const files = { ...s.files };
      if (file) files[fieldId] = file;
      else delete files[fieldId];
      return { files };
    }),
  clear: (tabId) =>
    set((s) => {
      const byTab = { ...s.byTab };
      const url = byTab[tabId]?.response?.blobUrl;
      if (url) URL.revokeObjectURL(url);
      delete byTab[tabId];
      return { byTab };
    }),
}));
