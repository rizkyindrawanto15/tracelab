"use client";

import * as React from "react";
import { useWorkspaceId, useCanEdit, useRequestMutations } from "@/lib/data/hooks";
import { useTabsStore, useRuntimeStore, isTabDirty, type RequestTab } from "@/lib/state/tabs-store";
import { type RequestConfig } from "@/lib/types";
import { COMMON_HEADERS } from "@/lib/defaults";
import { urlWithParams } from "@/lib/url";
import { isSensitiveHeader } from "@/lib/security";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/select-tabs";
import { UrlBar } from "./url-bar";
import { KeyValueEditor } from "./key-value-editor";
import { AuthEditor } from "./auth-editor";
import { BodyEditor } from "./body-editor";
import { ScriptsEditor, SettingsEditor } from "./scripts-editor";
import { useSendRequest } from "./use-send-request";
import { toast } from "sonner";

interface RequestPanelProps {
  tab: RequestTab;
  onSaveAs: () => void;
  onShowCode: () => void;
}

export function RequestPanel({ tab, onSaveAs, onShowCode }: RequestPanelProps) {
  const ws = useWorkspaceId();
  const canEdit = useCanEdit();
  const updateConfig = useTabsStore((s) => s.updateConfig);
  const markSaved = useTabsStore((s) => s.markSaved);
  const duplicateTab = useTabsStore((s) => s.duplicateTab);

  const runtime = useRuntimeStore((s) => s.byTab[tab.id]);
  const cancel = useRuntimeStore((s) => s.cancel);
  const sendRequest = useSendRequest();
  const reqMutations = useRequestMutations(ws);

  const [activeTab, setActiveTab] = React.useState<"params" | "auth" | "headers" | "body" | "scripts" | "settings">("params");

  const config = tab.config;
  const isDirty = isTabDirty(tab);
  const isLoading = runtime?.status === "loading";

  const handleConfigChange = (updater: (c: RequestConfig) => RequestConfig) => {
    if (!ws) return;
    updateConfig(ws, tab.id, updater);
  };

  const handleSend = React.useCallback(() => {
    sendRequest(tab.id);
  }, [sendRequest, tab.id]);

  const handleCancel = React.useCallback(() => {
    cancel(tab.id);
  }, [cancel, tab.id]);

  const handleSave = React.useCallback(async () => {
    if (!ws || !canEdit) return;
    if (tab.requestId) {
      // Already saved request -> update it directly
      await reqMutations.update.mutateAsync({
        id: tab.requestId,
        patch: { config: tab.config },
      });
      markSaved(ws, tab.id, {
        id: tab.requestId,
        workspace_id: ws,
        collection_id: "",
        name: tab.name,
        description: "",
        config: tab.config,
        sort_order: 0,
        created_at: "",
        updated_at: "",
      });
      toast.success("Request updated");
    } else {
      // New unsaved request -> trigger Save As modal
      onSaveAs();
    }
  }, [ws, canEdit, tab.requestId, tab.name, tab.config, tab.id, reqMutations.update, markSaved, onSaveAs]);

  // Keyboard shortcut listener for Ctrl+Enter / Cmd+Enter and Ctrl+S / Cmd+S
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSave();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        onShowCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab.id, handleSend, handleSave, onShowCode]);

  const enabledHeadersCount = config.headers.filter((h) => h.enabled && h.key).length;
  const enabledParamsCount = config.params.filter((p) => p.enabled && p.key).length;
  const testsCount = config.assertions.filter((a) => a.enabled).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Top URL Bar */}
      <UrlBar
        config={config}
        loading={isLoading}
        dirty={isDirty}
        canSave={canEdit}
        onChange={handleConfigChange}
        onSend={handleSend}
        onCancel={handleCancel}
        onSave={handleSave}
        onSaveAs={onSaveAs}
        onDuplicate={() => { if (ws) duplicateTab(ws, tab.id); }}
        onShowCode={onShowCode}
      />

      {/* Configuration Tabs Header */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex h-full min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-border bg-panel px-3">
          <TabsList className="border-0 bg-transparent">
            <TabsTrigger value="params">
              Params {enabledParamsCount > 0 && <span className="ml-1 text-[10px] text-primary">({enabledParamsCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="auth">
              Authorization {config.auth.type !== "none" && <span className="ml-1 size-1.5 rounded-full bg-primary" />}
            </TabsTrigger>
            <TabsTrigger value="headers">
              Headers {enabledHeadersCount > 0 && <span className="ml-1 text-[10px] text-primary">({enabledHeadersCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="body">
              Body {config.body.type !== "none" && <span className="ml-1 size-1.5 rounded-full bg-primary" />}
            </TabsTrigger>
            <TabsTrigger value="scripts">
              Scripts {testsCount > 0 && <span className="ml-1 text-[10px] text-primary">({testsCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Query Params */}
        <TabsContent value="params" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          <KeyValueEditor
            rows={config.params}
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
            onChange={(params) =>
              handleConfigChange((c) => ({
                ...c,
                params,
                url: urlWithParams(c.url, params),
              }))
            }
          />
        </TabsContent>

        {/* Tab 2: Auth */}
        <TabsContent value="auth" className="h-full min-h-0 flex-1 overflow-auto p-4 m-0">
          <AuthEditor auth={config.auth} onChange={(auth) => handleConfigChange((c) => ({ ...c, auth }))} />
        </TabsContent>

        {/* Tab 3: Headers */}
        <TabsContent value="headers" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          <KeyValueEditor
            rows={config.headers}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            keySuggestions={COMMON_HEADERS}
            sensitive={isSensitiveHeader}
            onChange={(headers) => handleConfigChange((c) => ({ ...c, headers }))}
          />
        </TabsContent>

        {/* Tab 4: Body */}
        <TabsContent value="body" className="h-full min-h-0 flex-1 overflow-auto p-3 m-0">
          <BodyEditor
            body={config.body}
            method={config.method}
            onChange={(body) => handleConfigChange((c) => ({ ...c, body }))}
          />
        </TabsContent>

        {/* Tab 5: Scripts */}
        <TabsContent value="scripts" className="h-full min-h-0 flex-1 overflow-auto p-4 m-0">
          <ScriptsEditor
            assertions={config.assertions}
            extractions={config.extractions}
            onAssertions={(assertions) => handleConfigChange((c) => ({ ...c, assertions }))}
            onExtractions={(extractions) => handleConfigChange((c) => ({ ...c, extractions }))}
          />
        </TabsContent>

        {/* Tab 6: Settings */}
        <TabsContent value="settings" className="h-full min-h-0 flex-1 overflow-auto p-4 m-0">
          <SettingsEditor
            settings={config.settings}
            onChange={(settings) => handleConfigChange((c) => ({ ...c, settings }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
