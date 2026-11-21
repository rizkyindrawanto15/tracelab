"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApiDocumentation,
  Collection,
  Environment,
  HistoryEntry,
  Profile,
  SavedRequest,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "../types";
import { normalizeRequestConfig } from "../defaults";
import { getSupabaseBrowserClient } from "../supabase/client";
import {
  HISTORY_LIMIT,
  type CollectionInput,
  type DataStore,
  type DocInput,
  type EnvironmentInput,
  type HistoryInput,
  type RequestInput,
} from "./store";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("Not found or permission denied");
  return res.data;
}

function checkVoid(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}

const mapRequest = (r: SavedRequest): SavedRequest => ({ ...r, config: normalizeRequestConfig(r.config) });
const mapHistory = (h: HistoryEntry): HistoryEntry => ({ ...h, config: normalizeRequestConfig(h.config) });

/**
 * Supabase-backed store. Authorization is enforced by PostgreSQL Row Level
 * Security policies (see supabase/migrations). The client only ever uses the
 * public anon key plus the user's own session JWT.
 */
export class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;

  constructor() {
    this.sb = getSupabaseBrowserClient();
  }

  private async userId(): Promise<string> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) throw new Error("Your session has expired. Please sign in again.");
    return data.user.id;
  }

  async getProfile(): Promise<Profile> {
    const id = await this.userId();
    return check(await this.sb.from("profiles").select("id,email,full_name,avatar_url").eq("id", id).single<Profile>());
  }
  async updateProfile(patch: Partial<Pick<Profile, "full_name">>): Promise<Profile> {
    const id = await this.userId();
    return check(await this.sb.from("profiles").update(patch).eq("id", id).select("id,email,full_name,avatar_url").single<Profile>());
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const id = await this.userId();
    const rows = check(
      await this.sb
        .from("workspace_members")
        .select("role, workspaces(id,name,owner_id,created_at,updated_at)")
        .eq("user_id", id)
        .order("created_at", { ascending: true }),
    ) as unknown as { role: WorkspaceRole; workspaces: Omit<Workspace, "role"> | null }[];
    return rows.filter((r) => r.workspaces).map((r) => ({ ...(r.workspaces as Workspace), role: r.role }));
  }
  async createWorkspace(name: string): Promise<Workspace> {
    // The create_workspace RPC inserts the workspace, the owner membership and
    // default environments atomically.
    const ws = check(await this.sb.rpc("create_workspace", { p_name: name }).single<Workspace>());
    return { ...ws, role: "owner" };
  }
  async updateWorkspace(id: string, patch: { name: string }): Promise<Workspace> {
    return check(await this.sb.from("workspaces").update(patch).eq("id", id).select().single<Workspace>());
  }
  async deleteWorkspace(id: string): Promise<void> {
    const all = await this.listWorkspaces();
    if (all.length <= 1) throw new Error("You need at least one workspace.");
    checkVoid(await this.sb.from("workspaces").delete().eq("id", id));
  }
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = check(
      await this.sb
        .from("workspace_members")
        .select("workspace_id,user_id,role,created_at,profiles(email,full_name)")
        .eq("workspace_id", workspaceId)
        .order("created_at"),
    ) as unknown as (WorkspaceMember & { profiles: { email: string | null; full_name: string | null } | null })[];
    return rows.map(({ profiles, ...m }) => ({ ...m, email: profiles?.email ?? null, full_name: profiles?.full_name ?? null }));
  }
  async inviteMember(workspaceId: string, email: string, role: WorkspaceRole): Promise<void> {
    checkVoid(await this.sb.rpc("add_workspace_member", { p_workspace_id: workspaceId, p_email: email, p_role: role }));
  }
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    checkVoid(await this.sb.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId));
  }

  async listCollections(workspaceId: string): Promise<Collection[]> {
    return check(
      await this.sb.from("collections").select("*").eq("workspace_id", workspaceId).order("sort_order").order("created_at"),
    ) as Collection[];
  }
  async createCollection(workspaceId: string, input: CollectionInput): Promise<Collection> {
    return check(
      await this.sb
        .from("collections")
        .insert({ workspace_id: workspaceId, name: input.name, description: input.description ?? "", sort_order: input.sort_order ?? 0 })
        .select()
        .single<Collection>(),
    );
  }
  async updateCollection(id: string, patch: Partial<CollectionInput>): Promise<Collection> {
    return check(await this.sb.from("collections").update(patch).eq("id", id).select().single<Collection>());
  }
  async deleteCollection(id: string): Promise<void> {
    checkVoid(await this.sb.from("collections").delete().eq("id", id));
  }

  async listRequests(workspaceId: string): Promise<SavedRequest[]> {
    const rows = check(
      await this.sb.from("requests").select("*").eq("workspace_id", workspaceId).order("sort_order").order("created_at"),
    ) as SavedRequest[];
    return rows.map(mapRequest);
  }
  async createRequest(workspaceId: string, input: RequestInput): Promise<SavedRequest> {
    return mapRequest(
      check(
        await this.sb
          .from("requests")
          .insert({
            workspace_id: workspaceId,
            collection_id: input.collection_id,
            name: input.name,
            description: input.description ?? "",
            config: input.config,
            sort_order: input.sort_order ?? 0,
          })
          .select()
          .single<SavedRequest>(),
      ),
    );
  }
  async updateRequest(id: string, patch: Partial<RequestInput>): Promise<SavedRequest> {
    return mapRequest(check(await this.sb.from("requests").update(patch).eq("id", id).select().single<SavedRequest>()));
  }
  async deleteRequest(id: string): Promise<void> {
    checkVoid(await this.sb.from("requests").delete().eq("id", id));
  }

  async listEnvironments(workspaceId: string): Promise<Environment[]> {
    return check(await this.sb.from("environments").select("*").eq("workspace_id", workspaceId).order("created_at")) as Environment[];
  }
  async createEnvironment(workspaceId: string, input: EnvironmentInput): Promise<Environment> {
    return check(await this.sb.from("environments").insert({ workspace_id: workspaceId, ...input }).select().single<Environment>());
  }
  async updateEnvironment(id: string, patch: Partial<EnvironmentInput>): Promise<Environment> {
    return check(await this.sb.from("environments").update(patch).eq("id", id).select().single<Environment>());
  }
  async deleteEnvironment(id: string): Promise<void> {
    checkVoid(await this.sb.from("environments").delete().eq("id", id));
  }

  async listHistory(workspaceId: string, limit = HISTORY_LIMIT): Promise<HistoryEntry[]> {
    const rows = check(
      await this.sb
        .from("request_history")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ) as HistoryEntry[];
    return rows.map(mapHistory);
  }
  async addHistory(workspaceId: string, input: HistoryInput): Promise<HistoryEntry> {
    const userId = await this.userId();
    return mapHistory(
      check(
        await this.sb
          .from("request_history")
          .insert({ workspace_id: workspaceId, user_id: userId, ...input })
          .select()
          .single<HistoryEntry>(),
      ),
    );
  }
  async deleteHistory(id: string): Promise<void> {
    checkVoid(await this.sb.from("request_history").delete().eq("id", id));
  }
  async clearHistory(workspaceId: string): Promise<void> {
    const userId = await this.userId();
    checkVoid(await this.sb.from("request_history").delete().eq("workspace_id", workspaceId).eq("user_id", userId));
  }

  async listDocs(workspaceId: string): Promise<ApiDocumentation[]> {
    return check(await this.sb.from("api_documentations").select("*").eq("workspace_id", workspaceId).order("name")) as ApiDocumentation[];
  }
  async createDoc(workspaceId: string, input: DocInput): Promise<ApiDocumentation> {
    return check(await this.sb.from("api_documentations").insert({ workspace_id: workspaceId, ...input }).select().single<ApiDocumentation>());
  }
  async updateDoc(id: string, patch: Partial<DocInput>): Promise<ApiDocumentation> {
    return check(await this.sb.from("api_documentations").update(patch).eq("id", id).select().single<ApiDocumentation>());
  }
  async deleteDoc(id: string): Promise<void> {
    checkVoid(await this.sb.from("api_documentations").delete().eq("id", id));
  }
}
