"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useData } from "@/components/app/data-provider";
import { useAppStore } from "@/lib/state/app-store";
import { useTabsStore } from "@/lib/state/tabs-store";
import type { ApiDocumentation, Collection, Environment, HistoryEntry, SavedRequest, Workspace, WorkspaceRole } from "@/lib/types";
import type { CollectionInput, DocInput, EnvironmentInput, HistoryInput, RequestInput } from "./store";
import { buildVariableMap } from "../variables";

export const qk = {
  profile: ["profile"] as const,
  workspaces: ["workspaces"] as const,
  members: (ws: string) => ["members", ws] as const,
  collections: (ws: string) => ["collections", ws] as const,
  requests: (ws: string) => ["requests", ws] as const,
  environments: (ws: string) => ["environments", ws] as const,
  history: (ws: string) => ["history", ws] as const,
  docs: (ws: string) => ["docs", ws] as const,
};

function onError(action: string) {
  return (err: unknown) => toast.error(`Could not ${action}`, { description: err instanceof Error ? err.message : String(err) });
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export function useWorkspaces() {
  const { store, user } = useData();
  return useQuery({ queryKey: qk.workspaces, queryFn: () => store.listWorkspaces(), enabled: Boolean(user) });
}

/** Resolves the active workspace, falling back to the first available one. */
export function useActiveWorkspace(): { workspace: Workspace | null; isLoading: boolean; error: unknown } {
  const { data, isLoading, error } = useWorkspaces();
  const workspaceId = useAppStore((s) => s.workspaceId);
  const setWorkspaceId = useAppStore((s) => s.setWorkspaceId);
  const workspace = React.useMemo(() => data?.find((w) => w.id === workspaceId) ?? data?.[0] ?? null, [data, workspaceId]);
  React.useEffect(() => {
    if (workspace && workspace.id !== workspaceId) {
      setWorkspaceId(workspace.id);
    }
  }, [workspace?.id, workspaceId, setWorkspaceId]);
  return { workspace, isLoading, error };
}

export function useWorkspaceId(): string | null {
  return useActiveWorkspace().workspace?.id ?? null;
}

export function useCanEdit(): boolean {
  const { workspace } = useActiveWorkspace();
  return workspace?.role !== "viewer";
}

export function useWorkspaceMutations() {
  const { store } = useData();
  const qc = useQueryClient();
  const setWorkspaceId = useAppStore((s) => s.setWorkspaceId);
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.workspaces });
  return {
    create: useMutation({
      mutationFn: (name: string) => store.createWorkspace(name),
      onSuccess: (ws) => {
        invalidate();
        setWorkspaceId(ws.id);
        toast.success(`Workspace "${ws.name}" created`);
      },
      onError: onError("create workspace"),
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => store.updateWorkspace(id, { name }),
      onSuccess: () => {
        invalidate();
        toast.success("Workspace renamed");
      },
      onError: onError("rename workspace"),
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteWorkspace(id),
      onSuccess: () => {
        setWorkspaceId(null);
        invalidate();
        toast.success("Workspace deleted");
      },
      onError: onError("delete workspace"),
    }),
  };
}

export function useMembers(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.members(ws ?? ""), queryFn: () => store.listMembers(ws!), enabled: Boolean(ws) });
}

export function useMemberMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.members(ws ?? "") });
  return {
    invite: useMutation({
      mutationFn: ({ email, role }: { email: string; role: WorkspaceRole }) => store.inviteMember(ws!, email, role),
      onSuccess: () => {
        invalidate();
        toast.success("Member added");
      },
      onError: onError("add member"),
    }),
    remove: useMutation({
      mutationFn: (userId: string) => store.removeMember(ws!, userId),
      onSuccess: () => {
        invalidate();
        toast.success("Member removed");
      },
      onError: onError("remove member"),
    }),
  };
}

// ─── Collections & requests ──────────────────────────────────────────────────

export function useCollections(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.collections(ws ?? ""), queryFn: () => store.listCollections(ws!), enabled: Boolean(ws) });
}

export function useRequests(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.requests(ws ?? ""), queryFn: () => store.listRequests(ws!), enabled: Boolean(ws) });
}

export function useCollectionMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const detach = useTabsStore((s) => s.detachDeleted);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.collections(ws ?? "") });
    qc.invalidateQueries({ queryKey: qk.requests(ws ?? "") });
  };
  return {
    create: useMutation({
      mutationFn: (input: CollectionInput) => store.createCollection(ws!, input),
      onSuccess: (c) => {
        invalidate();
        toast.success(`Collection "${c.name}" created`);
      },
      onError: onError("create collection"),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CollectionInput> }) => store.updateCollection(id, patch),
      onSuccess: () => invalidate(),
      onError: onError("update collection"),
    }),
    remove: useMutation({
      mutationFn: async (c: Collection) => {
        const requests = qc.getQueryData<SavedRequest[]>(qk.requests(ws ?? "")) ?? [];
        await store.deleteCollection(c.id);
        return requests.filter((r) => r.collection_id === c.id).map((r) => r.id);
      },
      onSuccess: (ids) => {
        if (ws) detach(ws, ids);
        invalidate();
        qc.invalidateQueries({ queryKey: qk.docs(ws ?? "") });
        toast.success("Collection deleted");
      },
      onError: onError("delete collection"),
    }),
  };
}

