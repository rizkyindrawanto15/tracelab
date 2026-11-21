/**
 * Returns `next` only when it is a safe, same-origin relative path
 * (starts with a single "/" — never "//" or "/\" which browsers treat as
 * protocol-relative URLs). Falls back to `fallback` otherwise.
 */
export function sanitizeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || typeof next !== "string") return fallback;
  const value = next.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject control characters and backslashes anywhere (some browsers normalise "\" to "/").
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const base = "http://tracelab.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
