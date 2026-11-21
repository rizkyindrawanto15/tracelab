import type { EnvironmentVariable } from "./types";

export const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_.\-]+)\s*\}\}/g;

export type VariableMap = Record<string, { value: string; secret: boolean }>;

export function buildVariableMap(variables: EnvironmentVariable[] | undefined | null): VariableMap {
  const map: VariableMap = {};
  for (const v of variables ?? []) {
    if (!v.enabled || !v.key.trim()) continue;
    map[v.key.trim()] = { value: v.value, secret: v.secret };
  }
  return map;
}

/** Replace {{name}} tokens with values. Unknown variables are left untouched. */
export function resolveVariables(input: string, vars: VariableMap, depth = 0): string {
  if (!input || !input.includes("{{")) return input;
  const out = input.replace(VARIABLE_PATTERN, (match, name: string) => {
    const hit = vars[name];
    return hit !== undefined ? hit.value : match;
  });
  // Allow variables that reference other variables (bounded to avoid cycles)
  if (depth < 3 && out !== input && out.includes("{{")) return resolveVariables(out, vars, depth + 1);
  return out;
}

/** Return variable names referenced in a string. */
export function findVariables(input: string): string[] {
  if (!input) return [];
  const names = new Set<string>();
  for (const m of input.matchAll(VARIABLE_PATTERN)) names.add(m[1]);
  return [...names];
}

export function findUndefinedVariables(inputs: string[], vars: VariableMap): string[] {
  const missing = new Set<string>();
  for (const s of inputs) for (const name of findVariables(s)) if (!(name in vars)) missing.add(name);
  return [...missing];
}

/** Like resolveVariables, but secret values are shown masked. Used for previews. */
export function resolveForDisplay(input: string, vars: VariableMap): string {
  if (!input || !input.includes("{{")) return input;
  return input.replace(VARIABLE_PATTERN, (match, name: string) => {
    const hit = vars[name];
    if (hit === undefined) return match;
    return hit.secret ? "••••••" : hit.value;
  });
}

/** Resolve everything except secret variables, which stay as {{placeholders}}. */
export function resolveNonSecret(input: string, vars: VariableMap): string {
  if (!input || !input.includes("{{")) return input;
  return input.replace(VARIABLE_PATTERN, (match, name: string) => {
    const hit = vars[name];
    if (hit === undefined || hit.secret) return match;
    return hit.value;
  });
}

export function maskSecret(value: string): string {
  if (!value) return "";
  return "•".repeat(Math.min(Math.max(value.length, 6), 24));
}
