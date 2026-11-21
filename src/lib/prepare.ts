import type { FormDataField, HttpMethod, RequestConfig, RequestError } from "./types";
import { MAX_REQUEST_BODY_BYTES, METHODS_WITHOUT_BODY } from "./defaults";
import { ensureProtocol } from "./url";

export type PreparedBody =
  | null
  | { kind: "text"; text: string; contentType?: string }
  | { kind: "multipart"; fields: PreparedFormField[] };

export interface PreparedFormField {
  key: string;
  type: "text" | "file";
  value: string;
  file?: File;
  fileName?: string;
}

export interface PreparedRequest {
  method: HttpMethod;
  url: string;
  headers: [string, string][];
  body: PreparedBody;
  warnings: string[];
}

export class PrepareError extends Error {
  constructor(public readonly detail: RequestError) {
    super(detail.message);
  }
}

const RAW_CONTENT_TYPES: Record<string, string> = {
  text: "text/plain",
  xml: "application/xml",
  html: "text/html",
  javascript: "application/javascript",
};

export function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function hasHeader(headers: [string, string][], name: string) {
  const n = name.toLowerCase();
  return headers.some(([k]) => k.toLowerCase() === n);
}

/**
 * Turn an editable RequestConfig into a concrete request.
 * `resolve` substitutes environment variables (the code generator passes a
 * resolver that keeps secrets as placeholders).
 */
export function prepareRequest(
  config: RequestConfig,
  resolve: (s: string) => string,
  files?: Map<string, File>,
): PreparedRequest {
  const warnings: string[] = [];
  const rawUrl = resolve(config.url).trim();
  if (!rawUrl) {
    throw new PrepareError({ kind: "invalid_url", title: "Enter a request URL", message: "The request URL is empty." });
  }

  let url: URL;
  try {
    url = new URL(ensureProtocol(rawUrl));
  } catch {
    throw new PrepareError({
      kind: "invalid_url",
      title: "Invalid URL",
      message: `"${rawUrl}" is not a valid URL.`,
      hint: rawUrl.includes("{{") ? "The URL contains an unresolved {{variable}}. Select an environment that defines it." : "Use a full URL such as https://api.example.com/users.",
    });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PrepareError({
      kind: "unsupported_protocol",
      title: "Unsupported protocol",
      message: `Only http:// and https:// requests are supported (got ${url.protocol}).`,
    });
  }

  const headers: [string, string][] = [];
  for (const h of config.headers) {
    if (!h.enabled || !h.key.trim()) continue;
    headers.push([resolve(h.key.trim()), resolve(h.value)]);
  }

  // Authorization (explicit headers win over auth helpers)
  const auth = config.auth;
  if (auth.type === "bearer" && auth.bearer?.token) {
    if (!hasHeader(headers, "authorization")) headers.push(["Authorization", `Bearer ${resolve(auth.bearer.token)}`]);
  } else if (auth.type === "basic" && auth.basic && (auth.basic.username || auth.basic.password)) {
    if (!hasHeader(headers, "authorization")) {
      headers.push(["Authorization", `Basic ${base64EncodeUtf8(`${resolve(auth.basic.username)}:${resolve(auth.basic.password)}`)}`]);
    }
  } else if (auth.type === "apikey" && auth.apikey?.key) {
    const key = resolve(auth.apikey.key);
    const value = resolve(auth.apikey.value);
    if (auth.apikey.addTo === "query") url.searchParams.append(key, value);
    else if (!hasHeader(headers, key)) headers.push([key, value]);
  }

  // Body
  let body: PreparedBody = null;
  const allowsBody = !METHODS_WITHOUT_BODY.includes(config.method);
  const b = config.body;
  if (b.type !== "none" && !allowsBody) {
    warnings.push(`${config.method} requests cannot have a body in the browser; the body was not sent.`);
  } else if (b.type === "json") {
    const text = resolve(b.json);
    if (text.trim()) {
      try {
        JSON.parse(text);
      } catch {
        warnings.push("The JSON body is not valid JSON. It was sent as-is.");
      }
      body = { kind: "text", text, contentType: "application/json" };
    }
  } else if (b.type === "raw") {
    body = { kind: "text", text: resolve(b.raw), contentType: RAW_CONTENT_TYPES[b.rawLanguage] ?? "text/plain" };
  } else if (b.type === "urlencoded") {
    const sp = new URLSearchParams();
    for (const f of b.urlencoded) if (f.enabled && f.key.trim()) sp.append(resolve(f.key), resolve(f.value));
    body = { kind: "text", text: sp.toString(), contentType: "application/x-www-form-urlencoded" };
  } else if (b.type === "form-data") {
    const fields: PreparedFormField[] = [];
    for (const f of b.formData as FormDataField[]) {
      if (!f.enabled || !f.key.trim()) continue;
      if (f.type === "file") {
        const file = files?.get(f.id);
        if (!file) {
          warnings.push(`No file selected for form field "${f.key}"; it was skipped.`);
          continue;
        }
        fields.push({ key: resolve(f.key), type: "file", value: "", file, fileName: file.name });
      } else {
        fields.push({ key: resolve(f.key), type: "text", value: resolve(f.value) });
      }
    }
    body = { kind: "multipart", fields };
    // The browser must generate the multipart boundary itself.
    const idx = headers.findIndex(([k]) => k.toLowerCase() === "content-type");
    if (idx >= 0) {
      headers.splice(idx, 1);
      warnings.push("Content-Type was removed so the multipart boundary can be generated automatically.");
    }
  }

  if (body?.kind === "text") {
    if (body.contentType && !hasHeader(headers, "content-type")) headers.push(["Content-Type", body.contentType]);
    const size = new TextEncoder().encode(body.text).length;
    if (size > MAX_REQUEST_BODY_BYTES) {
      throw new PrepareError({
        kind: "payload_too_large",
        title: "Request body too large",
        message: `The body is ${(size / 1024 / 1024).toFixed(2)} MB. The limit is ${MAX_REQUEST_BODY_BYTES / 1024 / 1024} MB.`,
      });
    }
  }

  return { method: config.method, url: url.toString(), headers, body, warnings };
}

/** Headers the browser refuses to let scripts set (they are silently dropped). */
export const FORBIDDEN_BROWSER_HEADERS = new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
  "via",
]);
