import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HTTP_METHODS, type RequestError } from "@/lib/types";
import { MAX_REQUEST_BODY_BYTES, MAX_TIMEOUT_MS, MIN_TIMEOUT_MS } from "@/lib/defaults";
import { BlockedHostError, assertPublicHost, safeLookup } from "@/lib/server/ssrf";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Serverless platforms cap response payloads (~4.5 MB on Vercel); base64 adds ~33%. */
const MAX_PROXY_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_PROXY_TIMEOUT_MS = Math.min(MAX_TIMEOUT_MS, 55_000);
const MAX_PAYLOAD_CHARS = Math.ceil(MAX_REQUEST_BODY_BYTES * 1.4) + 256 * 1024;
const MAX_REDIRECTS = 5;

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const payloadSchema = z.object({
  method: z.enum(HTTP_METHODS),
  url: z.string().min(1).max(8192),
  headers: z.array(z.tuple([z.string().max(1024), z.string().max(16 * 1024)])).max(100),
  bodyBase64: z.string().optional(),
  timeoutMs: z.number().int().min(MIN_TIMEOUT_MS).max(MAX_TIMEOUT_MS),
  followRedirects: z.boolean(),
});

// ─── naive in-memory rate limiting (per instance) ─────────────────────────────
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return false;
  }
  b.count += 1;
  return b.count > MAX_PER_WINDOW;
}

