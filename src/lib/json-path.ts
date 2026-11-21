/**
 * Minimal, safe JSON path lookup. Supports dot and bracket notation:
 *   data.items[0].id   |   ["weird key"].value   |   $.data.id
 * No evaluation of expressions — just property traversal.
 */
export function parsePath(path: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  let p = path.trim();
  if (p.startsWith("$")) p = p.slice(1);
  if (p.startsWith(".")) p = p.slice(1);
  const re = /([^.[\]]+)|\[(\d+)\]|\[\s*["']([^"']*)["']\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p)) !== null) {
    if (m[1] !== undefined) tokens.push(m[1]);
    else if (m[2] !== undefined) tokens.push(Number(m[2]));
    else if (m[3] !== undefined) tokens.push(m[3]);
  }
  return tokens;
}

export function getByPath(root: unknown, path: string): { found: boolean; value: unknown } {
  const tokens = parsePath(path);
  if (tokens.length === 0) return { found: root !== undefined, value: root };
  let cur: unknown = root;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    if (typeof t === "number") {
      if (!Array.isArray(cur) || t >= cur.length) return { found: false, value: undefined };
      cur = cur[t];
    } else {
      if (typeof cur !== "object") return { found: false, value: undefined };
      if (Array.isArray(cur) && /^\d+$/.test(t)) {
        const idx = Number(t);
        if (idx >= cur.length) return { found: false, value: undefined };
        cur = cur[idx];
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(cur, t)) return { found: false, value: undefined };
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  return { found: true, value: cur };
}

export function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string; line?: number; column?: number } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const pos = /position (\d+)/i.exec(message);
    const lineCol = /line (\d+) column (\d+)/i.exec(message);
    if (lineCol) return { ok: false, error: message, line: Number(lineCol[1]), column: Number(lineCol[2]) };
    if (pos) {
      const idx = Number(pos[1]);
      const before = text.slice(0, idx);
      const line = before.split("\n").length;
      const column = idx - before.lastIndexOf("\n");
      return { ok: false, error: message, line, column };
    }
    return { ok: false, error: message };
  }
}

export function looksLikeJson(contentType: string, body: string): boolean {
  if (/json/i.test(contentType)) return true;
  const t = body.trimStart();
  return (t.startsWith("{") || t.startsWith("[")) && tryParseJson(body).ok;
}
