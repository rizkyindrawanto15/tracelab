"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

export function SandboxedPreview({ html }: { html: string }) {
  // Strip any suspicious base tags to avoid base-hijacking
  const safeContent = React.useMemo(() => {
    return html.replace(/<base\b[^>]*>/gi, "");
  }, [html]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-success" />
        <span>Sandboxed preview · scripts and parent access are disabled</span>
      </div>
      <div className="flex-1 bg-white">
        <iframe
          srcDoc={safeContent}
          sandbox=""
          title="Response HTML Preview"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
