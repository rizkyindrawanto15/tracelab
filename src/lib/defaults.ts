import type {
  Assertion,
  AuthConfig,
  BodyConfig,
  EnvironmentVariable,
  FormDataField,
  HttpMethod,
  KeyValue,
  RequestConfig,
  VariableExtraction,
} from "./types";
import { uid } from "./utils";

export const DEFAULT_TIMEOUT_MS = 30_000;
export const MIN_TIMEOUT_MS = 1_000;
export const MAX_TIMEOUT_MS = 120_000;
/** Max request body we will send (client & proxy). */
export const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;
/** Max response body we will read and render. */
export const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024;

export function emptyKV(partial: Partial<KeyValue> = {}): KeyValue {
  return { id: uid(), key: "", value: "", enabled: true, description: "", ...partial };
}

export function emptyFormField(partial: Partial<FormDataField> = {}): FormDataField {
  return { id: uid(), key: "", value: "", enabled: true, type: "text", ...partial };
}

export function defaultAuth(): AuthConfig {
  return {
    type: "none",
    bearer: { token: "" },
    basic: { username: "", password: "" },
    apikey: { key: "X-API-Key", value: "", addTo: "header" },
  };
}

export function defaultBody(): BodyConfig {
  return {
    type: "none",
    json: "{\n  \n}",
    raw: "",
    rawLanguage: "text",
    urlencoded: [],
    formData: [],
  };
}

export function createRequestConfig(partial: Partial<RequestConfig> = {}): RequestConfig {
  return {
    method: "GET",
    url: "",
    params: [],
    headers: [],
    auth: defaultAuth(),
    body: defaultBody(),
    assertions: [],
    extractions: [],
    settings: { timeoutMs: DEFAULT_TIMEOUT_MS, followRedirects: true, transport: "direct" },
    ...partial,
  };
}

/** Make sure configs coming from storage (possibly older shapes) are complete. */
export function normalizeRequestConfig(input: Partial<RequestConfig> | null | undefined): RequestConfig {
  const base = createRequestConfig();
  if (!input) return base;
  return {
    ...base,
    ...input,
    method: (input.method ?? base.method) as HttpMethod,
    params: Array.isArray(input.params) ? input.params : [],
    headers: Array.isArray(input.headers) ? input.headers : [],
    auth: { ...base.auth, ...(input.auth ?? {}) },
    body: { ...base.body, ...(input.body ?? {}) },
    assertions: Array.isArray(input.assertions) ? input.assertions : [],
    extractions: Array.isArray(input.extractions) ? input.extractions : [],
    settings: { ...base.settings, ...(input.settings ?? {}) },
  };
}

export function newAssertion(partial: Partial<Assertion> = {}): Assertion {
  return { id: uid(), type: "status_equals", target: "", expected: "200", enabled: true, ...partial };
}

export function newExtraction(partial: Partial<VariableExtraction> = {}): VariableExtraction {
  return { id: uid(), source: "json", path: "", variable: "", enabled: true, ...partial };
}

export function newVariable(partial: Partial<EnvironmentVariable> = {}): EnvironmentVariable {
  return { id: uid(), key: "", value: "", enabled: true, secret: false, ...partial };
}

export const DEFAULT_ENVIRONMENTS: { name: string; variables: Omit<EnvironmentVariable, "id">[] }[] = [
  {
    name: "Local",
    variables: [
      { key: "base_url", value: "http://localhost:3000", enabled: true, secret: false },
      { key: "api_token", value: "", enabled: true, secret: true },
    ],
  },
  {
    name: "Development",
    variables: [
      { key: "base_url", value: "https://jsonplaceholder.typicode.com", enabled: true, secret: false },
      { key: "api_token", value: "", enabled: true, secret: true },
      { key: "user_id", value: "1", enabled: true, secret: false },
    ],
  },
  {
    name: "Staging",
    variables: [
      { key: "base_url", value: "https://staging.api.example.com", enabled: true, secret: false },
      { key: "api_token", value: "", enabled: true, secret: true },
    ],
  },
  {
    name: "Production",
    variables: [
      { key: "base_url", value: "https://api.example.com", enabled: true, secret: false },
      { key: "api_token", value: "", enabled: true, secret: true },
    ],
  },
];

export const METHODS_WITHOUT_BODY: HttpMethod[] = ["GET", "HEAD"];

export const COMMON_HEADERS = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "If-Match",
  "If-None-Match",
  "Idempotency-Key",
  "X-API-Key",
  "X-Request-ID",
];
