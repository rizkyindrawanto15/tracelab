"use client";

import * as React from "react";

/** In-page anchor that smooth-scrolls to its target (respecting reduced-motion) and updates the URL hash. */
export const AnchorLink = React.forwardRef<
  HTMLAnchorElement,
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { targetId: string }
>(({ targetId, onClick, children, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${targetId}`);
  };
  return (
    <a ref={ref} href={`#${targetId}`} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});
AnchorLink.displayName = "AnchorLink";
