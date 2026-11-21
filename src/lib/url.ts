import type { KeyValue } from "./types";
import { uid } from "./utils";

/**
 * Two-way sync between the URL query string and the Params table.
 * We intentionally work on raw strings (no decoding) so that {{variables}}
 * and user formatting survive round-trips untouched.
 */
export function splitUrl(url: string): { base: string; query: string; hash: string } {
  let rest = url;
  let hash = "";
  const hashIdx = rest.indexOf("#");
  if (hashIdx >= 0) {
    hash = rest.slice(hashIdx);
    rest = rest.slice(0, hashIdx);
  }
  const qIdx = rest.indexOf("?");
  if (qIdx < 0) return { base: rest, query: "", hash };
  return { base: rest.slice(0, qIdx), query: rest.slice(qIdx + 1), hash };
}

export function parseQuery(query: string): { key: string; value: string }[] {
  if (!query) return [];
  return query
    .split("&")
    .filter((part) => part.length > 0)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq < 0) return { key: part, value: "" };
      return { key: part.slice(0, eq), value: part.slice(eq + 1) };
    });
}

export function buildQuery(params: KeyValue[]): string {
  return params
    .filter((p) => p.enabled && (p.key !== "" || p.value !== ""))
    .map((p) => (p.value === "" && !p.key.includes("=") ? `${p.key}=` : `${p.key}=${p.value}`))
    .join("&");
}

/** URL changed → recompute params, preserving disabled rows and descriptions. */
export function paramsFromUrl(url: string, previous: KeyValue[]): KeyValue[] {
  const { query } = splitUrl(url);
  const parsed = parseQuery(query);
  const enabledPrev = previous.filter((p) => p.enabled);
  const disabled = previous.filter((p) => !p.enabled);
  const next: KeyValue[] = parsed.map((p, i) => {
    const prev = enabledPrev[i];
    return {
      id: prev?.id ?? uid(),
      key: p.key,
      value: p.value,
      enabled: true,
      description: prev && prev.key === p.key ? prev.description : prev?.description ?? "",
    };
  });
  return [...next, ...disabled];
}

/** Params changed → rebuild the URL query string. */
export function urlWithParams(url: string, params: KeyValue[]): string {
  const { base, hash } = splitUrl(url);
  const q = buildQuery(params);
  return `${base}${q ? `?${q}` : ""}${hash}`;
}

/** Add a protocol if missing so `api.example.com/users` works like in Postman. */
export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(trimmed)) return `http://${trimmed}`;
  return `https://${trimmed}`;
}
