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

export type CollectionInput = Pick<Collection, "name"> & Partial<Pick<Collection, "description" | "sort_order">>;
export type RequestInput = Pick<SavedRequest, "collection_id" | "name" | "config"> & Partial<Pick<SavedRequest, "description" | "sort_order">>;
export type EnvironmentInput = Pick<Environment, "name" | "variables">;
export type HistoryInput = Omit<HistoryEntry, "id" | "workspace_id" | "user_id" | "created_at">;
export type DocInput = Omit<ApiDocumentation, "id" | "workspace_id" | "created_at" | "updated_at">;

/**
 * Persistence boundary. The Supabase implementation relies on Row Level
 * Security for authorization; the Local implementation keeps everything in
 * the browser for unauthenticated "Local mode".
 */
export interface DataStore {
  readonly mode: "supabase" | "local";

  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Pick<Profile, "full_name">>): Promise<Profile>;

  listWorkspaces(): Promise<Workspace[]>;
  createWorkspace(name: string): Promise<Workspace>;
  updateWorkspace(id: string, patch: { name: string }): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  listMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  inviteMember(workspaceId: string, email: string, role: WorkspaceRole): Promise<void>;
  removeMember(workspaceId: string, userId: string): Promise<void>;

  listCollections(workspaceId: string): Promise<Collection[]>;
  createCollection(workspaceId: string, input: CollectionInput): Promise<Collection>;
  updateCollection(id: string, patch: Partial<CollectionInput>): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;

  listRequests(workspaceId: string): Promise<SavedRequest[]>;
  createRequest(workspaceId: string, input: RequestInput): Promise<SavedRequest>;
  updateRequest(id: string, patch: Partial<RequestInput>): Promise<SavedRequest>;
  deleteRequest(id: string): Promise<void>;

  listEnvironments(workspaceId: string): Promise<Environment[]>;
  createEnvironment(workspaceId: string, input: EnvironmentInput): Promise<Environment>;
  updateEnvironment(id: string, patch: Partial<EnvironmentInput>): Promise<Environment>;
  deleteEnvironment(id: string): Promise<void>;

  listHistory(workspaceId: string, limit?: number): Promise<HistoryEntry[]>;
  addHistory(workspaceId: string, input: HistoryInput): Promise<HistoryEntry>;
  deleteHistory(id: string): Promise<void>;
  clearHistory(workspaceId: string): Promise<void>;

  listDocs(workspaceId: string): Promise<ApiDocumentation[]>;
  createDoc(workspaceId: string, input: DocInput): Promise<ApiDocumentation>;
  updateDoc(id: string, patch: Partial<DocInput>): Promise<ApiDocumentation>;
  deleteDoc(id: string): Promise<void>;
}

export const HISTORY_LIMIT = 300;
