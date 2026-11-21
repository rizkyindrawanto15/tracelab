// ─── Core domain types shared by the client, data stores and request engine ───

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface FormDataField extends KeyValue {
  type: "text" | "file";
  /** Only populated in-memory for the current session; files are never persisted. */
  fileName?: string;
}

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: "header" | "query" };
}

export type BodyType = "none" | "json" | "raw" | "urlencoded" | "form-data";
export type RawLanguage = "text" | "xml" | "html" | "javascript";

export interface BodyConfig {
  type: BodyType;
  json: string;
  raw: string;
  rawLanguage: RawLanguage;
  urlencoded: KeyValue[];
  formData: FormDataField[];
}

export type AssertionType =
  | "status_equals"
  | "body_contains"
  | "json_property_exists"
  | "json_property_equals"
  | "response_time_below"
  | "header_exists";

export interface Assertion {
  id: string;
  type: AssertionType;
  /** JSON path or header name depending on type */
  target: string;
  expected: string;
  enabled: boolean;
}

export interface VariableExtraction {
  id: string;
  source: "json" | "header";
  /** JSON path (e.g. data.token) or header name */
  path: string;
  variable: string;
  enabled: boolean;
}

export interface RequestSettings {
  timeoutMs: number;
  followRedirects: boolean;
  transport: "direct" | "proxy";
}

/** The editable configuration of a request (what is saved in a collection). */
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: BodyConfig;
  assertions: Assertion[];
  extractions: VariableExtraction[];
  settings: RequestSettings;
}

// ─── Persisted entities (snake_case mirrors the PostgreSQL schema) ────────────

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: WorkspaceRole;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
}

export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavedRequest {
  id: string;
  workspace_id: string;
  collection_id: string;
  name: string;
  description: string;
  config: RequestConfig;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  secret: boolean;
}

export interface Environment {
  id: string;
  workspace_id: string;
  name: string;
  variables: EnvironmentVariable[];
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  method: HttpMethod;
  url: string;
  status: number | null;
  duration_ms: number | null;
  size_bytes: number | null;
  error: string | null;
  request_name: string | null;
  /** Redacted copy of the request config used to reopen the request. */
  config: RequestConfig;
  created_at: string;
}

export interface ApiDocumentation {
  id: string;
  workspace_id: string;
  request_id: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  description: string;
  headers: KeyValue[];
  params: KeyValue[];
  example_request: string;
  example_response: string;
  created_at: string;
  updated_at: string;
}

// ─── Execution results ────────────────────────────────────────────────────────

export interface ResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface ExecutedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  cookies: ResponseCookie[];
  /** Decoded text body (empty for binary bodies) */
  bodyText: string;
  /** Object URL for previewable binary content such as images */
  blobUrl?: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
  timestamp: string;
  transport: "direct" | "proxy";
  finalUrl: string;
  redirected: boolean;
  cookiesUnavailable?: boolean;
  isBinary?: boolean;
  truncated?: boolean;
  warnings?: string[];
}

export type RequestErrorKind =
  | "invalid_url"
  | "unsupported_protocol"
  | "aborted"
  | "timeout"
  | "network"
  | "mixed_content"
  | "proxy_blocked"
  | "proxy_error"
  | "payload_too_large";

export interface RequestError {
  kind: RequestErrorKind;
  title: string;
  message: string;
  hint?: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  message: string;
  actual?: string;
}
