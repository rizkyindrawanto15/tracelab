"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { VARIABLE_PATTERN, resolveForDisplay, type VariableMap } from "@/lib/variables";

export const VariablesContext = React.createContext<VariableMap>({});

export function useVariables() {
  return React.useContext(VariablesContext);
}

/** Renders the value with {{variables}} highlighted (green = defined, red = undefined). */
export function HighlightedText({ value, vars }: { value: string; vars: VariableMap }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of value.matchAll(VARIABLE_PATTERN)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(value.slice(last, idx));
    const defined = m[1] in vars;
    parts.push(
      <span key={idx} className={cn("rounded-[3px]", defined ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>
        {m[0]}
      </span>,
    );
    last = idx + m[0].length;
  }
  if (last < value.length) parts.push(value.slice(last));
  return <>{parts}</>;
}

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  masked?: boolean;
  className?: string;
  ariaLabel?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  id?: string;
}

export function VariableInput({ value, onChange, placeholder, readOnly, masked, className, ariaLabel, onKeyDown, onPaste, autoFocus, inputRef, id }: VariableInputProps) {
  const vars = useVariables();
  const localRef = React.useRef<HTMLInputElement>(null);
  const [scroll, setScroll] = React.useState(0);
  const hasVars = !masked && value.includes("{{");

  React.useImperativeHandle(inputRef, () => localRef.current as HTMLInputElement);

  const syncScroll = React.useCallback(() => {
    requestAnimationFrame(() => setScroll(localRef.current?.scrollLeft ?? 0));
  }, []);

  const title = hasVars ? resolveForDisplay(value, vars) : undefined;

  return (
    <div className={cn("flex min-w-0 flex-1 items-center", className)} title={title}>
      <div className="relative h-full min-w-0 flex-1">
        {hasVars && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-mono">
            <span style={{ transform: `translateX(${-scroll}px)` }}>
              <HighlightedText value={value} vars={vars} />
            </span>
          </div>
        )}
        <input
          id={id}
          ref={localRef}
          type={masked ? "password" : "text"}
          value={value}
          readOnly={readOnly}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          aria-label={ariaLabel}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            syncScroll();
          }}
          onScroll={syncScroll}
          onKeyUp={syncScroll}
          onSelect={syncScroll}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(
            "relative h-full w-full min-w-0 bg-transparent font-mono outline-none placeholder:font-sans placeholder:text-muted-foreground/60",
            hasVars && "text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent",
          )}
        />
      </div>
    </div>
  );
}
