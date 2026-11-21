import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { AnchorLink } from "./anchor-link";
import { SECTION_LINKS } from "./links";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="font-mono text-[11px] text-muted-foreground">
            Build. Test. Debug. Ship.
          </p>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-6">
          {SECTION_LINKS.map((link) => (
            <li key={link.id}>
              <AnchorLink targetId={link.id} className="transition-colors hover:text-foreground">
                {link.label}
              </AnchorLink>
            </li>
          ))}
          <li>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign In
            </Link>
          </li>
          <li>
            <Link href="/register" className="transition-colors hover:text-foreground">
              Register
            </Link>
          </li>
        </ul>

        <p className="font-mono text-[11px]">
          &copy; {new Date().getFullYear()} TraceLab. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
