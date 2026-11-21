import * as React from "react";
import { cn } from "@/lib/utils";

type TokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct" | "text";

interface Token {
  kind: TokenKind;
  value: string;
}

const TOKEN_CLASS: Record<TokenKind, string> = {
  key: "text-method-patch",
  string: "text-method-get",
  number: "text-method-post",
  boolean: "text-method-put",
  null: "text-method-delete",
  punct: "text-muted-foreground",
  text: "",
};

// Order matters: strings (optionally followed by a colon → object key), numbers, literals, punctuation, whitespace, anything else.
const TOKEN_RE = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}[\],:])|(\s+)|([^\s"{}[\],:]+|.)/g;

/** Tiny, safe JSON tokenizer — produces plain tokens rendered as React text nodes (no HTML injection). */
export function tokenizeJsonLine(line: string): Token[] {
  const tokens: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m[0] === "") {
      TOKEN_RE.lastIndex++;
      continue;
    }
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        tokens.push({ kind: "key", value: m[1] });
        tokens.push({ kind: "punct", value: m[2] });
      } else {
        tokens.push({ kind: "string", value: m[1] });
      }
    } else if (m[3] !== undefined) tokens.push({ kind: "number", value: m[3] });
    else if (m[4] !== undefined) tokens.push({ kind: "boolean", value: m[4] });
    else if (m[5] !== undefined) tokens.push({ kind: "null", value: m[5] });
    else if (m[6] !== undefined) tokens.push({ kind: "punct", value: m[6] });
    else tokens.push({ kind: "text", value: m[0] });
  }
  return tokens;
}

const MAX_LINES = 400;

export function JsonHighlight({ code, className, lineNumbers = true }: { code: string; className?: string; lineNumbers?: boolean }) {
  const lines = React.useMemo(() => {
    const all = code.split("\n");
    return { visible: all.slice(0, MAX_LINES), truncated: Math.max(0, all.length - MAX_LINES) };
  }, [code]);

  return (
    <pre className={cn("font-mono text-[12px] leading-[1.6]", className)}>
      <code className="table w-full">
        {lines.visible.map((line, i) => (
          <span key={i} className="table-row">
            {lineNumbers ? (
              <span aria-hidden className="table-cell w-8 select-none pr-3 text-right text-muted-foreground/45">
                {i + 1}
              </span>
            ) : null}
            <span className="table-cell whitespace-pre-wrap break-all">
              {tokenizeJsonLine(line).map((t, j) =>
                t.kind === "text" ? (
                  <React.Fragment key={j}>{t.value}</React.Fragment>
                ) : (
                  <span key={j} className={TOKEN_CLASS[t.kind]}>
                    {t.value}
                  </span>
                ),
              )}
              {line === "" ? "\u00a0" : null}
            </span>
          </span>
        ))}
        {lines.truncated > 0 ? (
          <span className="table-row">
            {lineNumbers ? <span className="table-cell" /> : null}
            <span className="table-cell py-1 text-muted-foreground">… {lines.truncated} more lines</span>
          </span>
        ) : null}
      </code>
    </pre>
  );
}
