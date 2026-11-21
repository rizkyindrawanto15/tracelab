import type { Assertion, AssertionResult, AssertionType, ExecutedResponse } from "./types";
import { getByPath, stringifyValue, tryParseJson } from "./json-path";

export const ASSERTION_LABELS: Record<AssertionType, string> = {
  status_equals: "Status code equals",
  body_contains: "Body contains",
  json_property_exists: "JSON property exists",
  json_property_equals: "JSON property equals",
  response_time_below: "Response time below (ms)",
  header_exists: "Header exists",
};

export const ASSERTION_NEEDS_TARGET: Record<AssertionType, boolean> = {
  status_equals: false,
  body_contains: false,
  json_property_exists: true,
  json_property_equals: true,
  response_time_below: false,
  header_exists: true,
};

export const ASSERTION_NEEDS_EXPECTED: Record<AssertionType, boolean> = {
  status_equals: true,
  body_contains: true,
  json_property_exists: false,
  json_property_equals: true,
  response_time_below: true,
  header_exists: false,
};

/**
 * Declarative assertions only — no user JavaScript is ever evaluated.
 * This keeps "scripts" safe: they cannot access the app, storage, or network.
 */
export function evaluateAssertions(assertions: Assertion[], res: ExecutedResponse): AssertionResult[] {
  let parsed: { ok: boolean; value?: unknown } | null = null;
  const json = () => {
    if (!parsed) parsed = tryParseJson(res.bodyText);
    return parsed;
  };

  return assertions
    .filter((a) => a.enabled)
    .map((a): AssertionResult => {
      switch (a.type) {
        case "status_equals": {
          const expected = Number(a.expected.trim());
          if (!Number.isFinite(expected)) return { assertion: a, passed: false, message: `"${a.expected}" is not a valid status code` };
          const passed = res.status === expected;
          return { assertion: a, passed, actual: String(res.status), message: passed ? `Status is ${expected}` : `Expected status ${expected}, got ${res.status}` };
        }
        case "body_contains": {
          if (!a.expected) return { assertion: a, passed: false, message: "Expected value is empty" };
          const passed = res.bodyText.includes(a.expected);
          return { assertion: a, passed, message: passed ? `Body contains "${truncate(a.expected)}"` : `Body does not contain "${truncate(a.expected)}"` };
        }
        case "json_property_exists": {
          const j = json();
          if (!j.ok) return { assertion: a, passed: false, message: "Response body is not valid JSON" };
          const { found } = getByPath(j.value, a.target);
          return { assertion: a, passed: found, message: found ? `Property "${a.target}" exists` : `Property "${a.target}" not found` };
        }
        case "json_property_equals": {
          const j = json();
          if (!j.ok) return { assertion: a, passed: false, message: "Response body is not valid JSON" };
          const { found, value } = getByPath(j.value, a.target);
          if (!found) return { assertion: a, passed: false, message: `Property "${a.target}" not found` };
          const actual = stringifyValue(value);
          const passed = actual === a.expected || stringifyValue(safeParse(a.expected)) === actual;
          return { assertion: a, passed, actual, message: passed ? `"${a.target}" equals ${truncate(a.expected)}` : `Expected "${a.target}" to equal ${truncate(a.expected)}, got ${truncate(actual)}` };
        }
        case "response_time_below": {
          const limit = Number(a.expected.trim());
          if (!Number.isFinite(limit) || limit <= 0) return { assertion: a, passed: false, message: `"${a.expected}" is not a valid threshold` };
          const passed = res.durationMs < limit;
          return { assertion: a, passed, actual: `${Math.round(res.durationMs)} ms`, message: passed ? `Responded in ${Math.round(res.durationMs)} ms (< ${limit} ms)` : `Took ${Math.round(res.durationMs)} ms, expected < ${limit} ms` };
        }
        case "header_exists": {
          const name = a.target.trim().toLowerCase();
          const passed = res.headers.some(([k]) => k.toLowerCase() === name);
          return { assertion: a, passed, message: passed ? `Header "${a.target}" present` : `Header "${a.target}" missing` };
        }
        default:
          return { assertion: a, passed: false, message: "Unknown assertion" };
      }
    });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function truncate(s: string, n = 60) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
