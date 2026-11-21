"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnchorLink } from "./anchor-link";
import { GET_STARTED_HREF, SECTION_LINKS } from "./links";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
    >
      {!mounted ? <span className="size-4" /> : resolvedTheme === "light" ? <Moon aria-hidden /> : <Sun aria-hidden />}
    </Button>
  );
}

export function Navigation() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const menuId = React.useId();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-200",
        scrolled || open ? "border-border bg-background/80 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map((l) => (
            <li key={l.id}>
              <AnchorLink
                targetId={l.id}
                className="rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </AnchorLink>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <div className="hidden items-center gap-1.5 md:flex">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href={GET_STARTED_HREF}>Get Started</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
      </nav>
      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
          {SECTION_LINKS.map((l) => (
            <li key={l.id}>
              <AnchorLink
                targetId={l.id}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </AnchorLink>
            </li>
          ))}
          <li className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Button asChild variant="secondary" size="lg">
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href={GET_STARTED_HREF} onClick={() => setOpen(false)}>
                Get Started
              </Link>
            </Button>
          </li>
        </ul>
      </div>
    </header>
  );
}
