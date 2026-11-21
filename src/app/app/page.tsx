"use client";

import * as React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { DataProvider } from "@/components/app/data-provider";
import { useActiveWorkspace, useWorkspaceId } from "@/lib/data/hooks";
import { useAppStore } from "@/lib/state/app-store";
import { useTabsStore, useRuntimeStore, EMPTY_TABS } from "@/lib/state/tabs-store";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { AppTopbar } from "@/components/topbar/app-topbar";
import { RequestTabsBar } from "@/components/request/request-tabs-bar";
import { RequestPanel } from "@/components/request/request-panel";
import { ResponseViewer } from "@/components/response/response-viewer";
import { CodeModal } from "@/components/modals/code-modal";
import { SaveRequestModal } from "@/components/modals/save-request-modal";
import { JsonToolsModal } from "@/components/modals/json-tools-modal";
import { EnvironmentModal } from "@/components/modals/environment-modal";
import { CommandPalette } from "@/components/modals/command-palette";
import { ApiDocsView } from "@/components/docs/api-docs-view";
import { VariablesContext } from "@/components/request/variable-input";
import { useVariableMap } from "@/lib/data/hooks";

function WorkspaceApp() {
  const ws = useWorkspaceId();
  const { workspace, isLoading } = useActiveWorkspace();
  const vars = useVariableMap();

  const tabs = useTabsStore((s) => (ws ? s.byWorkspace[ws]?.tabs ?? EMPTY_TABS : EMPTY_TABS));
  const activeId = useTabsStore((s) => (ws ? s.byWorkspace[ws]?.activeId ?? null : null));
  const openNew = useTabsStore((s) => s.openNew);
  const markSaved = useTabsStore((s) => s.markSaved);
  const updateConfig = useTabsStore((s) => s.updateConfig);

  const runtime = useRuntimeStore((s) => (activeId ? s.byTab[activeId] : undefined));
  const cancel = useRuntimeStore((s) => s.cancel);

  // Modals state
  const [codeModalOpen, setCodeModalOpen] = React.useState(false);
  const [saveModalOpen, setSaveModalOpen] = React.useState(false);
  const [jsonToolsOpen, setJsonToolsOpen] = React.useState(false);
  const [envModalOpen, setEnvModalOpen] = React.useState(false);
  const [showingDocs, setShowingDocs] = React.useState(false);

  // Responsive layout state
  const [mounted, setMounted] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Ensure at least one tab is open per workspace (guarded against repeat calls)
  const tabCreatedRef = React.useRef<Record<string, boolean>>({});
  React.useEffect(() => {
    if (ws && tabs.length === 0 && !isLoading && !tabCreatedRef.current[ws]) {
      tabCreatedRef.current[ws] = true;
      openNew(ws);
    }
  }, [ws, tabs.length, isLoading, openNew]);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0] ?? null;

  if (!mounted) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center bg-background text-muted-foreground text-xs font-mono">
        Loading TraceLab…
      </div>
    );
  }

  return (
    <VariablesContext.Provider value={vars}>
      <div className="flex h-dvh w-dvw overflow-hidden bg-background font-sans text-foreground">
        {/* Main application panel split: Sidebar | Main Workspace */}
        <PanelGroup direction="horizontal" autoSaveId="tracelab-main-layout">
          {/* Sidebar Panel */}
          <Panel defaultSize={20} minSize={14} maxSize={32} className="min-w-[220px]">
            <AppSidebar
              onOpenEnvModal={() => setEnvModalOpen(true)}
              onOpenJsonTools={() => setJsonToolsOpen(true)}
              onOpenDocs={() => setShowingDocs(true)}
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/60 hover:bg-primary/50 transition-colors" />

          {/* Right Editor & Response Panel */}
          <Panel defaultSize={80} minSize={40} className="flex flex-col h-full overflow-hidden">
            <AppTopbar onOpenEnvModal={() => setEnvModalOpen(true)} />

            {showingDocs ? (
              <ApiDocsView onClose={() => setShowingDocs(false)} />
            ) : (
              <div className="flex flex-1 flex-col h-full overflow-hidden">
                <RequestTabsBar />

                {activeTab ? (
                  <PanelGroup direction={isMobile ? "vertical" : "horizontal"} autoSaveId="tracelab-editor-split" className="flex-1">
                    {/* Left: Request Builder */}
                    <Panel defaultSize={50} minSize={30} className="flex flex-col h-full overflow-hidden">
                      <RequestPanel
                        tab={activeTab}
                        onSaveAs={() => setSaveModalOpen(true)}
                        onShowCode={() => setCodeModalOpen(true)}
                      />
                    </Panel>

                    <PanelResizeHandle className={isMobile ? "h-1 bg-border/60 hover:bg-primary/50 transition-colors" : "w-1 bg-border/60 hover:bg-primary/50 transition-colors"} />

                    {/* Right: Response Inspector */}
                    <Panel defaultSize={50} minSize={30} className="flex flex-col h-full overflow-hidden">
                      <ResponseViewer
                        status={runtime?.status ?? "idle"}
                        response={runtime?.response}
                        error={runtime?.error}
                        results={runtime?.results}
                        onCancel={() => { if (activeId) cancel(activeId); }}
                        onSwitchToProxy={() => {
                          if (ws && activeId) {
                            updateConfig(ws, activeId, (c) => ({
                              ...c,
                              settings: { ...c.settings, transport: "proxy" },
                            }));
                          }
                        }}
                      />
                    </Panel>
                  </PanelGroup>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground text-xs">
                    No request tab open. Click &quot;+&quot; to create a new request.
                  </div>
                )}
              </div>
            )}
          </Panel>
        </PanelGroup>

        {/* Global Modals */}
        {activeTab && (
          <>
            <CodeModal
              open={codeModalOpen}
              onOpenChange={setCodeModalOpen}
              config={activeTab.config}
            />

            <SaveRequestModal
              open={saveModalOpen}
              onOpenChange={setSaveModalOpen}
              config={activeTab.config}
              defaultName={activeTab.name}
              onSaved={(saved) => {
                if (ws) {
                  markSaved(ws, activeTab.id, {
                    id: saved.id,
                    workspace_id: ws,
                    collection_id: saved.collection_id,
                    name: saved.name,
                    description: "",
                    config: saved.config,
                    sort_order: 0,
                    created_at: "",
                    updated_at: "",
                  });
                }
              }}
            />
          </>
        )}

        <JsonToolsModal
          open={jsonToolsOpen}
          onOpenChange={setJsonToolsOpen}
          initialJson={runtime?.response?.bodyText || activeTab?.config.body.json || ""}
        />

        <EnvironmentModal
          open={envModalOpen}
          onOpenChange={setEnvModalOpen}
        />

        <CommandPalette
          onOpenJsonTools={() => setJsonToolsOpen(true)}
          onOpenEnvModal={() => setEnvModalOpen(true)}
          onOpenDocs={() => setShowingDocs(true)}
        />
      </div>
    </VariablesContext.Provider>
  );
}

export default function AppPage() {
  return (
    <DataProvider>
      <WorkspaceApp />
    </DataProvider>
  );
}
