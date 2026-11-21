import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/lib/types";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-6 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M8 11h16M16 11v12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23" cy="21" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, href = "/", compact }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="TraceLab home">
      <LogoMark />
      {!compact && <span className="text-[15px]">TraceLab</span>}
    </Link>
  );
}

const METHOD_CLASS: Record<HttpMethod, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
  HEAD: "text-method-head",
  OPTIONS: "text-method-options",
};

export function methodColor(method: HttpMethod | string) {
  return METHOD_CLASS[method as HttpMethod] ?? "text-muted-foreground";
}

export function MethodBadge({ method, className, short }: { method: HttpMethod | string; className?: string; short?: boolean }) {
  const label = short ? ({ DELETE: "DEL", OPTIONS: "OPT", PATCH: "PATCH" } as Record<string, string>)[method] ?? method : method;
  return <span className={cn("font-mono text-[10.5px] font-semibold tracking-tight", methodColor(method), className)}>{label}</span>;
}

export function StatusBadge({ status, statusText, className }: { status: number | null | undefined; statusText?: string; className?: string }) {
  const tone = !status
    ? "bg-destructive/12 text-destructive border-destructive/25"
    : status < 300
      ? "bg-success/12 text-success border-success/25"
      : status < 400
        ? "bg-primary/12 text-primary border-primary/25"
        : status < 500
          ? "bg-warning/12 text-warning border-warning/25"
          : "bg-destructive/12 text-destructive border-destructive/25";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[11px] font-semibold", tone, className)}>
      {status ? status : "ERR"}
      {statusText ? <span className="font-sans font-medium opacity-80">{statusText}</span> : null}
    </span>
  );
}
