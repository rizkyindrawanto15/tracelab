"use client";

import * as React from "react";
import { Eye, EyeOff, Plus, Trash2, ShieldCheck, Layers } from "lucide-react";
import { useEnvironments, useEnvironmentMutations, useWorkspaceId } from "@/lib/data/hooks";
import { type Environment, type EnvironmentVariable } from "@/lib/types";
import { newVariable } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/primitives";
import { Checkbox, Tooltip } from "@/components/ui/menus";
import { toast } from "sonner";

interface EnvironmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEnvId?: string | null;
}

export function EnvironmentModal({ open, onOpenChange, selectedEnvId }: EnvironmentModalProps) {
  const ws = useWorkspaceId();
  const { data: environments = [] } = useEnvironments(ws);
  const mutations = useEnvironmentMutations(ws);

  const [activeEnvId, setActiveEnvId] = React.useState<string>("");
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [newEnvName, setNewEnvName] = React.useState("");
  const [showNewInput, setShowNewInput] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (selectedEnvId && environments.some((e) => e.id === selectedEnvId)) {
        setActiveEnvId(selectedEnvId);
      } else if (environments.length > 0 && !activeEnvId) {
        setActiveEnvId(environments[0].id);
      }
    }
  }, [open, selectedEnvId, environments, activeEnvId]);

  const activeEnv = environments.find((e) => e.id === activeEnvId) ?? environments[0] ?? null;

  const handleCreateEnv = async () => {
    if (!newEnvName.trim()) return;
    try {
      const created = await mutations.create.mutateAsync({
        name: newEnvName.trim(),
        variables: [
          newVariable({ key: "base_url", value: "https://api.example.com", secret: false }),
          newVariable({ key: "api_token", value: "", secret: true }),
        ],
      });
      setActiveEnvId(created.id);
      setNewEnvName("");
      setShowNewInput(false);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleUpdateVariable = (id: string, patch: Partial<EnvironmentVariable>) => {
    if (!activeEnv) return;
    const nextVars = activeEnv.variables.map((v) => (v.id === id ? { ...v, ...patch } : v));
    mutations.update.mutate({ id: activeEnv.id, patch: { variables: nextVars } });
  };

  const handleAddVariable = () => {
    if (!activeEnv) return;
    const nextVars = [...activeEnv.variables, newVariable()];
    mutations.update.mutate({ id: activeEnv.id, patch: { variables: nextVars } });
  };

  const handleRemoveVariable = (id: string) => {
    if (!activeEnv) return;
    const nextVars = activeEnv.variables.filter((v) => v.id !== id);
    mutations.update.mutate({ id: activeEnv.id, patch: { variables: nextVars } });
  };

  const handleDeleteEnvironment = async (id: string) => {
    if (environments.length <= 1) {
      toast.error("You must have at least one environment");
      return;
    }
    if (confirm("Delete this environment and all its variables?")) {
      await mutations.remove.mutateAsync(id);
      const remaining = environments.filter((e) => e.id !== id);
      if (remaining.length > 0) setActiveEnvId(remaining[0].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-panel">
          <DialogTitle>Environment Variables</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            Manage scoped variables like <code className="font-mono text-primary font-semibold">{"{{base_url}}"}</code> and <code className="font-mono text-primary font-semibold">{"{{api_token}}"}</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] h-[450px]">
          {/* Environments list on the left */}
          <div className="border-r border-border bg-panel-2 p-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Environments
              </div>
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => setActiveEnvId(env.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-left transition-colors",
                    env.id === activeEnv?.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="truncate">{env.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {env.variables.filter((v) => v.enabled).length}
                  </span>
                </button>
              ))}

              {showNewInput ? (
                <div className="pt-2 space-y-1.5">
                  <Input
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="Env name…"
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateEnv();
                      if (e.key === "Escape") setShowNewInput(false);
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 flex-1 text-[11px]" onClick={handleCreateEnv}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setShowNewInput(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewInput(true)}
                  className="w-full mt-2 h-7 text-xs gap-1 border-dashed"
                >
                  <Plus className="size-3" /> New Environment
                </Button>
              )}
            </div>

            {activeEnv && environments.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteEnvironment(activeEnv.id)}
                className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Delete {activeEnv.name}
              </Button>
            )}
          </div>

          {/* Variables editor on the right */}
          <div className="p-4 flex flex-col h-full overflow-hidden bg-background">
            {activeEnv ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-sm font-semibold">{activeEnv.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Referenced via <code className="font-mono text-primary font-semibold">{"{{variable_name}}"}</code> in URLs, headers, and request bodies.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddVariable} className="gap-1">
                    <Plus className="size-3" /> Add Variable
                  </Button>
                </div>

                <div className="flex-1 overflow-auto py-3 space-y-2">
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="border-b border-border bg-panel-2 text-[11px] font-semibold text-muted-foreground">
                        <tr>
                          <th className="w-8 px-2 py-1.5 text-center"></th>
                          <th className="px-3 py-1.5">Variable Name</th>
                          <th className="border-l border-border px-3 py-1.5">Value</th>
                          <th className="border-l border-border px-3 py-1.5 w-20 text-center">Secret</th>
                          <th className="w-8 px-1 py-1.5 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activeEnv.variables.map((v) => {
                          const isRevealed = revealed[v.id];
                          return (
                            <tr key={v.id} className={cn("hover:bg-accent/20", !v.enabled && "opacity-50")}>
                              <td className="px-2 py-1.5 text-center">
                                <Checkbox
                                  checked={v.enabled}
                                  onCheckedChange={(checked) => handleUpdateVariable(v.id, { enabled: checked === true })}
                                  aria-label="Enable variable"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  value={v.key}
                                  onChange={(e) => handleUpdateVariable(v.id, { key: e.target.value })}
                                  placeholder="VARIABLE_NAME"
                                  className="w-full bg-transparent font-mono text-xs outline-none focus:text-primary font-semibold"
                                />
                              </td>
                              <td className="border-l border-border px-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type={v.secret && !isRevealed ? "password" : "text"}
                                    value={v.value}
                                    onChange={(e) => handleUpdateVariable(v.id, { value: e.target.value })}
                                    placeholder="value"
                                    className="w-full bg-transparent font-mono text-xs outline-none"
                                  />
                                  {v.secret && (
                                    <button
                                      type="button"
                                      onClick={() => setRevealed((s) => ({ ...s, [v.id]: !s[v.id] }))}
                                      className="text-muted-foreground hover:text-foreground"
                                      title={isRevealed ? "Hide secret" : "Reveal secret"}
                                    >
                                      {isRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="border-l border-border px-3 py-1.5 text-center">
                                <Checkbox
                                  checked={v.secret}
                                  onCheckedChange={(checked) => handleUpdateVariable(v.id, { secret: checked === true })}
                                  aria-label="Mark as secret"
                                />
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariable(v.id)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded"
                                  title="Remove variable"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {activeEnv.variables.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No variables defined in this environment yet. Click &quot;Add Variable&quot; to create one.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