function fail(error: RequestError, status = 200) {
  // Errors are returned as JSON so the client can show a precise message.
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

interface UpstreamResult {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: Buffer;
  truncated: boolean;
  location?: string;
}

function decompress(stream: Readable, encoding: string | undefined): Readable {
  switch ((encoding ?? "").trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return stream.pipe(zlib.createGunzip());
    case "deflate":
      return stream.pipe(zlib.createInflate());
    case "br":
      return stream.pipe(zlib.createBrotliDecompress());
    default:
      return stream;
  }
}

function sendOnce(url: URL, method: string, headers: [string, string][], body: Buffer | undefined, signal: AbortSignal): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const outgoing: Record<string, string | string[]> = {};
    for (const [k, v] of headers) {
      const key = k.toLowerCase();
      if (HOP_BY_HOP.has(key)) continue;
      const existing = outgoing[key];
      outgoing[key] = existing === undefined ? v : Array.isArray(existing) ? [...existing, v] : [existing, v];
    }
    if (!outgoing["user-agent"]) outgoing["user-agent"] = "TraceLab/1.0 (+https://tracelab.dev)";
    if (!outgoing["accept"]) outgoing["accept"] = "*/*";
    if (!outgoing["accept-encoding"]) outgoing["accept-encoding"] = "gzip, deflate, br";
    if (body) outgoing["content-length"] = String(body.byteLength);

    const req = lib.request(
      url,
      {
        method,
        headers: outgoing,
        lookup: safeLookup as unknown as typeof import("node:dns").lookup,
        signal,
        // Do not let the proxy talk to the server's own unix sockets etc.
        agent: false,
      },
      (res) => {
        const pairs: [string, string][] = [];
        for (let i = 0; i < res.rawHeaders.length; i += 2) pairs.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        const isRedirect = status >= 300 && status < 400 && Boolean(location);

        const stream = method === "HEAD" ? res : decompress(res, res.headers["content-encoding"] as string | undefined);
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (chunk: Buffer) => {
          if (truncated) return;
          if (size + chunk.byteLength > MAX_PROXY_RESPONSE_BYTES) {
            chunks.push(chunk.subarray(0, MAX_PROXY_RESPONSE_BYTES - size));
            size = MAX_PROXY_RESPONSE_BYTES;
            truncated = true;
            res.destroy();
            finish();
            return;
          }
          chunks.push(chunk);
          size += chunk.byteLength;
        });
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const decoded = res.headers["content-encoding"] && method !== "HEAD";
          resolve({
            status,
            statusText: res.statusMessage ?? "",
            // content-encoding/length no longer describe the decoded body
            headers: decoded ? pairs.filter(([k]) => !["content-encoding", "content-length"].includes(k.toLowerCase())) : pairs,
            body: Buffer.concat(chunks),
            truncated,
            location: isRedirect ? location : undefined,
          });
        };
        stream.on("end", finish);
        stream.on("error", (err) => (truncated ? finish() : reject(err)));
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  if (process.env.TRACELAB_PROXY_ENABLED === "false") {
    return fail({ kind: "proxy_error", title: "Proxy disabled", message: "The TraceLab proxy is disabled on this deployment." }, 403);
  }

  // Require an authenticated user when accounts are enabled.
  let identity = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail({ kind: "proxy_error", title: "Sign in required", message: "Sign in to use the TraceLab proxy." }, 401);
    identity = user.id;
  }
  if (rateLimited(identity)) {
    return fail({ kind: "proxy_error", title: "Too many requests", message: "Proxy rate limit reached. Wait a minute and try again." }, 429);
  }

  const lengthHeader = Number(request.headers.get("content-length") ?? "0");
  if (lengthHeader > MAX_PAYLOAD_CHARS) {
    return fail({ kind: "payload_too_large", title: "Request too large", message: `Proxy requests are limited to ${MAX_REQUEST_BODY_BYTES / 1024 / 1024} MB.` }, 413);
  }
  const raw = await request.text();
  if (raw.length > MAX_PAYLOAD_CHARS) {
    return fail({ kind: "payload_too_large", title: "Request too large", message: `Proxy requests are limited to ${MAX_REQUEST_BODY_BYTES / 1024 / 1024} MB.` }, 413);
  }

  let input: z.infer<typeof payloadSchema>;
  try {
    input = payloadSchema.parse(JSON.parse(raw));
  } catch {
    return fail({ kind: "proxy_error", title: "Invalid proxy request", message: "The request payload could not be validated." }, 400);
  }

  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    return fail({ kind: "invalid_url", title: "Invalid URL", message: "The target URL is not valid." });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail({ kind: "unsupported_protocol", title: "Unsupported protocol", message: "Only http and https are supported." });
  }
  if (url.username || url.password) {
    return fail({ kind: "invalid_url", title: "Credentials in URL", message: "Put credentials in the Authorization tab instead of the URL." });
  }

  const body = input.bodyBase64 ? Buffer.from(input.bodyBase64, "base64") : undefined;
  if (body && body.byteLength > MAX_REQUEST_BODY_BYTES) {
    return fail({ kind: "payload_too_large", title: "Request body too large", message: `The limit is ${MAX_REQUEST_BODY_BYTES / 1024 / 1024} MB.` }, 413);
  }

  const timeoutMs = Math.min(input.timeoutMs, MAX_PROXY_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const started = performance.now();
  let method: string = input.method;
  let headers = input.headers;
  let currentBody = body;
  let current = url;
  let redirected = false;

  try {
    for (let hop = 0; ; hop++) {
      assertPublicHost(current.hostname);
      const result = await sendOnce(current, method, headers, currentBody, controller.signal);
      if (result.location && input.followRedirects && hop < MAX_REDIRECTS) {
        const next = new URL(result.location, current);
        if (next.protocol !== "http:" && next.protocol !== "https:") throw new BlockedHostError("Redirect to an unsupported protocol was blocked.");
        // Never leak credentials to a different origin on redirect.
        if (next.origin !== current.origin) {
          headers = headers.filter(([k]) => !["authorization", "cookie", "proxy-authorization"].includes(k.toLowerCase()));
        }
        if (result.status === 303 || ((result.status === 301 || result.status === 302) && method === "POST")) {
          method = method === "HEAD" ? "HEAD" : "GET";
          currentBody = undefined;
          headers = headers.filter(([k]) => k.toLowerCase() !== "content-type");
        }
        current = next;
        redirected = true;
        continue;
      }
      const durationMs = performance.now() - started;
      return NextResponse.json(
        {
          ok: true,
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          bodyBase64: result.body.toString("base64"),
          durationMs,
          finalUrl: current.toString(),
          redirected,
          truncated: result.truncated,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (err) {
    if (err instanceof BlockedHostError || (err as { code?: string })?.code === "EBLOCKEDHOST") {
      return fail({
        kind: "proxy_blocked",
        title: "Destination blocked by proxy",
        message: "The TraceLab proxy only connects to public internet hosts. Private, loopback, link-local and cloud-metadata addresses are blocked.",
        hint: "For localhost or private-network APIs, switch the transport back to Direct (browser) in the Settings tab.",
      });
    }
    if (controller.signal.aborted) {
      return fail({ kind: "timeout", title: "Request timed out", message: `The upstream server did not respond within ${timeoutMs / 1000}s.` });
    }
    const code = (err as { code?: string })?.code;
    const messages: Record<string, string> = {
      ENOTFOUND: "DNS lookup failed — the host name could not be resolved.",
      ECONNREFUSED: "The server refused the connection.",
      ECONNRESET: "The connection was reset by the server.",
      ETIMEDOUT: "The connection timed out.",
      CERT_HAS_EXPIRED: "The server's TLS certificate has expired.",
      DEPTH_ZERO_SELF_SIGNED_CERT: "The server uses a self-signed TLS certificate.",
      UNABLE_TO_VERIFY_LEAF_SIGNATURE: "The server's TLS certificate could not be verified.",
      ERR_TLS_CERT_ALTNAME_INVALID: "The TLS certificate does not match the host name.",
    };
    return fail({
      kind: "network",
      title: "Upstream request failed",
      message: (code && messages[code]) || "The proxy could not complete the request to the upstream server.",
    });
  } finally {
    clearTimeout(timer);
  }
}

export function GET() {
  return NextResponse.json({ enabled: process.env.TRACELAB_PROXY_ENABLED !== "false" });
}
