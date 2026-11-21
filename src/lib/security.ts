import type { RequestConfig, ResponseCookie } from "./types";
import { VARIABLE_PATTERN } from "./variables";
import { deepClone } from "./utils";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "x-access-token",
]);

export const REDACTED = "[redacted]";

/** A value that is only a {{variable}} reference is safe to keep. */
function isTemplateOnly(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed.replace(VARIABLE_PATTERN, "").replace(/^(Bearer|Basic)\s+/i, "").trim() === "";
}

function redact(value: string): string {
  return isTemplateOnly(value) ? value : REDACTED;
}

/**
 * Remove literal credentials before a request config is written to history.
 * Values that reference environment variables (e.g. {{api_token}}) are kept,
 * because they contain no secret themselves.
 */
export function redactConfigForHistory(config: RequestConfig): RequestConfig {
  const c = deepClone(config);
  if (c.auth.bearer) c.auth.bearer.token = redact(c.auth.bearer.token);
  if (c.auth.basic) c.auth.basic.password = redact(c.auth.basic.password);
  if (c.auth.apikey) c.auth.apikey.value = redact(c.auth.apikey.value);
  c.headers = c.headers.map((h) => (SENSITIVE_HEADERS.has(h.key.trim().toLowerCase()) ? { ...h, value: redact(h.value) } : h));
  // Files can never be persisted
  c.body.formData = c.body.formData.map((f) => (f.type === "file" ? { ...f, value: "", fileName: undefined } : f));
  return c;
}

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADERS.has(name.trim().toLowerCase());
}

/** Parse Set-Cookie header values (as returned by the proxy). */
export function parseSetCookie(values: string[]): ResponseCookie[] {
  return values
    .map((raw) => {
      const parts = raw.split(";").map((p) => p.trim());
      const [nameValue, ...attrs] = parts;
      const eq = nameValue.indexOf("=");
      if (eq <= 0) return null;
      const cookie: ResponseCookie = { name: nameValue.slice(0, eq), value: nameValue.slice(eq + 1) };
      for (const attr of attrs) {
        const [k, ...v] = attr.split("=");
        const key = k.toLowerCase();
        const val = v.join("=");
        if (key === "domain") cookie.domain = val;
        else if (key === "path") cookie.path = val;
        else if (key === "expires") cookie.expires = val;
        else if (key === "max-age") cookie.expires = cookie.expires ?? `max-age=${val}`;
        else if (key === "httponly") cookie.httpOnly = true;
        else if (key === "secure") cookie.secure = true;
        else if (key === "samesite") cookie.sameSite = val;
      }
      return cookie;
    })
    .filter((c): c is ResponseCookie => c !== null);
}
