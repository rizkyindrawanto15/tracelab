"use client";

import * as React from "react";
import { toast } from "sonner";
import { useActiveEnvironment, useEnvironmentMutations, useHistoryMutations, useVariableMap, useWorkspaceId } from "@/lib/data/hooks";
import { evaluateAssertions } from "@/lib/assertions";
import { executeRequest, RequestExecutionError } from "@/lib/http/execute";
import { getByPath, stringifyValue, tryParseJson } from "@/lib/json-path";
import { PrepareError, prepareRequest } from "@/lib/prepare";
import { redactConfigForHistory } from "@/lib/security";
import { useAppStore } from "@/lib/state/app-store";
import { useRuntimeStore, useTabsStore, type RequestTab } from "@/lib/state/tabs-store";
import type { ExecutedResponse, RequestError } from "@/lib/types";
import { MAX_TIMEOUT_MS, MIN_TIMEOUT_MS, newVariable } from "@/lib/defaults";
import { resolveVariables } from "@/lib/variables";

export function useSendRequest() {
  const ws = useWorkspaceId();
  const vars = useVariableMap();
  const { environment } = useActiveEnvironment();
  const envMutations = useEnvironmentMutations(ws);
  const history = useHistoryMutations(ws);
  const notify = useAppStore((s) => s.notify);

  const applyExtractions = React.useCallback(
    (tab: RequestTab, res: ExecutedResponse) => {
      const rules = tab.config.extractions.filter((x) => x.enabled && x.variable.trim() && x.path.trim());
      if (rules.length === 0) return;
      if (!environment) {
        toast.warning("Variables not extracted", { description: "Select an environment to store extracted variables." });
        return;
      }
      const json = rules.some((r) => r.source === "json") ? tryParseJson(res.bodyText) : null;
      const variables = [...environment.variables];
      const updated: string[] = [];
      for (const rule of rules) {
        let value: string | null = null;
        if (rule.source === "header") {
          value = res.headers.find(([k]) => k.toLowerCase() === rule.path.trim().toLowerCase())?.[1] ?? null;
        } else if (json?.ok) {
          const hit = getByPath(json.value, rule.path);
          if (hit.found) value = stringifyValue(hit.value);
        }
        if (value === null) continue;
        const key = rule.variable.trim();
        const idx = variables.findIndex((v) => v.key === key);
        if (idx >= 0) variables[idx] = { ...variables[idx], value, enabled: true };
        else variables.push(newVariable({ key, value, secret: /token|secret|password|key/i.test(key) }));
        updated.push(key);
      }
      if (updated.length) {
        envMutations.update.mutate({ id: environment.id, patch: { variables } });
        toast.success(`Updated ${updated.length} variable${updated.length > 1 ? "s" : ""}`, { description: updated.map((u) => `{{${u}}}`).join(", ") });
      }
    },
    [environment, envMutations.update],
  );

  return React.useCallback(
    async (tabId: string) => {
      if (!ws) return;
      const tab = useTabsStore.getState().byWorkspace[ws]?.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      const runtime = useRuntimeStore.getState();
      runtime.cancel(tabId);

      const controller = new AbortController();
      runtime.setController(tabId, controller);
      runtime.set(tabId, { status: "loading", startedAt: Date.now(), response: runtime.byTab[tabId]?.response });

      const config = tab.config;
      const files = new Map(Object.entries(useRuntimeStore.getState().files));
      const timeoutMs = Math.min(Math.max(config.settings.timeoutMs || 30_000, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);

      const record = (status: number | null, duration: number | null, size: number | null, error: string | null, url: string) => {
        history.add.mutate({
          method: config.method,
          url,
          status,
          duration_ms: duration,
          size_bytes: size,
          error,
          request_name: tab.requestId ? tab.name : null,
          config: redactConfigForHistory(config),
        });
      };

      try {
        const prepared = prepareRequest(config, (s) => resolveVariables(s, vars), files);
        const response = await executeRequest(prepared, {
          signal: controller.signal,
          timeoutMs,
          transport: config.settings.transport,
          followRedirects: config.settings.followRedirects,
        });
        const results = evaluateAssertions(config.assertions, response);
        useRuntimeStore.getState().set(tabId, { status: "done", response, results });
        // Store the *unresolved* URL so secret variable values never reach history
        record(response.status, response.durationMs, response.sizeBytes, null, config.url);
        applyExtractions(tab, response);
        const failed = results.filter((r) => !r.passed).length;
        if (failed > 0) {
          notify({ kind: "error", title: `${failed} of ${results.length} tests failed`, description: `${config.method} ${tab.name}` });
        }
      } catch (err) {
        const detail: RequestError =
          err instanceof PrepareError || err instanceof RequestExecutionError
            ? err.detail
            : { kind: "network", title: "Unexpected error", message: err instanceof Error ? err.message : String(err) };
        useRuntimeStore.getState().set(tabId, { status: "error", error: detail });
        if (detail.kind !== "aborted" && detail.kind !== "invalid_url") {
          record(null, null, null, detail.title, config.url);
          notify({ kind: "error", title: detail.title, description: `${config.method} ${config.url}`.slice(0, 140) });
        }
      } finally {
        useRuntimeStore.getState().setController(tabId, null);
      }
    },
    [ws, vars, history.add, applyExtractions, notify],
  );
}
