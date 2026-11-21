import { describe, it, expect } from "vitest";
import { splitUrl, parseQuery, buildQuery, urlWithParams } from "../src/lib/url";
import { resolveVariables, findVariables, maskSecret } from "../src/lib/variables";
import { getByPath, parsePath, tryParseJson } from "../src/lib/json-path";
import { evaluateAssertions } from "../src/lib/assertions";
import { redactConfigForHistory } from "../src/lib/security";
import { createRequestConfig } from "../src/lib/defaults";
import { isBlockedAddress } from "../src/lib/server/ssrf";
import { generateCurl, generateFetch } from "../src/lib/codegen";
import { prepareRequest } from "../src/lib/prepare";

describe("URL Utilities", () => {
  it("splits URL correctly preserving query and hash", () => {
    const res = splitUrl("https://api.example.com/v1/users?page=1&limit=20#top");
    expect(res.base).toBe("https://api.example.com/v1/users");
    expect(res.query).toBe("page=1&limit=20");
    expect(res.hash).toBe("#top");
  });

  it("parses and rebuilds query parameters", () => {
    const query = "q=search&tag=api&sort=desc";
    const parsed = parseQuery(query);
    expect(parsed).toEqual([
      { key: "q", value: "search" },
      { key: "tag", value: "api" },
      { key: "sort", value: "desc" },
    ]);
    const rebuilt = buildQuery(
      parsed.map((p, i) => ({ id: String(i), key: p.key, value: p.value, enabled: true })),
    );
    expect(rebuilt).toBe("q=search&tag=api&sort=desc");
  });

  it("updates URL with modified query parameters", () => {
    const original = "https://api.example.com/items?a=1";
    const next = urlWithParams(original, [
      { id: "1", key: "a", value: "2", enabled: true },
      { id: "2", key: "b", value: "test", enabled: true },
      { id: "3", key: "disabled", value: "ignore", enabled: false },
    ]);
    expect(next).toBe("https://api.example.com/items?a=2&b=test");
  });
});

describe("Variable Resolution", () => {
  it("resolves variables correctly", () => {
    const vars = {
      base_url: { value: "https://api.example.com", secret: false },
      user_id: { value: "usr_42", secret: false },
    };
    const resolved = resolveVariables("{{base_url}}/users/{{user_id}}", vars);
    expect(resolved).toBe("https://api.example.com/users/usr_42");
  });

  it("finds variables in string", () => {
    const found = findVariables("{{host}}/v1/{{entity}}?token={{auth_token}}");
    expect(found).toEqual(["host", "entity", "auth_token"]);
  });

  it("masks secrets", () => {
    expect(maskSecret("secret12345")).toBe("•••••••••••");
  });
});

describe("JSON Path and Parsing", () => {
  it("parses path correctly", () => {
    expect(parsePath("data.users[0].name")).toEqual(["data", "users", 0, "name"]);
    expect(parsePath("items[2]['prop']")).toEqual(["items", 2, "prop"]);
  });

  it("gets nested value by path", () => {
    const obj = {
      response: {
        items: [{ id: 101, title: "TraceLab" }],
        meta: { total: 1 },
      },
    };
    expect(getByPath(obj, "response.items[0].title")).toEqual({ found: true, value: "TraceLab" });
    expect(getByPath(obj, "response.meta.total")).toEqual({ found: true, value: 1 });
    expect(getByPath(obj, "nonexistent.field")).toEqual({ found: false, value: undefined });
  });

  it("parses JSON and identifies syntax errors", () => {
    const valid = tryParseJson('{"status": "ok"}');
    expect(valid.ok).toBe(true);
    const invalid = tryParseJson('{"status": "ok",}');
    expect(invalid.ok).toBe(false);
  });
});

describe("Declarative Assertions", () => {
  it("evaluates status_equals, body_contains, and json_property_exists", () => {
    const mockRes = {
      status: 200,
      statusText: "OK",
      headers: [["Content-Type", "application/json"]] as [string, string][],
      cookies: [],
      bodyText: JSON.stringify({ success: true, user: { role: "admin" } }),
      contentType: "application/json",
      sizeBytes: 45,
      durationMs: 75,
      timestamp: new Date().toISOString(),
      transport: "direct" as const,
      finalUrl: "https://api.example.com",
      redirected: false,
    };

    const assertions = [
      { id: "1", type: "status_equals" as const, target: "", expected: "200", enabled: true },
      { id: "2", type: "body_contains" as const, target: "", expected: "admin", enabled: true },
      { id: "3", type: "json_property_exists" as const, target: "user.role", expected: "", enabled: true },
      { id: "4", type: "json_property_equals" as const, target: "user.role", expected: "admin", enabled: true },
      { id: "5", type: "response_time_below" as const, target: "", expected: "100", enabled: true },
      { id: "6", type: "status_equals" as const, target: "", expected: "404", enabled: true },
    ];

    const results = evaluateAssertions(assertions, mockRes);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(true);
    expect(results[2].passed).toBe(true);
    expect(results[3].passed).toBe(true);
    expect(results[4].passed).toBe(true);
    expect(results[5].passed).toBe(false); // Expected 404 got 200
  });
});

describe("Security and Redaction", () => {
  it("redacts credentials before history persistence", () => {
    const config = createRequestConfig({
      method: "POST",
      url: "https://api.example.com/checkout",
      auth: {
        type: "bearer",
        bearer: { token: "secret_live_tok_991823" },
      },
      headers: [
        { id: "1", key: "Authorization", value: "Bearer secret_live_tok_991823", enabled: true },
        { id: "2", key: "X-Custom", value: "public_value", enabled: true },
      ],
    });

    const redacted = redactConfigForHistory(config);
    expect(redacted.auth.bearer?.token).toBe("[redacted]");
    expect(redacted.headers.find((h) => h.key === "Authorization")?.value).toBe("[redacted]");
    expect(redacted.headers.find((h) => h.key === "X-Custom")?.value).toBe("public_value");
  });

  it("identifies private and reserved IP addresses for SSRF protection", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.0.0.1")).toBe(true);
    expect(isBlockedAddress("192.168.1.1")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true); // AWS/GCP cloud metadata
    expect(isBlockedAddress("::1")).toBe(true); // IPv6 loopback
    expect(isBlockedAddress("8.8.8.8")).toBe(false); // Google Public DNS
    expect(isBlockedAddress("1.1.1.1")).toBe(false); // Cloudflare Public DNS
  });
});

describe("Code Generation", () => {
  it("generates authentic cURL and Fetch commands", () => {
    const config = createRequestConfig({
      method: "POST",
      url: "https://api.example.com/v1/posts",
      headers: [
        { id: "1", key: "Content-Type", value: "application/json", enabled: true },
        { id: "2", key: "Accept", value: "application/json", enabled: true },
      ],
      body: {
        type: "json",
        json: '{"title":"Hello"}',
        raw: "",
        rawLanguage: "text",
        urlencoded: [],
        formData: [],
      },
    });

    const prepared = prepareRequest(config, (s) => s);
    const curl = generateCurl(prepared);
    expect(curl).toContain("curl -X POST 'https://api.example.com/v1/posts'");
    expect(curl).toContain("-H 'Content-Type: application/json'");
    expect(curl).toContain("--data-raw '{\"title\":\"Hello\"}'");

    const fetchCode = generateFetch(prepared);
    expect(fetchCode).toContain("fetch(\"https://api.example.com/v1/posts\"");
    expect(fetchCode).toContain('method: "POST"');
  });
});
