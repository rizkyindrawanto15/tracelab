"use client";

import type { ExecutedResponse, RequestError } from "../types";
import { MAX_RESPONSE_BODY_BYTES } from "../defaults";
import { FORBIDDEN_BROWSER_HEADERS, type PreparedRequest } from "../prepare";
import { parseSetCookie } from "../security";

export class RequestExecutionError extends Error {
  constructor(public readonly detail: RequestError) {
    super(detail.message);
  }
}

export interface ExecuteOptions {
  signal: AbortSignal;
  timeoutMs: number;
  transport: "direct" | "proxy";
  followRedirects: boolean;
}

const TEXTUAL = /^(text\/|application\/(json|xml|javascript|ecmascript|x-www-form-urlencoded|graphql|problem\+json|ld\+json|hal\+json|vnd\.[^;]*\+(json|xml)|[^;]*\+json|[^;]*\+xml|x-ndjson|yaml|x-yaml|toml|csv)|image\/svg\+xml)/i;
const PREVIEWABLE_IMAGE = /^image\/(png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)/i;

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".localhost");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function readLimited(response: Response): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!response.body) return { bytes: new Uint8Array(0), truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > MAX_RESPONSE_BODY_BYTES) {
      chunks.push(value.subarray(0, MAX_RESPONSE_BODY_BYTES - total));
      total = MAX_RESPONSE_BODY_BYTES;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { bytes, truncated };
}

function decodeBody(bytes: Uint8Array, contentType: string) {
  const ct = contentType.toLowerCase();
  if (PREVIEWABLE_IMAGE.test(ct)) {
    const blob = new Blob([bytes as BlobPart], { type: ct.split(";")[0] });
    return { bodyText: "", blobUrl: URL.createObjectURL(blob), isBinary: true };
  }
  const textual = !ct || TEXTUAL.test(ct);
  if (!textual) {
    // Sniff: treat as text when there are no NUL bytes in the first 1KB
    const sample = bytes.subarray(0, 1024);
    if (sample.includes(0)) {
      const blob = new Blob([bytes as BlobPart], { type: ct.split(";")[0] || "application/octet-stream" });
      return { bodyText: "", blobUrl: URL.createObjectURL(blob), isBinary: true };
    }
  }
  const charset = /charset=([^;]+)/i.exec(ct)?.[1]?.trim() ?? "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  return { bodyText: decoder.decode(bytes), isBinary: false as const };
}

function linkSignals(user: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (user.aborted) controller.abort();
  else user.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      user.removeEventListener("abort", onAbort);
    },
  };
}

function abortError(timedOut: boolean, timeoutMs: number): RequestExecutionError {
  if (timedOut) {
    return new RequestExecutionError({
      kind: "timeout",
      title: "Request timed out",
      message: `No complete response was received within ${timeoutMs / 1000}s.`,
      hint: "Increase the timeout in the request Settings tab, or check that the server is responding.",
    });
  }
  return new RequestExecutionError({ kind: "aborted", title: "Request cancelled", message: "The request was cancelled before it completed." });
}

export async function executeRequest(prepared: PreparedRequest, opts: ExecuteOptions): Promise<ExecutedResponse> {
  return opts.transport === "proxy" ? executeViaProxy(prepared, opts) : executeDirect(prepared, opts);
}

