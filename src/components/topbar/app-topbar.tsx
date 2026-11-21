"use client";

import * as React from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Layers,
  Moon,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useActiveEnvironment, useActiveWorkspace, useWorkspaceId } from "@/lib/data/hooks";
import { useAppStore } from "@/lib/state/app-store";
import { isMac } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";

interface AppTopbarProps {
  onOpenEnvModal: () => void;
}

export function AppTopbar({ onOpenEnvModal }: AppTopbarProps) {
  const { workspace } = useActiveWorkspace();
  const { environments, environment, setActive: setEnvironment } = useActiveEnvironment();
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const notifications = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const mod = isMac() ? "⌘" : "Ctrl";
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-panel px-4 select-none">
      {/* Left: Workspace display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {workspace?.name || "TraceLab"}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">/</span>
          <span className="text-xs text-muted-foreground">Workspace</span>
        </div>
      </div>

      {/* Center: Search / Command Palette Bar */}
      <button
        onClick={() => setCommandOpen(true)}
        className="flex h-8 w-64 md:w-80 items-center justify-between rounded-lg border border-input bg-panel-2 px-3 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <Search className="size-3.5" />
          <span>Search or jump to…</span>
        </div>
        <Kbd>{mod} K</Kbd>
      </button>

      {/* Right: Environment Selector, Theme toggle, Notifications */}
      <div className="flex items-center gap-2">
        {/* Environment Picker */}
        <div className="flex items-center">
          <Select
            value={environment?.id || "none"}
            onValueChange={(val) => {
              if (val === "__manage__") {
                onOpenEnvModal();
              } else {
                setEnvironment(val === "none" ? null : val);
              }
            }}
          >
            <SelectTrigger className="h-8 gap-1.5 border-border bg-panel-2 text-xs font-medium">
              <Layers className="size-3.5 text-primary" />
              <SelectValue placeholder="No Environment" />
            </SelectTrigger>
            <SelectContent align="end" className="w-48">
              <SelectItem value="none">No Environment</SelectItem>
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {env.name}
                </SelectItem>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <SelectItem value="__manage__">
                  <span className="text-primary font-medium">Manage Environments…</span>
                </SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          className="text-muted-foreground hover:text-foreground"
        >
          {!mounted ? <span className="size-4" /> : resolvedTheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-2 rounded-full bg-primary ring-2 ring-panel" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border bg-panel p-3">
              <span className="text-xs font-semibold">Notifications</span>
              <div className="flex items-center gap-1.5">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Mark all read
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-md p-2.5 text-xs transition-colors ${
                    n.read ? "bg-transparent text-muted-foreground" : "bg-accent/40 text-foreground font-medium"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {n.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{n.description}</p>
                  )}
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No notifications yet.
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
