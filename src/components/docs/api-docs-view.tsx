"use client";

import * as React from "react";
import { BookOpen, Copy, Check, Plus, Trash2, Edit3, Save, ExternalLink } from "lucide-react";
import { useDocs, useDocMutations, useWorkspaceId, useRequests, useCollections } from "@/lib/data/hooks";
import { type ApiDocumentation, type HttpMethod, HTTP_METHODS } from "@/lib/types";
import { MethodBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";
import { CodeEditor } from "@/components/editor/code-editor";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

export function ApiDocsView({ onClose }: { onClose?: () => void }) {
  const ws = useWorkspaceId();
  const { data: docs = [] } = useDocs(ws);
  const { data: requests = [] } = useRequests(ws);
  const mutations = useDocMutations(ws);

  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [method, setMethod] = React.useState<HttpMethod>("GET");
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [exampleReq, setExampleReq] = React.useState("");
  const [exampleRes, setExampleRes] = React.useState("");

  const activeDoc = docs.find((d) => d.id === selectedDocId) ?? docs[0] ?? null;

  React.useEffect(() => {
    if (activeDoc && !editing) {
      setName(activeDoc.name);
      setMethod(activeDoc.method);
      setUrl(activeDoc.url);
      setDescription(activeDoc.description);
      setExampleReq(activeDoc.example_request || "");
      setExampleRes(activeDoc.example_response || "");
    }
  }, [activeDoc, editing]);

  const handleStartCreate = () => {
    setSelectedDocId(null);
    setName("New Endpoint");
    setMethod("GET");
    setUrl("https://api.example.com/v1/resource");
    setDescription("Detailed description of what this endpoint does, authentication requirements, and rate limits.");
    setExampleReq(JSON.stringify({ query: "example" }, null, 2));
    setExampleRes(JSON.stringify({ status: "success", data: [] }, null, 2));
    setEditing(true);
  };

  const handleImportFromRequest = (reqId: string) => {
    const req = requests.find((r) => r.id === reqId);
    if (!req) return;
    setName(req.name);
    setMethod(req.config.method);
    setUrl(req.config.url);
    setDescription(req.description || "Imported from collection request.");
    setExampleReq(req.config.body?.json || "");
    setExampleRes("");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the documentation");
      return;
    }
    try {
      if (activeDoc && selectedDocId) {
        await mutations.update.mutateAsync({
          id: activeDoc.id,
          patch: {
            name,
            method,
            url,
            description,
            example_request: exampleReq,
            example_response: exampleRes,
          },
        });
      } else {
        const created = await mutations.create.mutateAsync({
          name,
          method,
          url,
          description,
          headers: [],
          params: [],
          example_request: exampleReq,
          example_response: exampleRes,
          request_id: null,
        });
        setSelectedDocId(created.id);
      }
      setEditing(false);
    } catch {
      // Handled in mutation hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this documentation entry?")) {
      await mutations.remove.mutateAsync(id);
      setSelectedDocId(null);
      setEditing(false);
    }
  };

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">API Documentation</h2>
          <span className="text-xs text-muted-foreground">({docs.length} endpoints)</span>
        </div>

        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              {activeDoc && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                  <Edit3 className="size-3.5" /> Edit
                </Button>
              )}
              <Button size="sm" onClick={handleStartCreate} className="gap-1.5">
                <Plus className="size-3.5" /> Add Endpoint
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="size-3.5" /> Save Documentation
              </Button>
            </>
          )}

          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="ml-2">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main split: Doc list on left, View/Edit on right */}
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* Left endpoint list */}
        <div className="flex flex-col border-r border-border bg-panel-2 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Endpoints
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setEditing(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors ${
                  doc.id === activeDoc?.id && !editing
                    ? "bg-accent text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <MethodBadge method={doc.method} short />
                <span className="truncate">{doc.name}</span>
              </button>
            ))}

            {docs.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No documented endpoints yet. Click &quot;Add Endpoint&quot; or import from saved requests.
              </div>
            )}
          </div>

          {requests.length > 0 && !editing && (
            <div className="mt-3 border-t border-border pt-3">
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">Import from saved request:</Label>
              <Select onValueChange={handleImportFromRequest}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select a request…" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Right view / editor pane */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {editing ? (
            <div className="max-w-3xl space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="doc-name">Endpoint Title</Label>
                <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. List User Organizations" />
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-url">Endpoint URL</Label>
                  <Input id="doc-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1/..." className="font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-desc">Description</Label>
                <Textarea id="doc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe headers, body properties, authentication requirements..." className="min-h-[100px]" />
              </div>

              <div className="space-y-1.5">
                <Label>Example Request Payload</Label>
                <div className="h-40 rounded-md border border-border overflow-hidden">
                  <CodeEditor value={exampleReq} onChange={setExampleReq} language="json" className="h-full" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Example Response Payload</Label>
                <div className="h-48 rounded-md border border-border overflow-hidden">
                  <CodeEditor value={exampleRes} onChange={setExampleRes} language="json" className="h-full" />
                </div>
              </div>
            </div>
          ) : activeDoc ? (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{activeDoc.name}</h1>
                  <div className="mt-2.5 flex items-center gap-2">
                    <MethodBadge method={activeDoc.method} className="px-2 py-0.5 rounded text-xs" />
                    <code className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                      {activeDoc.url || "No URL specified"}
                    </code>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(activeDoc.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {activeDoc.description && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap rounded-lg border border-border bg-panel-2 p-3.5">
                    {activeDoc.description}
                  </p>
                </div>
              )}

              {activeDoc.example_request && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Request</h3>
                    <button
                      onClick={() => handleCopy(activeDoc.example_request)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="size-3" /> Copy
                    </button>
                  </div>
                  <div className="h-40 rounded-md border border-border overflow-hidden">
                    <CodeEditor value={activeDoc.example_request} language="json" readOnly className="h-full" />
                  </div>
                </div>
              )}

              {activeDoc.example_response && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Response</h3>
                    <button
                      onClick={() => handleCopy(activeDoc.example_response)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="size-3" /> Copy
                    </button>
                  </div>
                  <div className="h-56 rounded-md border border-border overflow-hidden">
                    <CodeEditor value={activeDoc.example_response} language="json" readOnly className="h-full" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <BookOpen className="size-8 text-muted-foreground/60 mb-3" />
              <h3 className="text-sm font-semibold">No Documentation Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Select an endpoint on the left or create a new documentation entry to preview endpoint specifications.
              </p>
              <Button size="sm" onClick={handleStartCreate} className="mt-4 gap-1.5">
                <Plus className="size-3.5" /> Add First Endpoint
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
