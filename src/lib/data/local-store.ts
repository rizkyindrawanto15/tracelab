"use client";

import type {
  ApiDocumentation,
  Collection,
  Environment,
  HistoryEntry,
  Profile,
  SavedRequest,
  Workspace,
  WorkspaceMember,
} from "../types";
import { DEFAULT_ENVIRONMENTS, createRequestConfig, normalizeRequestConfig } from "../defaults";
import { uid } from "../utils";
import { HISTORY_LIMIT, type DataStore } from "./store";

const KEY = "tracelab.local.v1";
const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

interface LocalDb {
  profile: Profile;
  workspaces: Workspace[];
  collections: Collection[];
  requests: SavedRequest[];
  environments: Environment[];
  history: HistoryEntry[];
  docs: ApiDocumentation[];
}

const now = () => new Date().toISOString();

function seed(): LocalDb {
  const ws: Workspace = { id: uid(), name: "My Workspace", owner_id: LOCAL_USER_ID, created_at: now(), updated_at: now(), role: "owner" };
  const col: Collection = {
    id: uid(),
    workspace_id: ws.id,
    name: "Getting Started",
    description: "Example requests against public, CORS-enabled APIs.",
    sort_order: 0,
    created_at: now(),
    updated_at: now(),
  };
  const req = (name: string, sort: number, config: Parameters<typeof createRequestConfig>[0], description = ""): SavedRequest => ({
    id: uid(),
    workspace_id: ws.id,
    collection_id: col.id,
    name,
    description,
    config: createRequestConfig(config),
    sort_order: sort,
    created_at: now(),
    updated_at: now(),
  });
  return {
    profile: { id: LOCAL_USER_ID, email: null, full_name: "Local User", avatar_url: null },
    workspaces: [ws],
    collections: [col],
    requests: [
      req("List posts", 0, { method: "GET", url: "{{base_url}}/posts?_limit=5", params: [] }, "Fetch the first five posts."),
      req(
        "Get user",
        1,
        {
          method: "GET",
          url: "{{base_url}}/users/{{user_id}}",
          assertions: [
            { id: uid(), type: "status_equals", target: "", expected: "200", enabled: true },
            { id: uid(), type: "json_property_exists", target: "address.city", expected: "", enabled: true },
            { id: uid(), type: "response_time_below", target: "", expected: "2000", enabled: true },
          ],
        },
        "Fetch a single user by id, with assertions.",
      ),
      req(
        "Create post",
        2,
        {
          method: "POST",
          url: "{{base_url}}/posts",
          body: {
            type: "json",
            json: JSON.stringify({ title: "Hello from TraceLab", body: "Build. Test. Debug. Ship.", userId: 1 }, null, 2),
            raw: "",
            rawLanguage: "text",
            urlencoded: [],
            formData: [],
          },
          assertions: [{ id: uid(), type: "status_equals", target: "", expected: "201", enabled: true }],
        },
        "Create a post with a JSON body.",
      ),
    ],
    environments: DEFAULT_ENVIRONMENTS.map((e) => ({
      id: uid(),
      workspace_id: ws.id,
      name: e.name,
      variables: e.variables.map((v) => ({ ...v, id: uid() })),
      created_at: now(),
      updated_at: now(),
    })),
    history: [],
    docs: [],
  };
}

function normalize(db: LocalDb): LocalDb {
  db.requests = db.requests.map((r) => ({ ...r, config: normalizeRequestConfig(r.config) }));
  db.history = db.history.map((h) => ({ ...h, config: normalizeRequestConfig(h.config) }));
  return db;
}

function load(): LocalDb {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw) as LocalDb);
  } catch {
    // corrupted storage — fall through to a fresh seed
  }
  const db = seed();
  save(db);
  return db;
}

function save(db: LocalDb) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    throw new Error(e instanceof Error && e.name === "QuotaExceededError" ? "Browser storage is full. Clear history to free space." : "Could not write to browser storage.");
  }
}

function notFound(what: string): never {
  throw new Error(`${what} not found`);
}

export class LocalStore implements DataStore {
  readonly mode = "local" as const;

  private tx<T>(fn: (db: LocalDb) => T): Promise<T> {
    const db = load();
    const result = fn(db);
    save(db);
    return Promise.resolve(structuredClone(result));
  }