export function useRequestMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const sync = useTabsStore((s) => s.syncSaved);
  const detach = useTabsStore((s) => s.detachDeleted);
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.requests(ws ?? "") });
  return {
    create: useMutation({
      mutationFn: (input: RequestInput) => store.createRequest(ws!, input),
      onSuccess: () => invalidate(),
      onError: onError("save request"),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<RequestInput> }) => store.updateRequest(id, patch),
      onSuccess: (r) => {
        if (ws) sync(ws, r);
        invalidate();
      },
      onError: onError("update request"),
    }),
    duplicate: useMutation({
      mutationFn: (r: SavedRequest) =>
        store.createRequest(ws!, {
          collection_id: r.collection_id,
          name: `${r.name} copy`,
          description: r.description,
          config: r.config,
          sort_order: r.sort_order + 1,
        }),
      onSuccess: (r) => {
        invalidate();
        toast.success(`Duplicated as "${r.name}"`);
      },
      onError: onError("duplicate request"),
    }),
    remove: useMutation({
      mutationFn: async (r: SavedRequest) => {
        await store.deleteRequest(r.id);
        return r.id;
      },
      onSuccess: (id) => {
        if (ws) detach(ws, [id]);
        invalidate();
        qc.invalidateQueries({ queryKey: qk.docs(ws ?? "") });
        toast.success("Request deleted");
      },
      onError: onError("delete request"),
    }),
  };
}

// ─── Environments ────────────────────────────────────────────────────────────

export function useEnvironments(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.environments(ws ?? ""), queryFn: () => store.listEnvironments(ws!), enabled: Boolean(ws) });
}

const EMPTY_ENVS: Environment[] = [];

export function useActiveEnvironment(): { environment: Environment | null; environments: Environment[]; setActive: (id: string | null) => void } {
  const ws = useWorkspaceId();
  const { data } = useEnvironments(ws);
  const envId = useAppStore((s) => (ws ? s.envByWorkspace[ws] : null));
  const setEnvironment = useAppStore((s) => s.setEnvironment);
  const environments = data ?? EMPTY_ENVS;
  const environment = React.useMemo(() => environments.find((e) => e.id === envId) ?? null, [environments, envId]);
  const setActive = React.useCallback((id: string | null) => {
    if (ws) setEnvironment(ws, id);
  }, [ws, setEnvironment]);
  return { environment, environments, setActive };
}

const EMPTY_VARS: Record<string, { value: string; secret: boolean }> = {};

export function useVariableMap() {
  const { environment } = useActiveEnvironment();
  return React.useMemo(() => {
    if (!environment?.variables || environment.variables.length === 0) return EMPTY_VARS;
    return buildVariableMap(environment.variables);
  }, [environment?.variables]);
}

export function useEnvironmentMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.environments(ws ?? "") });
  return {
    create: useMutation({
      mutationFn: (input: EnvironmentInput) => store.createEnvironment(ws!, input),
      onSuccess: (e) => {
        invalidate();
        toast.success(`Environment "${e.name}" created`);
      },
      onError: onError("create environment"),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<EnvironmentInput> }) => store.updateEnvironment(id, patch),
      onSuccess: (env) => {
        qc.setQueryData<Environment[]>(qk.environments(ws ?? ""), (old) => old?.map((e) => (e.id === env.id ? env : e)));
      },
      onError: onError("update environment"),
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteEnvironment(id),
      onSuccess: () => {
        invalidate();
        toast.success("Environment deleted");
      },
      onError: onError("delete environment"),
    }),
  };
}

// ─── History ─────────────────────────────────────────────────────────────────

export function useHistory(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.history(ws ?? ""), queryFn: () => store.listHistory(ws!), enabled: Boolean(ws) });
}

export function useHistoryMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const key = qk.history(ws ?? "");
  return {
    add: useMutation({
      mutationFn: (input: HistoryInput) => store.addHistory(ws!, input),
      onSuccess: (h) => qc.setQueryData<HistoryEntry[]>(key, (old) => [h, ...(old ?? [])]),
      // History failures should never interrupt the request flow
      onError: () => undefined,
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteHistory(id),
      onSuccess: (_d, id) => qc.setQueryData<HistoryEntry[]>(key, (old) => old?.filter((h) => h.id !== id)),
      onError: onError("delete history entry"),
    }),
    clear: useMutation({
      mutationFn: () => store.clearHistory(ws!),
      onSuccess: () => {
        qc.setQueryData<HistoryEntry[]>(key, []);
        toast.success("History cleared");
      },
      onError: onError("clear history"),
    }),
  };
}

// ─── Documentation ───────────────────────────────────────────────────────────

export function useDocs(ws: string | null) {
  const { store } = useData();
  return useQuery({ queryKey: qk.docs(ws ?? ""), queryFn: () => store.listDocs(ws!), enabled: Boolean(ws) });
}

export function useDocMutations(ws: string | null) {
  const { store } = useData();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.docs(ws ?? "") });
  return {
    create: useMutation({
      mutationFn: (input: DocInput) => store.createDoc(ws!, input),
      onSuccess: () => {
        invalidate();
        toast.success("Endpoint documented");
      },
      onError: onError("create documentation"),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<DocInput> }) => store.updateDoc(id, patch),
      onSuccess: (d: ApiDocumentation) => {
        qc.setQueryData<ApiDocumentation[]>(qk.docs(ws ?? ""), (old) => old?.map((x) => (x.id === d.id ? d : x)));
        toast.success("Documentation saved");
      },
      onError: onError("save documentation"),
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteDoc(id),
      onSuccess: () => {
        invalidate();
        toast.success("Documentation deleted");
      },
      onError: onError("delete documentation"),
    }),
  };
}
