"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { CODE_LANGUAGES, type CodeLanguage, generateCode } from "@/lib/codegen";
import { type RequestConfig } from "@/lib/types";
import { prepareRequest } from "@/lib/prepare";
import { copyToClipboard } from "@/lib/utils";
import { resolveNonSecret } from "@/lib/variables";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/select-tabs";
import { CodeEditor } from "@/components/editor/code-editor";
import { useVariables } from "@/components/request/variable-input";
import { toast } from "sonner";

interface CodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RequestConfig;
}

export function CodeModal({ open, onOpenChange, config }: CodeModalProps) {
  const [lang, setLang] = React.useState<CodeLanguage>("curl");
  const [copied, setCopied] = React.useState(false);
  const vars = useVariables();

  const code = React.useMemo(() => {
    try {
      // Resolve variables but keep secrets as placeholders like {{api_token}}
      const prepared = prepareRequest(config, (s) => resolveNonSecret(s, vars));
      return generateCode(lang, prepared);
    } catch (err) {
      return `// Could not generate code:\n// ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [config, lang, vars]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      toast.success("Code snippet copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const monacoLang = CODE_LANGUAGES.find((l) => l.id === lang)?.monaco ?? "shell";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-panel">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle>Generate Code Snippet</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Export this request into your codebase. Secrets are kept as variable placeholders.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-border bg-panel-2 px-4 py-2">
          <Segmented<CodeLanguage>
            value={lang}
            onChange={setLang}
            options={CODE_LANGUAGES.map((l) => ({ value: l.id, label: l.label }))}
          />

          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
        </div>

        <div className="h-80 w-full bg-background">
          <CodeEditor value={code} language={monacoLang} readOnly className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