  private read<T>(fn: (db: LocalDb) => T): Promise<T> {
    return Promise.resolve(structuredClone(fn(load())));
  }

  getProfile() {
    return this.read((db) => db.profile);
  }
  updateProfile(patch: Partial<Pick<Profile, "full_name">>) {
    return this.tx((db) => {
      db.profile = { ...db.profile, ...patch };
      return db.profile;
    });
  }

  listWorkspaces() {
    return this.read((db) => db.workspaces.map((w) => ({ ...w, role: "owner" as const })));
  }
  createWorkspace(name: string) {
    return this.tx((db) => {
      const ws: Workspace = { id: uid(), name, owner_id: LOCAL_USER_ID, created_at: now(), updated_at: now(), role: "owner" };
      db.workspaces.push(ws);
      for (const e of DEFAULT_ENVIRONMENTS) {
        db.environments.push({
          id: uid(),
          workspace_id: ws.id,
          name: e.name,
          variables: e.variables.map((v) => ({ ...v, id: uid() })),
          created_at: now(),
          updated_at: now(),
        });
      }
      return ws;
    });
  }
  updateWorkspace(id: string, patch: { name: string }) {
    return this.tx((db) => {
      const ws = db.workspaces.find((w) => w.id === id) ?? notFound("Workspace");
      Object.assign(ws, patch, { updated_at: now() });
      return ws;
    });
  }
  deleteWorkspace(id: string) {
    return this.tx((db) => {
      if (db.workspaces.length <= 1) throw new Error("You need at least one workspace.");
      db.workspaces = db.workspaces.filter((w) => w.id !== id);
      db.collections = db.collections.filter((c) => c.workspace_id !== id);
      db.requests = db.requests.filter((r) => r.workspace_id !== id);
      db.environments = db.environments.filter((e) => e.workspace_id !== id);
      db.history = db.history.filter((h) => h.workspace_id !== id);
      db.docs = db.docs.filter((d) => d.workspace_id !== id);
    });
  }
  listMembers(workspaceId: string) {
    return this.read((db): WorkspaceMember[] => [
      { workspace_id: workspaceId, user_id: db.profile.id, role: "owner", created_at: now(), email: db.profile.email, full_name: db.profile.full_name },
    ]);
  }
  inviteMember(): Promise<void> {
    return Promise.reject(new Error("Inviting members requires a Supabase-backed account."));
  }
  removeMember(): Promise<void> {
    return Promise.reject(new Error("Members are not available in Local mode."));
  }

