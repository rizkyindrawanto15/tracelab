"use client";

import * as React from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import type { AuthConfig, AuthType } from "@/lib/types";
import { Input, Label } from "@/components/ui/primitives";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-tabs";
import { VariableInput } from "./variable-input";

const AUTH_LABELS: Record<AuthType, string> = {
  none: "No Auth",
  bearer: "Bearer Token",
  basic: "Basic Auth",
  apikey: "API Key",
};

function SecretField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-8 items-center rounded-md border border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
        <VariableInput id={id} value={value} onChange={onChange} masked={!show && !value.trim().startsWith("{{")} placeholder={placeholder} ariaLabel={label} className="h-full px-2.5 text-[13px]" />
        <button type="button" onClick={() => setShow(!show)} className="px-2 text-muted-foreground hover:text-foreground" aria-label={show ? `Hide ${label}` : `Show ${label}`}>
          {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function TextField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-8 items-center rounded-md border border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
        <VariableInput id={id} value={value} onChange={onChange} placeholder={placeholder} ariaLabel={label} className="h-full px-2.5 text-[13px]" />
      </div>
    </div>
  );
}

export function AuthEditor({ auth, onChange }: { auth: AuthConfig; onChange: (a: AuthConfig) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <Select value={auth.type} onValueChange={(v) => onChange({ ...auth, type: v as AuthType })}>
          <SelectTrigger aria-label="Authorization type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(AUTH_LABELS) as AuthType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {AUTH_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Tip: reference secrets with variables like <code className="font-mono text-foreground/80">{"{{api_token}}"}</code> so they are kept in your environment, not in the request.
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-4">
        {auth.type === "none" && <p className="text-[13px] text-muted-foreground">This request does not use any authorization.</p>}
        {auth.type === "bearer" && (
          <>
            <SecretField id="auth-bearer" label="Token" value={auth.bearer?.token ?? ""} onChange={(token) => onChange({ ...auth, bearer: { token } })} placeholder="{{api_token}}" />
            <p className="text-[11.5px] text-muted-foreground">
              Sent as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>
            </p>
          </>
        )}
        {auth.type === "basic" && (
          <>
            <TextField id="auth-user" label="Username" value={auth.basic?.username ?? ""} onChange={(username) => onChange({ ...auth, basic: { password: auth.basic?.password ?? "", username } })} />
            <SecretField id="auth-pass" label="Password" value={auth.basic?.password ?? ""} onChange={(password) => onChange({ ...auth, basic: { username: auth.basic?.username ?? "", password } })} />
            <p className="text-[11.5px] text-muted-foreground">Encoded as Base64 and sent in the Authorization header.</p>
          </>
        )}
        {auth.type === "apikey" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-key">Key</Label>
              <Input
                id="auth-key"
                value={auth.apikey?.key ?? ""}
                onChange={(e) => onChange({ ...auth, apikey: { value: auth.apikey?.value ?? "", addTo: auth.apikey?.addTo ?? "header", key: e.target.value } })}
                placeholder="X-API-Key"
                className="font-mono"
              />
            </div>
            <SecretField
              id="auth-value"
              label="Value"
              value={auth.apikey?.value ?? ""}
              onChange={(value) => onChange({ ...auth, apikey: { key: auth.apikey?.key ?? "", addTo: auth.apikey?.addTo ?? "header", value } })}
              placeholder="{{api_token}}"
            />
            <div className="flex flex-col gap-1.5">
              <Label>Add to</Label>
              <Select
                value={auth.apikey?.addTo ?? "header"}
                onValueChange={(v) => onChange({ ...auth, apikey: { key: auth.apikey?.key ?? "", value: auth.apikey?.value ?? "", addTo: v as "header" | "query" } })}
              >
                <SelectTrigger aria-label="Add API key to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="query">Query params</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
