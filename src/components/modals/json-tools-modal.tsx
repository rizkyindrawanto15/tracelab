"use client";

import * as React from "react";
import { AlertCircle, Check, CheckCircle2, Copy, Minimize2, Trash2, Wand2 } from "lucide-react";
import { tryParseJson } from "@/lib/json-path";
import { copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CodeEditor } from "@/components/editor/code-editor";
import { toast } from "sonner";

interface JsonToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJson?: string;
}

export function JsonToolsModal({ open, onOpenChange, initialJson = "" }: JsonToolsModalProps) {
  const [content, setContent] = React.useState(initialJson || "{\n  \"example\": \"Paste your JSON here to format, minify, or validate\"\n}");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open && initialJson) {
      setContent(initialJson);
    }
  }, [open, initialJson]);

  const validation = React.useMemo(() => {
    if (!content.trim()) return null;
    return tryParseJson(content);
  }, [content]);

  const handleFormat = () => {
    const res = tryParseJson(content);
    if (!res.ok) {
      toast.error(`Invalid JSON: ${res.error}`);
      return;
    }
    setContent(JSON.stringify(res.value, null, 2));
    toast.success("Formatted JSON");
  };

  const handleMinify = () => {
    const res = tryParseJson(content);
    if (!res.ok) {
      toast.error(`Invalid JSON: ${res.error}`);
      return;
    }
    setContent(JSON.stringify(res.value));
    toast.success("Minified JSON");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      toast.success("JSON copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-panel">
          <DialogTitle>JSON Utilities</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            Validate syntax, inspect parsing errors with exact line/column locations, and reformat payloads.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel-2 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleFormat} disabled={!validation?.ok} className="gap-1.5">
              <Wand2 className="size-3.5" />
              Format
            </Button>
            <Button size="sm" variant="outline" onClick={handleMinify} disabled={!validation?.ok} className="gap-1.5">
              <Minimize2 className="size-3.5" />
              Minify
            </Button>
            <Button size="sm" variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {validation ? (
              validation.ok ? (
                <span className="flex items-center gap-1 font-mono text-xs text-success font-medium">
                  <CheckCircle2 className="size-3.5" /> Valid JSON
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-xs text-destructive font-medium">
                  <AlertCircle className="size-3.5" />
                  Invalid JSON {validation.line ? `(line ${validation.line}, col ${validation.column})` : ""}
                </span>
              )
            ) : null}

            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="h-96 w-full bg-background">
          <CodeEditor value={content} onChange={setContent} language="json" className="h-full" />
        </div>

        {/* Error panel footer if invalid */}
        {validation && !validation.ok && (
          <div className="border-t border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-mono">
            <span className="font-bold">Error: </span> {validation.error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