  listCollections(workspaceId: string) {
    return this.read((db) => db.collections.filter((c) => c.workspace_id === workspaceId).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)));
  }
  createCollection(workspaceId: string, input: { name: string; description?: string; sort_order?: number }) {
    return this.tx((db) => {
      const c: Collection = {
        id: uid(),
        workspace_id: workspaceId,
        name: input.name,
        description: input.description ?? "",
        sort_order: input.sort_order ?? db.collections.filter((x) => x.workspace_id === workspaceId).length,
        created_at: now(),
        updated_at: now(),
      };
      db.collections.push(c);
      return c;
    });
  }
  updateCollection(id: string, patch: Partial<Pick<Collection, "name" | "description" | "sort_order">>) {
    return this.tx((db) => {
      const c = db.collections.find((x) => x.id === id) ?? notFound("Collection");
      Object.assign(c, patch, { updated_at: now() });
      return c;
    });
  }
  deleteCollection(id: string) {
    return this.tx((db) => {
      const removed = new Set(db.requests.filter((r) => r.collection_id === id).map((r) => r.id));
      db.collections = db.collections.filter((c) => c.id !== id);
      db.requests = db.requests.filter((r) => r.collection_id !== id);
      db.docs = db.docs.map((d) => (d.request_id && removed.has(d.request_id) ? { ...d, request_id: null } : d));
    });
  }

  listRequests(workspaceId: string) {
    return this.read((db) => db.requests.filter((r) => r.workspace_id === workspaceId).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)));
  }
  createRequest(workspaceId: string, input: Pick<SavedRequest, "collection_id" | "name" | "config"> & Partial<Pick<SavedRequest, "description" | "sort_order">>) {
    return this.tx((db) => {
      if (!db.collections.some((c) => c.id === input.collection_id && c.workspace_id === workspaceId)) notFound("Collection");
      const r: SavedRequest = {
        id: uid(),
        workspace_id: workspaceId,
        collection_id: input.collection_id,
        name: input.name,
        description: input.description ?? "",
        config: input.config,
        sort_order: input.sort_order ?? db.requests.filter((x) => x.collection_id === input.collection_id).length,
        created_at: now(),
        updated_at: now(),
      };
      db.requests.push(r);
      return r;
    });
  }
  updateRequest(id: string, patch: Partial<Pick<SavedRequest, "collection_id" | "name" | "config" | "description" | "sort_order">>) {
    return this.tx((db) => {
      const r = db.requests.find((x) => x.id === id) ?? notFound("Request");
      Object.assign(r, patch, { updated_at: now() });
      return r;
    });
  }
  deleteRequest(id: string) {
    return this.tx((db) => {
      db.requests = db.requests.filter((r) => r.id !== id);
      db.docs = db.docs.map((d) => (d.request_id === id ? { ...d, request_id: null } : d));
    });
  }

  listEnvironments(workspaceId: string) {
    return this.read((db) => db.environments.filter((e) => e.workspace_id === workspaceId).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }
  createEnvironment(workspaceId: string, input: Pick<Environment, "name" | "variables">) {
    return this.tx((db) => {
      const e: Environment = { id: uid(), workspace_id: workspaceId, ...input, created_at: now(), updated_at: now() };
      db.environments.push(e);
      return e;
    });
  }
  updateEnvironment(id: string, patch: Partial<Pick<Environment, "name" | "variables">>) {
    return this.tx((db) => {
      const e = db.environments.find((x) => x.id === id) ?? notFound("Environment");
      Object.assign(e, patch, { updated_at: now() });
      return e;
    });
  }
  deleteEnvironment(id: string) {
    return this.tx((db) => {
      db.environments = db.environments.filter((e) => e.id !== id);
    });
  }

  listHistory(workspaceId: string, limit = HISTORY_LIMIT) {
    return this.read((db) =>
      db.history
        .filter((h) => h.workspace_id === workspaceId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit),
    );
  }
  addHistory(workspaceId: string, input: Omit<HistoryEntry, "id" | "workspace_id" | "user_id" | "created_at">) {
    return this.tx((db) => {
      const h: HistoryEntry = { id: uid(), workspace_id: workspaceId, user_id: LOCAL_USER_ID, created_at: now(), ...input };
      db.history.unshift(h);
      const forWs = db.history.filter((x) => x.workspace_id === workspaceId);
      if (forWs.length > HISTORY_LIMIT) {
        const drop = new Set(forWs.slice(HISTORY_LIMIT).map((x) => x.id));
        db.history = db.history.filter((x) => !drop.has(x.id));
      }
      return h;
    });
  }
  deleteHistory(id: string) {
    return this.tx((db) => {
      db.history = db.history.filter((h) => h.id !== id);
    });
  }
  clearHistory(workspaceId: string) {
    return this.tx((db) => {
      db.history = db.history.filter((h) => h.workspace_id !== workspaceId);
    });
  }

  listDocs(workspaceId: string) {
    return this.read((db) => db.docs.filter((d) => d.workspace_id === workspaceId).sort((a, b) => a.name.localeCompare(b.name)));
  }
  createDoc(workspaceId: string, input: Omit<ApiDocumentation, "id" | "workspace_id" | "created_at" | "updated_at">) {
    return this.tx((db) => {
      const d: ApiDocumentation = { id: uid(), workspace_id: workspaceId, ...input, created_at: now(), updated_at: now() };
      db.docs.push(d);
      return d;
    });
  }
  updateDoc(id: string, patch: Partial<Omit<ApiDocumentation, "id" | "workspace_id" | "created_at" | "updated_at">>) {
    return this.tx((db) => {
      const d = db.docs.find((x) => x.id === id) ?? notFound("Documentation");
      Object.assign(d, patch, { updated_at: now() });
      return d;
    });
  }
  deleteDoc(id: string) {
    return this.tx((db) => {
      db.docs = db.docs.filter((d) => d.id !== id);
    });
  }
}