async function executeDirect(prepared: PreparedRequest, opts: ExecuteOptions): Promise<ExecutedResponse> {
  const target = new URL(prepared.url);
  const warnings = [...prepared.warnings];

  if (typeof window !== "undefined" && window.location.protocol === "https:" && target.protocol === "http:" && !isLocalHost(target.hostname)) {
    throw new RequestExecutionError({
      kind: "mixed_content",
      title: "Blocked: insecure request from a secure page",
      message: `Browsers block http:// requests from https:// pages (mixed content).`,
      hint: "Use an https:// URL, or switch the transport to the TraceLab proxy in the request Settings tab.",
    });
  }

  const headers = new Headers();
  for (const [k, v] of prepared.headers) {
    if (FORBIDDEN_BROWSER_HEADERS.has(k.toLowerCase()) || k.toLowerCase().startsWith("sec-") || k.toLowerCase().startsWith("proxy-")) {
      warnings.push(`The browser does not allow setting the "${k}" header. Use the proxy transport to send it.`);
      continue;
    }
    try {
      headers.append(k, v);
    } catch {
      warnings.push(`Header "${k}" has an invalid name or value and was skipped.`);
    }
  }

  let body: BodyInit | undefined;
  if (prepared.body?.kind === "text") body = prepared.body.text;
  else if (prepared.body?.kind === "multipart") {
    const fd = new FormData();
    for (const f of prepared.body.fields) {
      if (f.type === "file" && f.file) fd.append(f.key, f.file, f.fileName);
      else fd.append(f.key, f.value);
    }
    body = fd;
  }

  const link = linkSignals(opts.signal, opts.timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(target.toString(), {
      method: prepared.method,
      headers,
      body,
      signal: link.signal,
      redirect: "follow",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      mode: "cors",
    });
    const { bytes, truncated } = await readLimited(response);
    const durationMs = performance.now() - started;
    const contentType = response.headers.get("content-type") ?? "";
    const decoded = decodeBody(bytes, contentType);
    if (truncated) warnings.push(`Response body exceeded ${MAX_RESPONSE_BODY_BYTES / 1024 / 1024} MB and was truncated.`);
    return {
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
      cookies: [],
      cookiesUnavailable: true,
      contentType,
      sizeBytes: bytes.byteLength,
      durationMs,
      timestamp: new Date().toISOString(),
      transport: "direct",
      finalUrl: response.url || target.toString(),
      redirected: response.redirected,
      truncated,
      warnings,
      ...decoded,
    };
  } catch (err) {
    if (err instanceof RequestExecutionError) throw err;
    if (link.signal.aborted) throw abortError(link.didTimeout(), opts.timeoutMs);
    throw new RequestExecutionError({
      kind: "network",
      title: "Could not get a response",
      message:
        "The browser blocked or failed the request. This usually means the server does not allow cross-origin requests (CORS), the host is unreachable, DNS lookup failed, or the TLS certificate is invalid.",
      hint: isLocalHost(target.hostname)
        ? "Make sure your local server is running and sends Access-Control-Allow-Origin for this site."
        : "Browsers only expose responses from servers that send Access-Control-Allow-Origin. Enable CORS on the API, or switch this request to the TraceLab proxy (public hosts only) in the Settings tab.",
    });
  } finally {
    link.cleanup();
  }
}

interface ProxySuccess {
  ok: true;
  status: number;
  statusText: string;
  headers: [string, string][];
  bodyBase64: string;
  durationMs: number;
  finalUrl: string;
  redirected: boolean;
  truncated: boolean;
}
interface ProxyFailure {
  ok: false;
  error: RequestError;
}

async function executeViaProxy(prepared: PreparedRequest, opts: ExecuteOptions): Promise<ExecutedResponse> {
  const warnings = [...prepared.warnings];
  const headers = [...prepared.headers];
  let bodyBase64: string | undefined;

  if (prepared.body?.kind === "text") {
    bodyBase64 = bytesToBase64(new TextEncoder().encode(prepared.body.text));
  } else if (prepared.body?.kind === "multipart") {
    const fd = new FormData();
    for (const f of prepared.body.fields) {
      if (f.type === "file" && f.file) fd.append(f.key, f.file, f.fileName);
      else fd.append(f.key, f.value);
    }
    // Let the platform serialize multipart (including the boundary) for us
    const encoded = new Request("https://serialize.invalid/", { method: "POST", body: fd });
    const ct = encoded.headers.get("content-type");
    if (ct) headers.push(["Content-Type", ct]);
    bodyBase64 = bytesToBase64(new Uint8Array(await encoded.arrayBuffer()));
  }

  const link = linkSignals(opts.signal, opts.timeoutMs + 5_000);
  try {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: prepared.method,
        url: prepared.url,
        headers,
        bodyBase64,
        timeoutMs: opts.timeoutMs,
        followRedirects: opts.followRedirects,
      }),
      signal: link.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
    let payload: ProxySuccess | ProxyFailure;
    try {
      payload = (await res.json()) as ProxySuccess | ProxyFailure;
    } catch {
      throw new RequestExecutionError({
        kind: "proxy_error",
        title: "Proxy unavailable",
        message: `The TraceLab proxy returned an unexpected response (HTTP ${res.status}).`,
      });
    }
    if (!payload.ok) throw new RequestExecutionError(payload.error);

    const bytes = base64ToBytes(payload.bodyBase64);
    const contentType = payload.headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
    const decoded = decodeBody(bytes, contentType);
    const setCookies = payload.headers.filter(([k]) => k.toLowerCase() === "set-cookie").map(([, v]) => v);
    if (payload.truncated) warnings.push(`Response body exceeded the proxy limit and was truncated.`);
    return {
      status: payload.status,
      statusText: payload.statusText,
      headers: payload.headers,
      cookies: parseSetCookie(setCookies),
      contentType,
      sizeBytes: bytes.byteLength,
      durationMs: payload.durationMs,
      timestamp: new Date().toISOString(),
      transport: "proxy",
      finalUrl: payload.finalUrl,
      redirected: payload.redirected,
      truncated: payload.truncated,
      warnings,
      ...decoded,
    };
  } catch (err) {
    if (err instanceof RequestExecutionError) throw err;
    if (link.signal.aborted) throw abortError(link.didTimeout(), opts.timeoutMs);
    throw new RequestExecutionError({
      kind: "proxy_error",
      title: "Proxy unreachable",
      message: "Could not reach the TraceLab proxy. Check your connection and try again.",
    });
  } finally {
    link.cleanup();
  }
}
