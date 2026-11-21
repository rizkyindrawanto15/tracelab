"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "../utils";

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  kind: "success" | "error" | "info";
  created_at: string;
  read: boolean;
}

interface AppState {
  workspaceId: string | null;
  envByWorkspace: Record<string, string | null>;
  sidebarCollapsed: boolean;
  layout: "horizontal" | "vertical";
  defaultTransport: "direct" | "proxy";
  defaultTimeoutMs: number;
  notifications: AppNotification[];
  commandOpen: boolean;
  setWorkspaceId: (id: string | null) => void;
  setEnvironment: (workspaceId: string, envId: string | null) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setLayout: (v: "horizontal" | "vertical") => void;
  setDefaultTransport: (v: "direct" | "proxy") => void;
  setDefaultTimeoutMs: (v: number) => void;
  notify: (n: Omit<AppNotification, "id" | "created_at" | "read">) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setCommandOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      workspaceId: null,
      envByWorkspace: {},
      sidebarCollapsed: false,
      layout: "horizontal",
      defaultTransport: "direct",
      defaultTimeoutMs: 30_000,
      notifications: [],
      commandOpen: false,
      setWorkspaceId: (id) => set((s) => (s.workspaceId === id ? s : { workspaceId: id })),
      setEnvironment: (workspaceId, envId) =>
        set((s) => (s.envByWorkspace[workspaceId] === envId ? s : { envByWorkspace: { ...s.envByWorkspace, [workspaceId]: envId } })),
      setSidebarCollapsed: (v) => set((s) => (s.sidebarCollapsed === v ? s : { sidebarCollapsed: v })),
      setLayout: (v) => set((s) => (s.layout === v ? s : { layout: v })),
      setDefaultTransport: (v) => set((s) => (s.defaultTransport === v ? s : { defaultTransport: v })),
      setDefaultTimeoutMs: (v) => set((s) => (s.defaultTimeoutMs === v ? s : { defaultTimeoutMs: v })),
      notify: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: uid(), created_at: new Date().toISOString(), read: false }, ...s.notifications].slice(0, 50),
        })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      clearNotifications: () => set({ notifications: [] }),
      setCommandOpen: (v) => set((s) => (s.commandOpen === v ? s : { commandOpen: v })),
    }),
    {
      name: "tracelab.app",
      partialize: (s) => ({
        workspaceId: s.workspaceId,
        envByWorkspace: s.envByWorkspace,
        sidebarCollapsed: s.sidebarCollapsed,
        layout: s.layout,
        defaultTransport: s.defaultTransport,
        defaultTimeoutMs: s.defaultTimeoutMs,
        notifications: s.notifications,
      }),
    },
  ),
);
