import * as React from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "", className)}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
    </Reveal>
  );
}
