"use client";

import * as React from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// Self-hosted Monaco (copied to /public/monaco on install) — no CDN at runtime.
loader.config({ paths: { vs: "/monaco/vs" } });

let themesDefined = false;
type Monaco = Parameters<OnMount>[1];
export type MonacoEditor = Parameters<OnMount>[0];

function defineThemes(monaco: Monaco) {
  if (themesDefined) return;
  themesDefined = true;
  monaco.editor.defineTheme("tracelab-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "a5b4fc" },
      { token: "string.value.json", foreground: "86efac" },
      { token: "number", foreground: "fcd34d" },
      { token: "keyword.json", foreground: "f9a8d4" },
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#0b0b0e",
      "editor.foreground": "#e4e4e7",
      "editorLineNumber.foreground": "#3f3f46",
      "editorLineNumber.activeForeground": "#a1a1aa",
      "editor.lineHighlightBackground": "#ffffff06",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#6366f140",
      "editor.inactiveSelectionBackground": "#6366f122",
      "editorCursor.foreground": "#818cf8",
      "editorIndentGuide.background1": "#1f1f25",
      "editorIndentGuide.activeBackground1": "#3f3f46",
      "editorWidget.background": "#121216",
      "editorWidget.border": "#26262d",
      "editorGutter.background": "#0b0b0e",
      "scrollbarSlider.background": "#ffffff14",
      "scrollbarSlider.hoverBackground": "#ffffff22",
      "focusBorder": "#6366f1",
    },
  });
  monaco.editor.defineTheme("tracelab-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "4338ca" },
      { token: "string.value.json", foreground: "15803d" },
      { token: "number", foreground: "b45309" },
      { token: "keyword.json", foreground: "be185d" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editorLineNumber.foreground": "#c4c4cc",
      "editor.lineHighlightBackground": "#00000005",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#6366f130",
      "focusBorder": "#6366f1",
    },
  });
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  minimal?: boolean;
  wordWrap?: boolean;
  onMount?: (editor: MonacoEditor, monaco: Monaco) => void;
  ariaLabel?: string;
}

export function CodeEditor({ value, onChange, language = "json", readOnly, className, minimal, wordWrap = true, onMount, ariaLabel }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}>
      <Editor
        value={value}
        language={language}
        theme={resolvedTheme === "light" ? "tracelab-light" : "tracelab-dark"}
        beforeMount={defineThemes}
        onMount={(editor, monaco) => onMount?.(editor, monaco)}
        onChange={(v) => onChange?.(v ?? "")}
        loading={
          <div className="flex h-full w-full flex-col gap-2 p-3">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        }
        options={{
          readOnly,
          ariaLabel,
          minimap: { enabled: false },
          fontSize: 12.5,
          lineHeight: 19,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: false,
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? "on" : "off",
          tabSize: 2,
          automaticLayout: true,
          renderLineHighlight: readOnly ? "none" : "line",
          lineNumbers: minimal ? "off" : "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: !minimal,
          padding: { top: 8, bottom: 8 },
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          contextmenu: true,
          domReadOnly: readOnly,
          stickyScroll: { enabled: false },
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
